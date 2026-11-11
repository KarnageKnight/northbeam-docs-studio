import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { appUrl, pool, resetDatabase, restartApp, runContendingRequests, startApp, stopApp, waitForBlockedQuery } from './helpers'

const writerUrl = `${appUrl}/api/writer/articles`
const input = { title: '  Finding inspiration  ', slug: ' Finding-Inspiration ' }

function createDraft(body: unknown = input) {
  return fetch(writerUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

function save(id: string, body: unknown) {
  return fetch(`${writerUrl}/${id}/draft`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

function publish(id: string, body: unknown) {
  return fetch(`${writerUrl}/${id}/publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

function unpublish(id: string, body: unknown) {
  return fetch(`${writerUrl}/${id}/unpublish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

function restore(id: string, body: unknown, versionId: string = randomUUID()) {
  return fetch(`${writerUrl}/${id}/versions/${versionId}/restore`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

function deleteVersion(articleId: string, versionId: string) {
  return fetch(`${writerUrl}/${articleId}/versions/${versionId}`, { method: 'DELETE' })
}

async function readState() {
  const articles = (await pool.query('SELECT * FROM articles ORDER BY id')).rows
  const versions = (await pool.query('SELECT * FROM article_versions ORDER BY article_id, version_number')).rows
  const publicList = await (await fetch(`${appUrl}/api/public/articles`)).json()
  const publicDetails = await Promise.all(articles.map(async (article) => {
    const response = await fetch(`${appUrl}/api/public/articles/${article.slug}`)
    return { status: response.status, body: await response.json() }
  }))
  return { articles, versions, publicList, publicDetails }
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

  it.each([1, 100])('preserves content and normalizes a %i-character slug and tag order in storage', async (length) => {
    const slug = 'a'.repeat(length)
    const response = await createDraft({ ...input, slug: ` ${slug.toUpperCase()} `, body: '  # Words\n', tags: [' Ideas ', '', 'life', 'IDEAS'] })
    expect(response.status).toBe(201)
    const article = await response.json()
    expect(article.draft).toEqual({ title: input.title, body: '  # Words\n', tags: ['ideas', 'life'] })
    expect(article.slug).toBe(slug)
    expect((await pool.query('SELECT slug, draft_body, draft_tags FROM articles')).rows[0])
      .toEqual({ slug, draft_body: '  # Words\n', draft_tags: ['ideas', 'life'] })
    const loaded = await fetch(`${writerUrl}/by-slug/${slug}`)
    expect(loaded.status).toBe(200)
    expect((await loaded.json()).id).toBe(article.id)
  })

  it.each([null, [], { title: ' ' }, { title: 1 }, { slug: 'two words' }, { slug: '' }, { slug: '   ' }, { slug: '-slug' }, { slug: 'slug-' },
    { slug: 'two--words' }, { slug: 'a_b' }, { slug: 'café' }, { slug: 'a/b' }, { slug: 'x'.repeat(101) }, { body: false }, { tags: [1] }, { tags: ['a b'] }, { extra: true }])(
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

  it.each(['draft', 'published', 'unpublished'])('reports field errors and rejects normalized collisions and slug edits without changing %s state', async (state) => {
    const invalid = await createDraft({ ...input, title: '' })
    expect((await invalid.json()).data.fieldErrors.title).toBeInstanceOf(Array)
    let first = await (await createDraft({ ...input, body: 'Saved article words' })).json()
    if (state !== 'draft') first = await (await publish(first.id, { expectedRevision: 0 })).json()
    if (state === 'unpublished') first = await (await unpublish(first.id, { expectedRevision: 1 })).json()
    const before = await readState()
    expect(before.articles[0].status).toBe(state)
    for (const slug of [first.slug, '  FINDING-INSPIRATION  ']) {
      const collision = await createDraft({ title: 'Other', slug })
      expect(collision.status).toBe(409)
      expect((await collision.json()).data.code).toBe('SLUG_CONFLICT')
      expect(await readState()).toEqual(before)
    }
    const rename = await save(first.id, { ...first.draft, slug: 'renamed-article', expectedRevision: first.revision })
    expect(rename.status).toBe(400)
    expect((await rename.json()).data.code).toBe('VALIDATION_ERROR')
    expect(await readState()).toEqual(before)
    expect(before.articles.map(article => article.slug)).toEqual(['finding-inspiration'])
    const loaded = await fetch(`${writerUrl}/by-slug/finding-inspiration`)
    expect(loaded.status).toBe(200)
    expect(await loaded.json()).toEqual(first)
  })

  it('lets the unique constraint resolve observed competing creates with the same normalized slug', async () => {
    const controller = await pool.connect()
    const requests: Promise<Response>[] = []
    try {
      const { rows: [{ pid }] } = await controller.query('SELECT pg_backend_pid() AS pid')
      await controller.query('SELECT pg_advisory_lock(73106002)')
      await pool.query(`CREATE FUNCTION pause_test_create() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN PERFORM pg_advisory_xact_lock(73106002); RETURN NEW; END; $$;
        CREATE TRIGGER pause_test_create AFTER INSERT ON articles FOR EACH ROW EXECUTE FUNCTION pause_test_create()`)
      requests.push(createDraft())
      const firstPid = await waitForBlockedQuery(pid)
      requests.push(createDraft({ ...input, title: 'Competing title', slug: 'FINDING-INSPIRATION' }))
      const secondPid = await waitForBlockedQuery(firstPid)
      expect(new Set([pid, firstPid, secondPid]).size).toBe(3)
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual([])
      await controller.query('SELECT pg_advisory_unlock(73106002)')
      const [created, collision] = await Promise.all(requests)
      expect(created.status).toBe(201)
      const article = await created.json()
      expect(article.slug).toBe('finding-inspiration')
      expect(collision.status).toBe(409)
      expect((await collision.json()).data.code).toBe('SLUG_CONFLICT')
      expect((await pool.query('SELECT id, slug, draft_title FROM articles')).rows)
        .toEqual([{ id: article.id, slug: 'finding-inspiration', draft_title: input.title }])
      expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
    }
    finally {
      try {
        await controller.query('SELECT pg_advisory_unlock_all()')
        await Promise.allSettled(requests)
      }
      finally {
        controller.release()
        await pool.query('DROP TRIGGER IF EXISTS pause_test_create ON articles; DROP FUNCTION IF EXISTS pause_test_create()')
      }
    }
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

  it.each(['finding-inspiration', 'new'])('projects saved summaries and detail by UUID and slug %s without changing rows or audit fields', async (slug) => {
    const article = await (await createDraft({ ...input, slug })).json()
    const before = (await pool.query('SELECT * FROM articles')).rows
    const list = await fetch(writerUrl)
    expect(list.status).toBe(200)
    expect(await list.json()).toEqual([{ id: article.id, slug: article.slug, title: input.title, status: 'draft' }])
    const detail = await fetch(`${writerUrl}/${article.id}`)
    expect(detail.status).toBe(200)
    expect(await detail.json()).toEqual(article)
    const bySlug = await fetch(`${writerUrl}/by-slug/${article.slug}`)
    expect(bySlug.status).toBe(200)
    expect(await bySlug.json()).toEqual(article)
    const listPage = await (await fetch(`${appUrl}/writer/articles`)).text()
    expect(listPage).toContain(`/writer/articles/${slug}/edit`)
    expect(listPage).not.toContain(`/writer/articles/${article.id}`)
    const page = await fetch(`${appUrl}/writer/articles/${slug}/edit`)
    expect(page.status).toBe(200)
    const html = await page.text()
    expect(html).toContain('id="draft-body"')
    expect(html).not.toContain('Article not found')
    expect(html).not.toContain('Unable to load article')
    const creationPage = await (await fetch(`${appUrl}/writer/articles/new`)).text()
    expect(creationPage).toContain('Create draft')
    expect(creationPage).not.toContain('id="draft-body"')
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
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    const bySlug = await fetch(`${writerUrl}/by-slug/${article.slug}`)
    expect(bySlug.status).toBe(200)
    expect(await bySlug.json()).toEqual(detail)
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
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
    const bySlug = await fetch(`${writerUrl}/by-slug/${id}`)
    expect(bySlug.status).toBe(404)
    expect((await bySlug.json()).data.code).toBe('ARTICLE_NOT_FOUND')
    const page = await fetch(`${appUrl}/writer/articles/${id}/edit`)
    const html = await page.text()
    expect(html).toContain('Article not found')
    expect(html).not.toContain('Unable to load article')
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
    expect(await (await fetch(`${writerUrl}/by-slug/${article.slug}`)).json()).toEqual(article)
    const page = await (await fetch(`${appUrl}/writer/articles/${article.slug}/edit`)).text()
    expect(page).toContain('Persisted words')
    expect(page).toContain('id="draft-body"')
    expect((await pool.query('SELECT * FROM articles ORDER BY id')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })
})

describe('save a complete draft', () => {
  const draft = { title: '  Updated title  ', body: '  # Updated words\n', tags: [' Ideas ', 'ideas', 'life'] }

  it('saves and reopens content after restart without creating history', async () => {
    const article = await (await createDraft()).json()
    const before = (await pool.query('SELECT * FROM articles')).rows[0]
    const response = await save(article.id, { ...draft, expectedRevision: 0 })
    expect(response.status).toBe(200)
    const saved = await response.json()
    expect(saved).toEqual({ ...article, revision: 1, draft: { ...draft, tags: ['ideas', 'life'] } })
    const after = (await pool.query('SELECT * FROM articles')).rows[0]
    expect(after).toMatchObject({ created_at: before.created_at, next_version_number: 1, slug: article.slug, status: 'draft', published_at: null, current_published_version_id: null })
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime())
    await restartApp()
    expect(await (await fetch(`${writerUrl}/${article.id}`)).json()).toEqual(saved)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })

  it('advances unchanged saves and rejects every stale lifecycle action without changing stored or public state', async () => {
    const article = await (await createDraft({ ...input, body: 'Published words' })).json()
    expect((await publish(article.id, { expectedRevision: 0 })).status).toBe(200)
    const response = await save(article.id, { ...article.draft, expectedRevision: 1 })
    expect(response.status).toBe(200)
    expect((await response.json()).revision).toBe(2)
    const before = await readState()
    for (const action of [save, publish, unpublish, restore]) {
      const stale = await action(article.id, action === save ? { ...draft, expectedRevision: 1 } : { expectedRevision: 1 })
      expect(stale.status).toBe(409)
      expect((await stale.json()).data.code).toBe('STALE_REVISION')
      expect(await readState()).toEqual(before)
    }
  })

  it.each(['published', 'unpublished'])('keeps %s snapshot, reference, date, and counters unchanged', async (status) => {
    const article = await (await createDraft()).json()
    const version = randomUUID()
    await pool.query('INSERT INTO article_versions (id,article_id,version_number,title,body,tags) VALUES ($1,$2,1,$3,$4,$5)', [version, article.id, 'Live title', 'Live body', ['live']])
    await pool.query('UPDATE articles SET status=$1,current_published_version_id=$2,published_at=$3,next_version_number=2 WHERE id=$4', [status, version, new Date('2026-11-07T12:00:00Z'), article.id])
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    const response = await save(article.id, { ...draft, expectedRevision: 0 })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ...article, revision: 1, status, currentPublishedVersionId: version, publishedAt: '2026-11-07T12:00:00.000Z', draft: { ...draft, tags: ['ideas', 'life'] } })
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
    expect((await pool.query('SELECT next_version_number FROM articles')).rows[0].next_version_number).toBe(2)
  })

  it.each([{}, { body: null }, { tags: null }, { title: ' ' }, { slug: 'changed' }, { expectedRevision: '0' }, { expectedRevision: -1 }, { expectedRevision: 0.1 }, { expectedRevision: Number.MAX_SAFE_INTEGER + 1 }])(
    'rejects invalid saves with no mutation (case %#)', async (fields) => {
      const article = await (await createDraft()).json()
      const before = (await pool.query('SELECT * FROM articles')).rows
      const body = Object.keys(fields).length ? { ...draft, expectedRevision: 0, ...fields } : {}
      const response = await save(article.id, body)
      expect(response.status).toBe(400)
      expect((await response.json()).data.code).toBe('VALIDATION_ERROR')
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    },
  )

  it('validates parsing/IDs before lookup, distinguishes missing articles, and handles large safe stale revisions', async () => {
    const article = await (await createDraft()).json()
    for (const id of ['invalid', randomUUID()]) {
      const response = await save(id, { ...draft, expectedRevision: 0 })
      expect(response.status).toBe(id === 'invalid' ? 400 : 404)
      expect((await response.json()).data.code).toBe(id === 'invalid' ? 'VALIDATION_ERROR' : 'ARTICLE_NOT_FOUND')
    }
    const missingInvalid = await save(randomUUID(), {})
    expect(missingInvalid.status).toBe(400)
    const malformed = await fetch(`${writerUrl}/${article.id}/draft`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{' })
    expect(malformed.status).toBe(400)
    expect((await malformed.json()).data.code).toBe('VALIDATION_ERROR')
    const stale = await save(article.id, { ...draft, expectedRevision: Number.MAX_SAFE_INTEGER })
    expect(stale.status).toBe(409)
    expect((await stale.json()).data.code).toBe('STALE_REVISION')
  })

  it('rolls back a failed update and allows the next valid save', async () => {
    const article = await (await createDraft()).json()
    const before = (await pool.query('SELECT * FROM articles')).rows
    await pool.query(`CREATE FUNCTION fail_test_save() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private save detail'; END; $$;
      CREATE TRIGGER fail_test_save BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION fail_test_save()`)
    try {
      const failed = await save(article.id, { ...draft, expectedRevision: 0 })
      expect(failed.status).toBe(500)
      expect(await failed.text()).not.toMatch(/private save detail|UPDATE.*articles|stack|23505|55000/i)
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    }
    finally { await pool.query('DROP TRIGGER fail_test_save ON articles; DROP FUNCTION fail_test_save()') }
    expect((await save(article.id, { ...draft, expectedRevision: 0 })).status).toBe(200)
  })
})


describe('publish saved content', () => {

  it.each(['title', 'body', 'tags', 'older snapshot', 'other article'])('creates a new snapshot for %s differences from the retained reference', async (scenario) => {
    const article = await (await createDraft({ ...input, body: 'Original words', tags: ['one', 'two'] })).json()
    let current = article
    if (scenario === 'other article') {
      const other = await (await createDraft({ ...input, slug: 'other-publication', body: article.draft.body, tags: article.draft.tags })).json()
      expect((await publish(other.id, { expectedRevision: other.revision })).status).toBe(200)
    }
    const firstResponse = await publish(article.id, { expectedRevision: current.revision })
    expect(firstResponse.status).toBe(200)
    current = await firstResponse.json()
    const firstDate = current.publishedAt
    const draft = { ...article.draft, tags: ['two', 'one'] }
    if (scenario === 'title') draft.title += ' changed'
    else if (scenario === 'tags') draft.tags = ['two', 'three']
    else draft.body += ' changed'
    const savedResponse = await save(article.id, { ...draft, expectedRevision: current.revision })
    expect(savedResponse.status).toBe(200)
    current = await savedResponse.json()
    if (scenario === 'older snapshot') {
      current = await (await publish(article.id, { expectedRevision: current.revision })).json()
      const restored = await save(article.id, { ...article.draft, expectedRevision: current.revision })
      expect(restored.status).toBe(200)
      current = await restored.json()
    }
    const before = await readState()
    const old = before.articles.find(row => row.id === article.id)
    const response = await publish(article.id, { expectedRevision: current.revision })
    expect(response.status).toBe(200)
    const published = await response.json()
    expect(published).toEqual({ ...current, revision: current.revision + 1, currentPublishedVersionId: expect.any(String), publishedAt: firstDate })
    expect(published.currentPublishedVersionId).not.toBe(current.currentPublishedVersionId)
    const after = await readState()
    expect(after.versions.filter(row => row.id !== published.currentPublishedVersionId)).toEqual(before.versions)
    expect(after.versions.find(row => row.id === published.currentPublishedVersionId)).toEqual({
      id: published.currentPublishedVersionId, article_id: article.id, version_number: old.next_version_number,
      ...current.draft, created_at: expect.any(Date),
    })
    expect(after.articles.find(row => row.id === article.id)).toEqual({ ...old, revision: old.revision + 1,
      next_version_number: old.next_version_number + 1, current_published_version_id: published.currentPublishedVersionId,
      updated_at: expect.any(Date) })
  })

  it.each([false, true])('reactivates the retained snapshot without allocation (reordered tags: %s)', async (reordered) => {
    const article = await (await createDraft({ ...input, body: 'Retained words', tags: ['one', 'two'] })).json()
    const first = await (await publish(article.id, { expectedRevision: article.revision })).json()
    const hiddenResponse = await unpublish(article.id, { expectedRevision: first.revision })
    expect(hiddenResponse.status).toBe(200)
    let hidden = await hiddenResponse.json()
    if (reordered) {
      const saved = await save(article.id, { ...hidden.draft, tags: ['two', 'one'], expectedRevision: hidden.revision })
      expect(saved.status).toBe(200)
      hidden = await saved.json()
    }
    const before = await readState()
    expect(before.publicList).toEqual([])
    expect(before.publicDetails[0].status).toBe(404)
    const response = await publish(article.id, { expectedRevision: hidden.revision })
    expect(response.status).toBe(200)
    const published = await response.json()
    expect(published).toEqual({ ...hidden, status: 'published', revision: hidden.revision + 1 })
    const after = await readState()
    expect(after.articles).toEqual([{ ...before.articles[0], status: 'published', revision: hidden.revision + 1, updated_at: expect.any(Date) }])
    expect(after.articles[0].updated_at.getTime()).toBeGreaterThan(before.articles[0].updated_at.getTime())
    expect(after.versions).toEqual(before.versions)
    expect(after.publicDetails).toEqual([{ status: 200, body: { slug: article.slug, ...article.draft, publishedAt: first.publishedAt } }])
    expect(after.publicList).toEqual([{ slug: article.slug, title: article.draft.title, tags: article.draft.tags, publishedAt: first.publishedAt }])
    const repeated = await publish(article.id, { expectedRevision: published.revision })
    expect(repeated.status).toBe(200)
    expect(await repeated.json()).toEqual(published)
    expect(await readState()).toEqual(after)
  })


  it('returns the same writer response and exact persisted state for ten unchanged publishes', async () => {
    const article = await (await createDraft({ ...input, body: '**Saved words**\n', tags: ['ideas', 'life'] })).json()
    const first = await publish(article.id, { expectedRevision: article.revision })
    expect(first.status).toBe(200)
    const published = await first.json()
    const before = await readState()
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await publish(article.id, { expectedRevision: published.revision })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(published)
      expect(await readState()).toEqual(before)
    }
  })

  it.each(['identical save', 'reverted edits', 'reordered tags'])('does not publish a new version after %s', async (scenario) => {
    const article = await (await createDraft({ ...input, body: 'Exact saved text\n', tags: ['ideas', 'life'] })).json()
    let current = await (await publish(article.id, { expectedRevision: article.revision })).json()
    if (scenario === 'reverted edits') {
      const changed = await save(article.id, { ...current.draft, body: 'Temporary edits', expectedRevision: current.revision })
      expect(changed.status).toBe(200)
      current = await changed.json()
    }
    const draft = { ...article.draft, tags: scenario === 'reordered tags' ? ['life', 'ideas'] : article.draft.tags }
    const saved = await save(article.id, { ...draft, expectedRevision: current.revision })
    expect(saved.status).toBe(200)
    current = await saved.json()
    const before = await readState()
    const response = await publish(article.id, { expectedRevision: current.revision })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(current)
    expect(await readState()).toEqual(before)
    expect(before.articles[0].draft_tags).toEqual(draft.tags)
    expect(before.versions[0].tags).toEqual(article.draft.tags)
    expect(before.publicDetails[0].body.tags).toEqual(article.draft.tags)
  })


  it('atomically publishes saved content, keeps immutable snapshots, and preserves the first date on republish', async () => {
    const article = await (await createDraft({ ...input, body: '  # Saved words\n', tags: [' Ideas ', 'life'] })).json()
    const before = (await pool.query('SELECT * FROM articles')).rows[0]
    let publishedAt: string | null = null
    let previousSnapshots: unknown[] = []
    let current = article
    for (let version = 1; version <= 2; version++) {
      if (version > 1) {
        const saved = await save(article.id, { ...current.draft, body: '  # Revised saved words\n', expectedRevision: current.revision })
        expect(saved.status).toBe(200)
        current = await saved.json()
      }
      const response = await publish(article.id, { expectedRevision: current.revision })
      expect(response.status).toBe(200)
      const published = await response.json()
      expect(published).toEqual({ ...current, status: 'published', revision: current.revision + 1,
        currentPublishedVersionId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
        publishedAt: publishedAt ?? expect.any(String) })
      publishedAt ??= published.publishedAt
      const stored = (await pool.query('SELECT * FROM articles')).rows[0]
      const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
      expect(snapshots).toHaveLength(version)
      expect(snapshots.slice(0, version - 1)).toEqual(previousSnapshots)
      const latest = snapshots[version - 1]
      expect(latest).toEqual({ id: published.currentPublishedVersionId, article_id: article.id,
        version_number: version, title: current.draft.title, body: current.draft.body,
        tags: current.draft.tags, created_at: expect.any(Date) })
      expect(stored).toEqual({ ...before, draft_body: current.draft.body, status: 'published', revision: current.revision + 1,
        current_published_version_id: latest.id, next_version_number: version + 1,
        published_at: new Date(published.publishedAt), updated_at: latest.created_at })
      expect(stored.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime())
      previousSnapshots = snapshots
      current = published
    }
    await restartApp()
    const reopened = await (await fetch(`${writerUrl}/${article.id}`)).json()
    expect(reopened).toMatchObject({ revision: current.revision, publishedAt })
    expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows).toEqual(previousSnapshots)
  })

  it('keeps live content unchanged after a save, then copies only the new saved draft on republish', async () => {
    const article = await (await createDraft({ ...input, body: 'Original words', tags: ['old'] })).json()
    const first = await (await publish(article.id, { expectedRevision: 0 })).json()
    const initial = (await pool.query('SELECT * FROM article_versions')).rows[0]
    const draft = { title: 'New title', body: 'New saved words', tags: ['new'] }
    const saved = await fetch(`${writerUrl}/${article.id}/draft`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, expectedRevision: 1 }) })
    expect(saved.status).toBe(200)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([initial])
    const response = await publish(article.id, { expectedRevision: 2 })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ...first, revision: 3, draft, currentPublishedVersionId: expect.any(String) })
    const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
    expect(snapshots[0]).toEqual(initial)
    expect(snapshots[1]).toMatchObject({ version_number: 2, title: draft.title, body: draft.body, tags: draft.tags })
  })

  it.each(['', ' \n\t', '\u2003'])('rejects a blank saved body %j, but checks stale revision first', async (body) => {
    const article = await (await createDraft({ ...input, body })).json()
    const before = (await pool.query('SELECT * FROM articles')).rows
    const beforeState = await readState()
    const invalid = await publish(article.id, { expectedRevision: 0 })
    expect(invalid.status).toBe(400)
    expect((await invalid.json()).data).toMatchObject({ code: 'VALIDATION_ERROR', fieldErrors: { body: expect.any(Array) } })
    const stale = await publish(article.id, { expectedRevision: 1 })
    expect(stale.status).toBe(409)
    expect((await stale.json()).data.code).toBe('STALE_REVISION')
    expect(await readState()).toEqual(beforeState)
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })

  it('checks a blank saved title under the lock before inserting history', async () => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    await pool.query('UPDATE articles SET draft_title=$1 WHERE id=$2', [' ', article.id])
    const before = (await pool.query('SELECT * FROM articles')).rows
    const response = await publish(article.id, { expectedRevision: 0 })
    expect(response.status).toBe(400)
    expect((await response.json()).data.fieldErrors.title).toBeInstanceOf(Array)
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })

  it.each([{}, { expectedRevision: null }, { expectedRevision: '0' }, { expectedRevision: -1 }, { expectedRevision: 0.5 }, { expectedRevision: Number.MAX_SAFE_INTEGER + 1 }, { expectedRevision: false }, { expectedRevision: {} }, { expectedRevision: 0, extra: true }, { expectedRevision: 0, title: 'Browser text' }])(
    'rejects invalid publication action payloads before lookup (case %#)', async (body) => {
      const article = await (await createDraft({ ...input, body: 'Saved words' })).json()
      const published = await (await publish(article.id, { expectedRevision: 0 })).json()
      const before = await readState()
      const actions = 'title' in body ? [publish, unpublish, restore] : [save, publish, unpublish, restore]
      for (const action of actions) {
        const payload = action === save ? { ...published.draft, ...body } : body
        for (const id of [article.id, randomUUID()]) {
          const response = await action(id, payload)
          expect(response.status).toBe(400)
          expect((await response.json()).data.code).toBe('VALIDATION_ERROR')
          expect(await readState()).toEqual(before)
        }
      }
    },
  )

  it('distinguishes malformed/missing IDs, validates JSON, and rejects safe but stale revisions without mutation', async () => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    const before = await readState()
    for (const [id, revision, status, code] of [
      ['invalid', 0, 400, 'VALIDATION_ERROR'], [randomUUID(), 0, 404, 'ARTICLE_NOT_FOUND'],
      [article.id, Number.MAX_SAFE_INTEGER, 409, 'STALE_REVISION'],
    ] as const) {
      for (const action of [save, publish, unpublish, restore]) {
        const response = await action(id, action === save ? { ...article.draft, expectedRevision: revision } : { expectedRevision: revision })
        expect(response.status).toBe(status)
        expect((await response.json()).data.code).toBe(code)
        expect(await readState()).toEqual(before)
      }
    }
    for (const action of ['draft', 'publish', 'unpublish', `versions/${randomUUID()}/restore`]) {
      const malformed = await fetch(`${writerUrl}/${article.id}/${action}`, { method: action === 'draft' ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
      expect(malformed.status).toBe(400)
      expect((await malformed.json()).data.code).toBe('VALIDATION_ERROR')
    }
    expect(await readState()).toEqual(before)
  })

  it.each([false, true])('rolls back publication after snapshot insertion (previously published: %s)', async (alreadyPublished) => {
    const article = await (await createDraft({ ...input, body: 'Saved words' })).json()
    let revision = article.revision
    if (alreadyPublished) {
      const first = await publish(article.id, { expectedRevision: revision })
      expect(first.status).toBe(200)
      const published = await first.json()
      const saved = await save(article.id, { ...published.draft, body: 'Changed words for failed publication', expectedRevision: published.revision })
      expect(saved.status).toBe(200)
      revision = (await saved.json()).revision
    }
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    await pool.query(`CREATE FUNCTION fail_test_publish() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.status = 'published' AND (SELECT count(*) FROM article_versions WHERE article_id=NEW.id) > ${snapshots.length}
        THEN RAISE EXCEPTION 'private publication detail'; END IF;
        RETURN NEW;
      END; $$;
      CREATE TRIGGER fail_test_publish BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION fail_test_publish()`)
    try {
      const failed = await publish(article.id, { expectedRevision: revision })
      expect(failed.status).toBe(500)
      expect(await failed.text()).not.toMatch(/private publication detail|INSERT INTO|stack/i)
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
      expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
    }
    finally { await pool.query('DROP TRIGGER fail_test_publish ON articles; DROP FUNCTION fail_test_publish()') }
    const recovered = await publish(article.id, { expectedRevision: revision })
    expect(recovered.status).toBe(200)
    const versions = (await pool.query('SELECT version_number FROM article_versions ORDER BY version_number')).rows
    expect(versions.map(v => v.version_number)).toEqual(alreadyPublished ? [1, 2] : [1])
  })

  it('rolls back an uncommitted snapshot when the app crashes at an observed database lock barrier', async () => {
    const article = await (await createDraft({ ...input, body: 'Saved words' })).json()
    const before = (await pool.query('SELECT * FROM articles')).rows
    const controller = await pool.connect()
    let request: Promise<Response | null> | undefined
    try {
      const { rows: [{ pid }] } = await controller.query('SELECT pg_backend_pid() AS pid')
      await controller.query('SELECT pg_advisory_lock(73106001)')
      await pool.query(`CREATE FUNCTION pause_test_publish() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN PERFORM pg_advisory_xact_lock(73106001); RETURN NEW; END; $$;
        CREATE TRIGGER pause_test_publish AFTER INSERT ON article_versions FOR EACH ROW EXECUTE FUNCTION pause_test_publish()`)
      request = publish(article.id, { expectedRevision: 0 }).catch(() => null)
      const blockedPid = await waitForBlockedQuery(pid)
      expect(blockedPid).not.toBe(pid)
      expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
      await stopApp('SIGKILL')
      await controller.query('SELECT pg_advisory_unlock(73106001)')
      await request
      // Waiting for the article lock also waits for the disconnected transaction to roll back.
      await controller.query('SELECT id FROM articles WHERE id=$1 FOR UPDATE', [article.id])
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
      expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
    }
    finally {
      await stopApp('SIGKILL')
      await controller.query('SELECT pg_advisory_unlock_all()')
      await request
      controller.release()
      await pool.query('DROP TRIGGER IF EXISTS pause_test_publish ON article_versions; DROP FUNCTION IF EXISTS pause_test_publish()')
      await startApp()
    }
    const recovered = await publish(article.id, { expectedRevision: 0 })
    expect(recovered.status).toBe(200)
    expect((await recovered.json()).revision).toBe(1)
    expect((await pool.query('SELECT version_number FROM article_versions')).rows).toEqual([{ version_number: 1 }])
  })

  it('republishes changed unpublished content with its retained date and advances only that article counter', async () => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    const first = await (await publish(article.id, { expectedRevision: 0 })).json()
    const hiddenResponse = await unpublish(article.id, { expectedRevision: first.revision })
    expect(hiddenResponse.status).toBe(200)
    const hidden = await hiddenResponse.json()
    const savedResponse = await save(article.id, { ...hidden.draft, body: 'Changed unpublished words', expectedRevision: hidden.revision })
    expect(savedResponse.status).toBe(200)
    const saved = await savedResponse.json()
    const response = await publish(article.id, { expectedRevision: saved.revision })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'published', revision: saved.revision + 1, publishedAt: first.publishedAt })
    expect((await pool.query('SELECT version_number FROM article_versions WHERE article_id=$1 ORDER BY version_number', [article.id])).rows).toEqual([{ version_number: 1 }, { version_number: 2 }])
    const other = await (await createDraft({ ...input, slug: 'second-article', body: 'Other words' })).json()
    expect((await publish(other.id, { expectedRevision: 0 })).status).toBe(200)
    expect((await pool.query('SELECT version_number FROM article_versions WHERE article_id=$1', [other.id])).rows).toEqual([{ version_number: 1 }])
  })
})


describe('public article reads', () => {
  const markdown = '# Public heading\n\n**Useful text**\n\n<script>window.publicMarkdownExecuted=true</script>\n\n[Unsafe](javascript:alert(1))\n\n[Safe](https://example.com)'
  const publicUrl = `${appUrl}/api/public/articles`
  const detailUrl = (slug: string) => `${publicUrl}/${encodeURIComponent(slug)}`
  const publish = (id: string, expectedRevision = 0) => fetch(`${writerUrl}/${id}/publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision }),
  })

  it('returns an anonymous empty array and renders an understandable empty state', async () => {
    const response = await fetch(publicUrl)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
    const page = await fetch(appUrl)
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('No published articles yet')
  })

  it('returns only live summaries, renders safe title/tags/date/links, and leaves stored state unchanged', async () => {
    const article = await (await createDraft({ title: 'Live title <strong>literal</strong>', slug: 'live-article', body: markdown, tags: ['live'] })).json()
    const published = await (await publish(article.id)).json()
    await createDraft({ title: 'Draft-only secret marker', slug: 'draft-secret', body: 'Private draft' })
    const hidden = await (await createDraft({ title: 'Unpublished secret marker', slug: 'hidden-secret', body: 'Formerly live' })).json()
    await publish(hidden.id)
    expect((await unpublish(hidden.id, { expectedRevision: 1 })).status).toBe(200)
    await fetch(`${writerUrl}/${article.id}/draft`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Private saved title marker', body: 'Private saved body marker', tags: ['private-secret'], expectedRevision: 1 }) })
    const before = (await pool.query('SELECT * FROM articles ORDER BY id')).rows
    const versions = (await pool.query('SELECT * FROM article_versions ORDER BY id')).rows
    const response = await fetch(publicUrl)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ slug: article.slug, title: article.draft.title, tags: ['live'], publishedAt: published.publishedAt }])
    const detail = await fetch(detailUrl(article.slug))
    expect(detail.status).toBe(200)
    expect(await detail.json()).toEqual({ slug: article.slug, title: article.draft.title, body: article.draft.body, tags: ['live'], publishedAt: published.publishedAt })
    const html = await (await fetch(appUrl)).text()
    expect(html).toContain('Live title &lt;strong&gt;literal&lt;/strong&gt;')
    expect(html).toContain('href="/articles/live-article"')
    expect(html).toContain(`datetime="${published.publishedAt}"`)
    expect(html).toContain('live')
    expect(html).not.toMatch(/Draft-only secret marker|Unpublished secret marker|Private saved title marker|Private saved body marker|private-secret|Public heading|publicMarkdownExecuted/)
    const page = await fetch(`${appUrl}/articles/${article.slug}`)
    expect(page.status).toBe(200)
    const rendered = await page.text()
    expect(rendered).toContain('<h1>Public heading</h1>')
    expect(rendered).toContain('<strong>Useful text</strong>')
    expect(rendered).toContain('&lt;script&gt;window.publicMarkdownExecuted=true&lt;/script&gt;')
    expect(rendered).not.toContain('href="javascript:')
    expect(rendered).toContain('href="https://example.com"')
    expect(rendered).toContain('Live title &lt;strong&gt;literal&lt;/strong&gt;')
    expect(rendered).toContain(`datetime="${published.publishedAt}"`)
    expect(rendered).toContain('All articles')
    expect(rendered).not.toMatch(/Private saved title marker|Private saved body marker|private-secret/)

    expect((await pool.query('SELECT * FROM articles ORDER BY id')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions ORDER BY id')).rows).toEqual(versions)
  })

  it('keeps a saved draft isolated until republish, retaining the original date and surviving restart', async () => {
    const article = await (await createDraft({ ...input, body: 'First body', tags: ['original'] })).json()
    const first = await (await publish(article.id)).json()
    const original = [{ slug: article.slug, title: article.draft.title, tags: ['original'], publishedAt: first.publishedAt }]
    expect(await (await fetch(publicUrl)).json()).toEqual(original)
    expect(await (await fetch(detailUrl(article.slug))).json()).toEqual({ ...original[0], body: article.draft.body })
    const draft = { title: 'New live title', body: 'New body', tags: ['updated'] }
    const saved = await fetch(`${writerUrl}/${article.id}/draft`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, expectedRevision: 1 }) })
    expect(saved.status).toBe(200)
    expect(await (await fetch(publicUrl)).json()).toEqual(original)
    expect(await (await fetch(detailUrl(article.slug))).json()).toEqual({ ...original[0], body: article.draft.body })
    const republished = await publish(article.id, 2)
    expect(republished.status).toBe(200)
    const updated = [{ slug: article.slug, title: draft.title, tags: draft.tags, publishedAt: first.publishedAt }]
    expect(await (await fetch(publicUrl)).json()).toEqual(updated)
    expect(await (await fetch(detailUrl(article.slug))).json()).toEqual({ ...updated[0], body: draft.body })
    await restartApp()
    expect(await (await fetch(publicUrl)).json()).toEqual(updated)
    expect(await (await fetch(detailUrl(article.slug))).json()).toEqual({ ...updated[0], body: draft.body })
    const html = await (await fetch(appUrl)).text()
    expect(html).toContain(draft.title)
    expect(html).toContain('href="/articles/finding-inspiration"')
  })

  it.each(['missing', 'draft', 'unpublished'])('returns the same public not-found response for %s articles', async (state) => {
    let slug = 'missing-article'
    if (state !== 'missing') {
      const article = await (await createDraft({ ...input, body: 'Hidden body marker' })).json()
      slug = article.slug
      if (state === 'unpublished') {
        expect((await publish(article.id)).status).toBe(200)
        expect((await unpublish(article.id, { expectedRevision: 1 })).status).toBe(200)
      }
    }
    const before = (await pool.query('SELECT * FROM articles')).rows
    const versions = (await pool.query('SELECT * FROM article_versions')).rows
    const response = await fetch(detailUrl(slug))
    expect(response.status).toBe(404)
    const failure = await response.json()
    expect(failure.data).toEqual({ code: 'ARTICLE_NOT_FOUND' })
    expect(JSON.stringify(failure)).not.toMatch(/Hidden body marker|Finding inspiration/)
    const page = await fetch(`${appUrl}/articles/${slug}`)
    expect(page.status).toBe(404)
    const html = await page.text()
    expect(html).toContain('Article not found')
    expect(html).toContain('All articles')
    expect(html).not.toMatch(/Hidden body marker|Finding inspiration/)

    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(versions)
  })

})


describe('unpublish while retaining publication history', () => {
  it('removes public access, changes only state/revision/update time, and preserves history/date through restart and republish', async () => {
    const article = await (await createDraft({ ...input, body: 'Saved words', tags: ['ideas'] })).json()
    const publish = (expectedRevision: number) => fetch(`${writerUrl}/${article.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision }) })
    const first = await (await publish(article.revision)).json()
    const savedResponse = await save(article.id, { ...first.draft, body: 'Second saved version', expectedRevision: first.revision })
    expect(savedResponse.status).toBe(200)
    const saved = await savedResponse.json()
    const publishedResponse = await publish(saved.revision)
    expect(publishedResponse.status).toBe(200)
    const published = await publishedResponse.json()
    const before = (await pool.query('SELECT * FROM articles')).rows[0]
    const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
    const response = await unpublish(article.id, { expectedRevision: published.revision })
    expect(response.status).toBe(200)
    const hidden = await response.json()
    expect(hidden).toEqual({ ...published, status: 'unpublished', revision: published.revision + 1 })
    const after = (await pool.query('SELECT * FROM articles')).rows[0]
    expect(after).toEqual({ ...before, status: 'unpublished', revision: hidden.revision, updated_at: expect.any(Date) })
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime())
    expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows).toEqual(snapshots)
    expect(await (await fetch(`${appUrl}/api/public/articles`)).json()).toEqual([])
    expect((await fetch(`${appUrl}/api/public/articles/${article.slug}`)).status).toBe(404)
    expect((await fetch(`${appUrl}/articles/${article.slug}`)).status).toBe(404)
    await restartApp()
    expect(await (await fetch(`${writerUrl}/${article.id}`)).json()).toEqual(hidden)
    expect((await pool.query('SELECT * FROM articles')).rows[0]).toEqual(after)
    const changedResponse = await save(article.id, { ...hidden.draft, body: 'Third saved version', expectedRevision: hidden.revision })
    expect(changedResponse.status).toBe(200)
    const changed = await changedResponse.json()
    const republished = await publish(changed.revision)
    expect(republished.status).toBe(200)
    expect(await republished.json()).toMatchObject({ status: 'published', revision: changed.revision + 1, publishedAt: first.publishedAt })
    expect((await pool.query('SELECT version_number FROM article_versions ORDER BY version_number')).rows).toEqual([{ version_number: 1 }, { version_number: 2 }, { version_number: 3 }])
    expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows.slice(0, 2)).toEqual(snapshots)
    expect((await fetch(`${appUrl}/api/public/articles/${article.slug}`)).status).toBe(200)
  })

  it.each(['draft', 'unpublished'])('rejects %s state, with stale revision taking precedence and no mutation', async (state) => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    let revision = 0
    if (state === 'unpublished') {
      await fetch(`${writerUrl}/${article.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0 }) })
      expect((await unpublish(article.id, { expectedRevision: 1 })).status).toBe(200)
      revision = 2
    }
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    const beforeState = await readState()
    for (const [token, code] of [[revision, 'INVALID_PUBLICATION_STATE'], [revision + 1, 'STALE_REVISION']] as const) {
      const response = await unpublish(article.id, { expectedRevision: token })
      expect(response.status).toBe(409)
      expect((await response.json()).data.code).toBe(code)
      expect(await readState()).toEqual(beforeState)
    }
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
  })

  it('rolls back failed unpublish, leaves public access intact, and permits recovery', async () => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    const published = await fetch(`${writerUrl}/${article.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0 }) })
    expect(published.status).toBe(200)
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    await pool.query(`CREATE FUNCTION fail_test_unpublish() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private unpublish detail'; END; $$;
      CREATE TRIGGER fail_test_unpublish BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION fail_test_unpublish()`)
    try {
      const failed = await unpublish(article.id, { expectedRevision: 1 })
      expect(failed.status).toBe(500)
      expect(await failed.text()).not.toMatch(/private unpublish detail|UPDATE.*articles|stack|23505|55000/i)
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
      expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
      expect((await fetch(`${appUrl}/api/public/articles/${article.slug}`)).status).toBe(200)
    }
    finally { await pool.query('DROP TRIGGER fail_test_unpublish ON articles; DROP FUNCTION fail_test_unpublish()') }
    expect((await unpublish(article.id, { expectedRevision: 1 })).status).toBe(200)
  })
})


