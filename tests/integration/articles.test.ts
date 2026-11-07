import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { appUrl, pool, resetDatabase, restartApp, startApp, stopApp } from './helpers'

const writerUrl = `${appUrl}/api/writer/articles`
const input = { title: '  Finding inspiration  ', slug: ' Finding-Inspiration ' }

function createDraft(body: unknown = input) {
  return fetch(writerUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

beforeAll(startApp)
beforeEach(resetDatabase)
afterAll(async () => { await stopApp(); await resetDatabase(); await pool.end() })

describe('create a draft through HTTP', () => {
  it.each([{}, { body: null, tags: null }])('creates the exact writer projection with defaults (case %#)', async (optional) => {
    const response = await createDraft({ ...input, ...optional })
    expect(response.status).toBe(201)
    const article = await response.json()
    expect(article).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
      slug: 'finding-inspiration', status: 'draft', revision: 0,
      draft: { title: input.title, body: '', tags: [] },
      publishedAt: null, currentPublishedVersionId: null,
    })
    const { rows } = await pool.query('SELECT * FROM articles WHERE id = $1', [article.id])
    expect(rows[0]).toMatchObject({ slug: article.slug, draft_title: input.title, revision: 0, next_version_number: 1, status: 'draft', published_at: null, current_published_version_id: null })
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })

  it('preserves title/body and normalizes tag order in storage', async () => {
    const response = await createDraft({ ...input, body: '  # Words\n', tags: [' Ideas ', '', 'life', 'IDEAS'] })
    expect(response.status).toBe(201)
    const article = await response.json()
    expect(article.draft).toEqual({ title: input.title, body: '  # Words\n', tags: ['ideas', 'life'] })
    expect((await pool.query('SELECT draft_body, draft_tags FROM articles')).rows[0])
      .toEqual({ draft_body: '  # Words\n', draft_tags: ['ideas', 'life'] })
  })

  it.each([null, [], { title: ' ' }, { title: 1 }, { slug: 'two words' }, { body: false }, { tags: [1] }, { tags: ['a b'] }, { extra: true }])(
    'rejects invalid JSON values without creating rows (case %#)', async (fields) => {
      const body = fields && !Array.isArray(fields) ? { ...input, ...fields } : fields
      const response = await createDraft(body)
      expect(response.status).toBe(400)
      expect((await response.json()).data.code).toBe('VALIDATION_ERROR')
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual([])
    },
  )

  it('rejects malformed JSON with validation feedback', async () => {
    const response = await fetch(writerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"title":' })
    expect(response.status).toBe(400)
    expect((await response.json()).data.code).toBe('VALIDATION_ERROR')
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual([])
  })

  it('reports field errors and rejects a normalized slug collision without changing the first draft', async () => {
    const invalid = await createDraft({ ...input, title: '' })
    expect((await invalid.json()).data.fieldErrors.title).toBeInstanceOf(Array)
    const first = await (await createDraft()).json()
    const before = (await pool.query('SELECT * FROM articles')).rows
    const collision = await createDraft({ title: 'Other', slug: 'FINDING-INSPIRATION' })
    expect(collision.status).toBe(409)
    expect((await collision.json()).data.code).toBe('SLUG_CONFLICT')
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect(first.slug).toBe('finding-inspiration')
  })

  it('lets the unique constraint resolve competing creates with the same normalized slug', async () => {
    const responses = await Promise.all([createDraft(), createDraft({ ...input, slug: 'finding-inspiration' })])
    expect(responses.map(r => r.status).sort()).toEqual([201, 409])
    expect((await pool.query('SELECT * FROM articles')).rows).toHaveLength(1)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })

  it('keeps unexpected database failures generic in the production response', async () => {
    await pool.query(`CREATE FUNCTION fail_test_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'private database detail'; END; $$;
      CREATE TRIGGER fail_test_insert BEFORE INSERT ON articles FOR EACH ROW EXECUTE FUNCTION fail_test_insert()`)
    try {
      const response = await createDraft()
      expect(response.status).toBe(500)
      const text = await response.text()
      expect(text).not.toMatch(/private database detail|INSERT INTO|articles_slug_unique|stack/i)
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual([])
    }
    finally {
      await pool.query('DROP TRIGGER fail_test_insert ON articles; DROP FUNCTION fail_test_insert()')
    }
  })
})

describe('list and open saved drafts', () => {
  it('returns an empty list', async () => {
    const response = await fetch(writerUrl)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
  })

  it('projects saved draft summaries and detail without changing rows or audit fields', async () => {
    const article = await (await createDraft()).json()
    const before = (await pool.query('SELECT * FROM articles')).rows
    const list = await fetch(writerUrl)
    expect(list.status).toBe(200)
    expect(await list.json()).toEqual([{ id: article.id, slug: article.slug, title: input.title, status: 'draft' }])
    const detail = await fetch(`${writerUrl}/${article.id}`)
    expect(detail.status).toBe(200)
    expect(await detail.json()).toEqual(article)
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
  })

  it.each(['draft', 'published', 'unpublished'])('uses draft title for the %s writer summary', async (status) => {
    const article = await (await createDraft()).json()
    const versionId = randomUUID()
    await pool.query('INSERT INTO article_versions (id, article_id, version_number, title, body, tags) VALUES ($1,$2,1,$3,$4,$5)', [versionId, article.id, 'Live title', 'Live body', ['live']])
    await pool.query('UPDATE articles SET status=$1, current_published_version_id=$2, published_at=$3 WHERE id=$4', [status, versionId, new Date('2026-11-07T12:00:00Z'), article.id])
    const rows = await (await fetch(writerUrl)).json()
    expect(rows).toEqual([{ id: article.id, slug: article.slug, title: input.title, status }])
    const detail = await (await fetch(`${writerUrl}/${article.id}`)).json()
    expect(detail).toEqual({ ...article, status, currentPublishedVersionId: versionId, publishedAt: '2026-11-07T12:00:00.000Z' })
  })

  it.each(['not-a-uuid', '1', '11111111-1111-1111-1111-11111111111z'])('rejects malformed article ID %s', async (id) => {
    const response = await fetch(`${writerUrl}/${id}`)
    expect(response.status).toBe(400)
    expect((await response.json()).data.code).toBe('VALIDATION_ERROR')
  })

  it.each([randomUUID(), '11111111-1111-1111-8111-111111111111', '00000000-0000-0000-0000-000000000000'])('returns not found for a valid missing UUID %s', async (id) => {
    const response = await fetch(`${writerUrl}/${id}`)
    expect(response.status).toBe(404)
    expect((await response.json()).data.code).toBe('ARTICLE_NOT_FOUND')
  })

  it('reopens an existing non-v4 UUID and preserves a newly created draft after server restart', async () => {
    const otherId = '11111111-1111-1111-8111-111111111111'
    await pool.query('INSERT INTO articles (id,slug,draft_title) VALUES ($1,$2,$3)', [otherId, 'older-article', 'Older title'])
    expect((await fetch(`${writerUrl}/${otherId}`)).status).toBe(200)
    const article = await (await createDraft({ ...input, body: 'Persisted words', tags: ['ideas'] })).json()
    const before = (await pool.query('SELECT * FROM articles ORDER BY id')).rows
    await restartApp()
    const reopened = await fetch(`${writerUrl}/${article.id}`)
    expect(reopened.status).toBe(200)
    expect(await reopened.json()).toEqual(article)
    expect((await pool.query('SELECT * FROM articles ORDER BY id')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })
})