describe('read-only version history', () => {
  const versionsUrl = (id: string) => `${writerUrl}/${id}/versions`

  it('returns an empty history for a draft and accepts valid non-v4 article and snapshot UUIDs', async () => {
    const articleId = '11111111-1111-1111-8111-111111111111'
    const versionId = '22222222-2222-2222-8222-222222222222'
    await pool.query('INSERT INTO articles (id,slug,draft_title) VALUES ($1,$2,$3)', [articleId, 'legacy-history', 'Legacy article'])
    const empty = await fetch(versionsUrl(articleId))
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual([])
    await pool.query('INSERT INTO article_versions (id,article_id,version_number,title,body,tags) VALUES ($1,$2,1,$3,$4,$5)', [versionId, articleId, 'Old title', 'Old body', ['old']])
    expect(await (await fetch(versionsUrl(articleId))).json()).toEqual([{ id: versionId, versionNumber: 1 }])
    const detail = await fetch(`${versionsUrl(articleId)}/${versionId}`)
    expect(detail.status).toBe(200)
    expect(await detail.json()).toEqual({ id: versionId, versionNumber: 1, title: 'Old title', body: 'Old body', tags: ['old'] })
  })

  it.each(['published', 'unpublished'])('lists newest numbers and inspects exact immutable content without changing %s state', async (state) => {
    const article = await (await createDraft({ ...input, body: '# First body', tags: ['first'] })).json()
    const publish = (revision: number) => fetch(`${writerUrl}/${article.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: revision }) })
    const first = await (await publish(0)).json()
    const secondDraft = { title: 'Second title', body: '# Second body', tags: ['second'] }
    expect((await fetch(`${writerUrl}/${article.id}/draft`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...secondDraft, expectedRevision: 1 }) })).status).toBe(200)
    const second = await (await publish(2)).json()
    if (state === 'unpublished') expect((await unpublish(article.id, { expectedRevision: 3 })).status).toBe(200)
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
    const publicBefore = await (await fetch(`${appUrl}/api/public/articles`)).json()
    const response = await fetch(versionsUrl(article.id))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ id: second.currentPublishedVersionId, versionNumber: 2 }, { id: first.currentPublishedVersionId, versionNumber: 1 }])
    for (const [id, versionNumber, draft] of [[first.currentPublishedVersionId, 1, article.draft], [second.currentPublishedVersionId, 2, secondDraft]] as const) {
      const detail = await fetch(`${versionsUrl(article.id)}/${id}`)
      expect(detail.status).toBe(200)
      expect(await detail.json()).toEqual({ id, versionNumber, ...draft })
    }
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows).toEqual(snapshots)
    expect(await (await fetch(`${appUrl}/api/public/articles`)).json()).toEqual(publicBefore)
    await restartApp()
    expect(await (await fetch(versionsUrl(article.id))).json()).toEqual([{ id: second.currentPublishedVersionId, versionNumber: 2 }, { id: first.currentPublishedVersionId, versionNumber: 1 }])
  })

  it('orders by version number even when UUID and timestamp order disagree', async () => {
    const article = await (await createDraft()).json()
    const oldId = 'ffffffff-ffff-4fff-bfff-ffffffffffff'
    const newId = '00000000-0000-4000-8000-000000000001'
    await pool.query('INSERT INTO article_versions (id,article_id,version_number,title,body,tags,created_at) VALUES ($1,$3,1,$4,$5,$6,$7),($2,$3,2,$4,$5,$6,$8)', [oldId, newId, article.id, 'Title', 'Body', [], '2026-11-07T15:00:00Z', '2026-11-07T12:00:00Z'])
    expect(await (await fetch(versionsUrl(article.id))).json()).toEqual([{ id: newId, versionNumber: 2 }, { id: oldId, versionNumber: 1 }])
  })

  it('reads complete maximum-size sources and recognizes deletion on reread without changing stored or public state', async () => {
    const firstContent = {
      title: '😀'.repeat(200), body: `${'😀'.repeat(99996)}\r\n\n\t`,
      tags: Array.from({ length: 10 }, (_, index) => `${index}${'a'.repeat(29)}`),
    }
    const secondContent = {
      title: '😃'.repeat(200), body: `${'a'.repeat(99996)}\r\n\n\t`,
      tags: Array.from({ length: 10 }, (_, index) => `${index}${'b'.repeat(29)}`),
    }
    const article = await (await createDraft({ ...firstContent, slug: 'maximum-history' })).json()
    const firstResponse = await publish(article.id, { expectedRevision: 0 })
    expect(firstResponse.status).toBe(200)
    const first = await firstResponse.json()
    expect((await save(article.id, { ...secondContent, expectedRevision: 1 })).status).toBe(200)
    const secondResponse = await publish(article.id, { expectedRevision: 2 })
    expect(secondResponse.status).toBe(200)
    const second = await secondResponse.json()
    const beforeReads = await readState()
    for (const [id, versionNumber, content] of [
      [first.currentPublishedVersionId, 1, firstContent],
      [second.currentPublishedVersionId, 2, secondContent],
    ] as const) {
      const response = await fetch(`${versionsUrl(article.id)}/${id}`)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ id, versionNumber, ...content })
    }
    expect(await readState()).toEqual(beforeReads)
    expect((await deleteVersion(article.id, first.currentPublishedVersionId)).status).toBe(204)
    const afterExplicitDeletion = await readState()
    const deleted = await fetch(`${versionsUrl(article.id)}/${first.currentPublishedVersionId}`)
    expect(deleted.status).toBe(404)
    expect((await deleted.json()).data.code).toBe('SNAPSHOT_NOT_FOUND')
    expect(await (await fetch(`${versionsUrl(article.id)}/${second.currentPublishedVersionId}`)).json())
      .toEqual({ id: second.currentPublishedVersionId, versionNumber: 2, ...secondContent })
    expect(await readState()).toEqual(afterExplicitDeletion)
  })

  it('validates both IDs before lookup and distinguishes missing articles from missing or wrong-owner snapshots', async () => {
    const article = await (await createDraft()).json()
    const other = await (await createDraft({ ...input, slug: 'other-history', body: 'Other private body' })).json()
    const published = await (await fetch(`${writerUrl}/${other.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0 }) })).json()
    const missingId = randomUUID()
    const before = (await pool.query('SELECT * FROM articles ORDER BY id')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    for (const [suffix, status, code] of [
      ['invalid/versions', 400, 'VALIDATION_ERROR'], [missingId + '/versions', 404, 'ARTICLE_NOT_FOUND'],
      ['invalid/versions/' + missingId, 400, 'VALIDATION_ERROR'],
      [missingId + '/versions/invalid', 400, 'VALIDATION_ERROR'],
      [article.id + '/versions/invalid', 400, 'VALIDATION_ERROR'],
      [missingId + '/versions/' + missingId, 404, 'ARTICLE_NOT_FOUND'],
      [article.id + '/versions/' + missingId, 404, 'SNAPSHOT_NOT_FOUND'],
      [article.id + '/versions/' + published.currentPublishedVersionId, 404, 'SNAPSHOT_NOT_FOUND'],
    ] as const) {
      const response = await fetch(`${writerUrl}/${suffix}`)
      expect(response.status).toBe(status)
      const error = await response.json()
      expect(error.data.code).toBe(code)
      expect(JSON.stringify(error)).not.toContain('Other private body')
    }
    expect((await pool.query('SELECT * FROM articles ORDER BY id')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
  })
})


describe('restore snapshot into draft', () => {
  it.each(['published', 'unpublished'])('restores old/current/identical content while preserving %s publication and all history', async (state) => {
    const article = await (await createDraft({ ...input, body: '# Original snapshot', tags: ['original'] })).json()
    async function expectStableSlug() {
      expect((await pool.query('SELECT slug FROM articles WHERE id=$1', [article.id])).rows).toEqual([{ slug: article.slug }])
      const loaded = await fetch(`${writerUrl}/by-slug/${article.slug}`)
      expect(loaded.status).toBe(200)
      expect((await loaded.json()).id).toBe(article.id)
    }
    const publish = (revision: number) => fetch(`${writerUrl}/${article.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: revision }) })
    const first = await (await publish(0)).json()
    await expectStableSlug()
    const secondDraft = { title: 'Second saved title', body: '# Second snapshot', tags: ['second'] }
    expect((await fetch(`${writerUrl}/${article.id}/draft`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...secondDraft, expectedRevision: 1 }) })).status).toBe(200)
    await expectStableSlug()
    const second = await (await publish(2)).json()
    await expectStableSlug()
    let revision = 3
    if (state === 'unpublished') {
      expect((await unpublish(article.id, { expectedRevision: revision })).status).toBe(200)
      revision++
      await expectStableSlug()
    }
    const before = (await pool.query('SELECT * FROM articles')).rows[0]
    const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
    const publicList = await (await fetch(`${appUrl}/api/public/articles`)).json()
    const publicDetail = await fetch(`${appUrl}/api/public/articles/${article.slug}`)
    const publicBody = await publicDetail.json()
    let last
    let previousUpdatedAt = before.updated_at
    for (const [versionId, draft] of [[first.currentPublishedVersionId, article.draft], [second.currentPublishedVersionId, secondDraft], [second.currentPublishedVersionId, secondDraft]] as const) {
      const response = await restore(article.id, { expectedRevision: revision }, versionId)
      expect(response.status).toBe(200)
      revision++
      last = await response.json()
      await expectStableSlug()
      expect(last).toEqual({ ...second, status: state, revision, draft })
      const row = (await pool.query('SELECT * FROM articles')).rows[0]
      expect(row).toEqual({ ...before, draft_title: draft.title, draft_body: draft.body, draft_tags: draft.tags, revision, updated_at: expect.any(Date) })
      expect(row.updated_at.getTime()).toBeGreaterThan(previousUpdatedAt.getTime())
      previousUpdatedAt = row.updated_at
      expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows).toEqual(snapshots)
      expect(await (await fetch(`${appUrl}/api/public/articles`)).json()).toEqual(publicList)
      const currentPublic = await fetch(`${appUrl}/api/public/articles/${article.slug}`)
      expect(currentPublic.status).toBe(publicDetail.status)
      expect(await currentPublic.json()).toEqual(publicBody)
    }
    await restartApp()
    await expectStableSlug()
    expect(await (await fetch(`${writerUrl}/${article.id}`)).json()).toEqual(last)
    expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows).toEqual(snapshots)
  })

  it('compares revision before missing/wrong-owner snapshot eligibility and rejects invalid path IDs before lookup', async () => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    const other = await (await createDraft({ ...input, slug: 'other-restore', body: 'Private other snapshot' })).json()
    const published = await (await fetch(`${writerUrl}/${other.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0 }) })).json()
    const before = (await pool.query('SELECT * FROM articles ORDER BY id')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    const beforeState = await readState()
    for (const versionId of [randomUUID(), published.currentPublishedVersionId]) {
      for (const [revision, code] of [[0, 'SNAPSHOT_NOT_FOUND'], [1, 'STALE_REVISION']] as const) {
        const response = await restore(article.id, { expectedRevision: revision }, versionId)
        expect(response.status).toBe(code === 'SNAPSHOT_NOT_FOUND' ? 404 : 409)
        const error = await response.json()
        expect(error.data.code).toBe(code)
        expect(await readState()).toEqual(beforeState)
        expect(JSON.stringify(error)).not.toContain('Private other snapshot')
      }
    }
    for (const id of [article.id, randomUUID()]) {
      const invalid = await restore(id, { expectedRevision: 0 }, 'invalid')
      expect(invalid.status).toBe(400)
      expect((await invalid.json()).data.code).toBe('VALIDATION_ERROR')
    }
    expect((await pool.query('SELECT * FROM articles ORDER BY id')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
  })

  it('rolls back failed restore without changing draft/public/history and allows explicit recovery', async () => {
    const article = await (await createDraft({ ...input, body: 'Snapshot words', tags: ['saved'] })).json()
    const published = await (await fetch(`${writerUrl}/${article.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0 }) })).json()
    expect((await fetch(`${writerUrl}/${article.id}/draft`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'New draft', body: 'Keep this on failure', tags: ['new'], expectedRevision: 1 }) })).status).toBe(200)
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    const live = await (await fetch(`${appUrl}/api/public/articles/${article.slug}`)).json()
    await pool.query(`CREATE FUNCTION fail_test_restore() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private restore detail'; END; $$;
      CREATE TRIGGER fail_test_restore BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION fail_test_restore()`)
    try {
      const failed = await restore(article.id, { expectedRevision: 2 }, published.currentPublishedVersionId)
      expect(failed.status).toBe(500)
      expect(await failed.text()).not.toMatch(/private restore detail|UPDATE.*articles|stack|23505|55000/i)
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
      expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
      expect(await (await fetch(`${appUrl}/api/public/articles/${article.slug}`)).json()).toEqual(live)
    }
    finally { await pool.query('DROP TRIGGER fail_test_restore ON articles; DROP FUNCTION fail_test_restore()') }
    const recovered = await restore(article.id, { expectedRevision: 2 }, published.currentPublishedVersionId)
    expect(recovered.status).toBe(200)
    expect(await recovered.json()).toEqual({ ...published, revision: 3 })
  })
})


describe('delete eligible snapshot history', () => {

  it.each(['published', 'unpublished'])('deletes eligible history without changing %s article/public state or reusing version numbers', async (state) => {
    const article = await (await createDraft({ ...input, body: 'Published words', tags: ['saved'] })).json()
    const publish = (revision: number) => fetch(`${writerUrl}/${article.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: revision }) })
    const published = []
    let current = article
    for (let version = 1; version <= 3; version++) {
      if (version > 1) {
        const saved = await save(article.id, { ...current.draft, body: `Published words ${version}`, expectedRevision: current.revision })
        expect(saved.status).toBe(200)
        current = await saved.json()
      }
      const response = await publish(current.revision)
      expect(response.status).toBe(200)
      current = await response.json()
      published.push(current)
    }
    if (state === 'unpublished') {
      const hidden = await unpublish(article.id, { expectedRevision: current.revision })
      expect(hidden.status).toBe(200)
      current = await hidden.json()
    }
    const revision = current.revision
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
    const publicList = await (await fetch(`${appUrl}/api/public/articles`)).json()
    const publicDetail = await fetch(`${appUrl}/api/public/articles/${article.slug}`)
    const publicBody = await publicDetail.json()
    const target = published[1].currentPublishedVersionId
    const response = await deleteVersion(article.id, target)
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows).toEqual([snapshots[0], snapshots[2]])
    expect(await (await fetch(`${appUrl}/api/public/articles`)).json()).toEqual(publicList)
    const stillPublic = await fetch(`${appUrl}/api/public/articles/${article.slug}`)
    expect(stillPublic.status).toBe(publicDetail.status)
    expect(await stillPublic.json()).toEqual(publicBody)
    const inspected = await fetch(`${writerUrl}/${article.id}/versions/${target}`)
    expect(inspected.status).toBe(404)
    expect((await inspected.json()).data.code).toBe('SNAPSHOT_NOT_FOUND')
    const restored = await restore(article.id, { expectedRevision: revision }, target)
    expect(restored.status).toBe(404)
    expect((await restored.json()).data.code).toBe('SNAPSHOT_NOT_FOUND')
    const repeated = await deleteVersion(article.id, target)
    expect(repeated.status).toBe(404)
    expect((await repeated.json()).data.code).toBe('SNAPSHOT_NOT_FOUND')
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    await restartApp()
    expect((await pool.query('SELECT version_number FROM article_versions ORDER BY version_number')).rows).toEqual([{ version_number: 1 }, { version_number: 3 }])
    const savedResponse = await save(article.id, { ...current.draft, body: 'Publication after deletion', expectedRevision: revision })
    expect(savedResponse.status).toBe(200)
    const saved = await savedResponse.json()
    const republished = await publish(saved.revision)
    expect(republished.status).toBe(200)
    expect((await republished.json()).publishedAt).toBe(published[0].publishedAt)
    expect((await pool.query('SELECT version_number FROM article_versions ORDER BY version_number')).rows).toEqual([{ version_number: 1 }, { version_number: 3 }, { version_number: 4 }])
  })

  it.each(['published', 'unpublished'])('rejects deletion of the %s retained reference through the API without mutation', async (state) => {
    const article = await (await createDraft({ ...input, body: 'Protected words' })).json()
    const published = await (await fetch(`${writerUrl}/${article.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0 }) })).json()
    if (state === 'unpublished') expect((await unpublish(article.id, { expectedRevision: 1 })).status).toBe(200)
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    const response = await deleteVersion(article.id, published.currentPublishedVersionId)
    expect(response.status).toBe(409)
    expect((await response.json()).data.code).toBe('SNAPSHOT_PROTECTED')
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
  })

  it('validates both UUIDs before lookup and distinguishes missing articles from missing/wrong-owner snapshots', async () => {
    const article = await (await createDraft()).json()
    const other = await (await createDraft({ ...input, slug: 'delete-other', body: 'Private other content' })).json()
    const published = await (await fetch(`${writerUrl}/${other.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0 }) })).json()
    const missing = randomUUID()
    const before = (await pool.query('SELECT * FROM articles ORDER BY id')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions')).rows
    for (const [id, versionId, status, code] of [
      ['invalid', missing, 400, 'VALIDATION_ERROR'], [missing, 'invalid', 400, 'VALIDATION_ERROR'],
      [article.id, 'invalid', 400, 'VALIDATION_ERROR'], [missing, missing, 404, 'ARTICLE_NOT_FOUND'],
      [article.id, missing, 404, 'SNAPSHOT_NOT_FOUND'],
      [article.id, published.currentPublishedVersionId, 404, 'SNAPSHOT_NOT_FOUND'],
    ] as const) {
      const response = await deleteVersion(id, versionId)
      expect(response.status).toBe(status)
      const error = await response.json()
      expect(error.data.code).toBe(code)
      expect(JSON.stringify(error)).not.toContain('Private other content')
    }
    expect((await pool.query('SELECT * FROM articles ORDER BY id')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual(snapshots)
  })

  it('rolls back a failed deletion and permits an explicit retry without changing the article', async () => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    const versions = []
    let current = article
    for (let version = 1; version <= 2; version++) {
      if (version > 1) {
        const saved = await save(article.id, { ...current.draft, body: 'New retained version', expectedRevision: current.revision })
        expect(saved.status).toBe(200)
        current = await saved.json()
      }
      const response = await publish(article.id, { expectedRevision: current.revision })
      expect(response.status).toBe(200)
      current = await response.json()
      versions.push(current)
    }
    const before = (await pool.query('SELECT * FROM articles')).rows
    const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
    await pool.query(`CREATE FUNCTION fail_test_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private deletion detail'; END; $$;
      CREATE TRIGGER fail_test_delete BEFORE DELETE ON article_versions FOR EACH ROW EXECUTE FUNCTION fail_test_delete()`)
    try {
      const failed = await deleteVersion(article.id, versions[0].currentPublishedVersionId)
      expect(failed.status).toBe(500)
      expect(await failed.text()).not.toContain('private deletion detail')
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
      expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows).toEqual(snapshots)
    }
    finally { await pool.query('DROP TRIGGER fail_test_delete ON article_versions; DROP FUNCTION fail_test_delete()') }
    const recovered = await deleteVersion(article.id, versions[0].currentPublishedVersionId)
    expect(recovered.status).toBe(204)
    expect(await recovered.text()).toBe('')
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
  })
})


describe('coordinated lifecycle contention', () => {
  it.each([
    ['save', 'save'], ['publish', 'save'], ['save', 'publish'],
    ['unpublish', 'restore'], ['restore', 'unpublish'],
  ] as const)('serializes same-revision %s then %s with one success and one stale rejection', async (winner, loser) => {
    const article = await (await createDraft({ ...input, body: 'Snapshot words', tags: ['live'] })).json()
    const published = await (await publish(article.id, { expectedRevision: 0 })).json()
    const baseline = { title: 'Saved baseline', body: 'Baseline draft words', tags: ['draft'] }
    expect((await save(article.id, { ...baseline, expectedRevision: 1 })).status).toBe(200)
    const before = await readState()
    const candidate = (title: string) => ({ title, body: `${title} words`, tags: ['candidate'] })
    const actions = {
      save: (title: string) => save(article.id, { ...candidate(title), expectedRevision: 2 }),
      publish: () => publish(article.id, { expectedRevision: 2 }),
      unpublish: () => unpublish(article.id, { expectedRevision: 2 }),
      restore: () => restore(article.id, { expectedRevision: 2 }, published.currentPublishedVersionId),
    }
    const [success, stale] = await runContendingRequests(article.id,
      () => actions[winner]('Winning draft'), () => actions[loser]('Losing draft'))
    expect(success.status).toBe(200)
    const saved = await success.json()
    expect(stale.status).toBe(409)
    expect((await stale.json()).data.code).toBe('STALE_REVISION')
    const after = await readState()
    const draft = winner === 'save' ? candidate('Winning draft') : winner === 'restore' ? article.draft : baseline
    expect(saved).toEqual({
      ...published, draft, revision: 3, status: winner === 'unpublish' ? 'unpublished' : 'published',
      currentPublishedVersionId: winner === 'publish' ? expect.any(String) : published.currentPublishedVersionId,
    })
    expect(after.articles).toEqual([{
      ...before.articles[0], draft_title: draft.title, draft_body: draft.body, draft_tags: draft.tags,
      revision: 3, status: saved.status, current_published_version_id: saved.currentPublishedVersionId,
      next_version_number: winner === 'publish' ? 3 : 2, updated_at: expect.any(Date),
    }])
    expect(after.articles[0].updated_at.getTime()).toBeGreaterThan(before.articles[0].updated_at.getTime())
    expect(after.versions.slice(0, 1)).toEqual(before.versions)
    if (winner === 'publish') {
      expect(after.versions).toHaveLength(2)
      expect(after.versions[1]).toEqual({
        id: saved.currentPublishedVersionId, article_id: article.id, version_number: 2,
        title: baseline.title, body: baseline.body, tags: baseline.tags, created_at: after.articles[0].updated_at,
      })
      expect(after.publicDetails).toEqual([{ status: 200, body: { ...baseline, slug: article.slug, publishedAt: published.publishedAt } }])
      expect(after.publicList).toEqual([{ slug: article.slug, title: baseline.title, tags: baseline.tags, publishedAt: published.publishedAt }])
    }
    else {
      expect(after.versions).toEqual(before.versions)
      if (winner === 'unpublish') {
        expect(after.publicList).toEqual([])
        expect(after.publicDetails[0].status).toBe(404)
        expect(after.publicDetails[0].body.data.code).toBe('ARTICLE_NOT_FOUND')
      }
      else {
        expect(after.publicList).toEqual(before.publicList)
        expect(after.publicDetails).toEqual(before.publicDetails)
      }
    }
  })


  it.each([true, false])('serializes publish/delete in both orders (publish first: %s)', async (publishFirst) => {
    const article = await (await createDraft({ ...input, body: 'Original snapshot', tags: ['old'] })).json()
    const first = await (await publish(article.id, { expectedRevision: 0 })).json()
    const draft = { title: 'Next publication', body: 'New live words', tags: ['next'] }
    expect((await save(article.id, { ...draft, expectedRevision: 1 })).status).toBe(200)
    const before = await readState()
    const publishing = () => publish(article.id, { expectedRevision: 2 })
    const deleting = () => deleteVersion(article.id, first.currentPublishedVersionId)
    const responses = await runContendingRequests(article.id,
      publishFirst ? publishing : deleting, publishFirst ? deleting : publishing)
    const publication = responses[publishFirst ? 0 : 1]
    const deletion = responses[publishFirst ? 1 : 0]
    expect(publication.status).toBe(200)
    const published = await publication.json()
    expect(deletion.status).toBe(publishFirst ? 204 : 409)
    if (publishFirst) expect(await deletion.text()).toBe('')
    else expect((await deletion.json()).data.code).toBe('SNAPSHOT_PROTECTED')
    expect(published).toEqual({ ...first, draft, revision: 3, currentPublishedVersionId: expect.any(String) })
    const after = await readState()
    expect(after.articles).toEqual([{
      ...before.articles[0], revision: 3, next_version_number: 3,
      current_published_version_id: published.currentPublishedVersionId, updated_at: expect.any(Date),
    }])
    expect(after.articles[0].updated_at.getTime()).toBeGreaterThan(before.articles[0].updated_at.getTime())
    expect(after.versions.filter(version => version.id === first.currentPublishedVersionId)).toEqual(publishFirst ? [] : before.versions)
    expect(after.versions).toHaveLength(publishFirst ? 1 : 2)
    expect(after.versions.at(-1)).toEqual({
      id: published.currentPublishedVersionId, article_id: article.id, version_number: 2,
      title: draft.title, body: draft.body, tags: draft.tags, created_at: after.articles[0].updated_at,
    })
    expect(after.publicDetails).toEqual([{ status: 200, body: { ...draft, slug: article.slug, publishedAt: first.publishedAt } }])
    expect(after.publicList).toEqual([{ slug: article.slug, title: draft.title, tags: draft.tags, publishedAt: first.publishedAt }])
  })

  it.each([true, false])('serializes restore/delete in both orders (restore first: %s)', async (restoreFirst) => {
    const article = await (await createDraft({ ...input, body: 'Historical words', tags: ['historical'] })).json()
    const first = await (await publish(article.id, { expectedRevision: 0 })).json()
    expect((await save(article.id, { title: 'Live title', body: 'Live words', tags: ['live'], expectedRevision: 1 })).status).toBe(200)
    const live = await (await publish(article.id, { expectedRevision: 2 })).json()
    expect((await save(article.id, { title: 'Local title', body: 'Local words', tags: ['local'], expectedRevision: 3 })).status).toBe(200)
    const before = await readState()
    const restoring = () => restore(article.id, { expectedRevision: 4 }, first.currentPublishedVersionId)
    const deleting = () => deleteVersion(article.id, first.currentPublishedVersionId)
    const responses = await runContendingRequests(article.id,
      restoreFirst ? restoring : deleting, restoreFirst ? deleting : restoring)
    const restoration = responses[restoreFirst ? 0 : 1]
    const deletion = responses[restoreFirst ? 1 : 0]
    expect(deletion.status).toBe(204)
    expect(await deletion.text()).toBe('')
    expect(restoration.status).toBe(restoreFirst ? 200 : 404)
    if (restoreFirst) {
      expect(await restoration.json()).toEqual({ ...live, draft: article.draft, revision: 5 })
    }
    else expect((await restoration.json()).data.code).toBe('SNAPSHOT_NOT_FOUND')
    const after = await readState()
    expect(after.articles).toEqual(restoreFirst ? [{
      ...before.articles[0], draft_title: article.draft.title, draft_body: article.draft.body,
      draft_tags: article.draft.tags, revision: 5, updated_at: expect.any(Date),
    }] : before.articles)
    if (restoreFirst) expect(after.articles[0].updated_at.getTime()).toBeGreaterThan(before.articles[0].updated_at.getTime())
    expect(after.versions).toEqual(before.versions.filter(version => version.id !== first.currentPublishedVersionId))
    expect(after.versions).toHaveLength(1)
    expect(after.versions[0].id).toBe(live.currentPublishedVersionId)
    expect(after.publicList).toEqual(before.publicList)
    expect(after.publicDetails).toEqual(before.publicDetails)
  })
})
