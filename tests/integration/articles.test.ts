import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { appUrl, pool, resetDatabase, restartApp, startApp, stopApp, waitForBlockedQuery } from './helpers'

const writerUrl = `${appUrl}/api/writer/articles`
const input = { title: '  Finding inspiration  ', slug: ' Finding-Inspiration ' }

function createDraft(body: unknown = input) {
  return fetch(writerUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

function unpublish(id: string, body: unknown) {
  return fetch(`${writerUrl}/${id}/unpublish`, {
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
    const page = await fetch(`${appUrl}/writer/articles/${id}`)
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
    expect((await pool.query('SELECT * FROM articles ORDER BY id')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })
})

describe('save a complete draft', () => {
  const draft = { title: '  Updated title  ', body: '  # Updated words\n', tags: [' Ideas ', 'ideas', 'life'] }
  const save = (id: string, body: unknown) => fetch(`${writerUrl}/${id}/draft`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })

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

  it('advances unchanged saves and rejects stale saves without changing any data', async () => {
    const article = await (await createDraft()).json()
    const response = await save(article.id, { ...article.draft, expectedRevision: 0 })
    expect(response.status).toBe(200)
    expect((await response.json()).revision).toBe(1)
    const before = (await pool.query('SELECT * FROM articles')).rows
    const stale = await save(article.id, { ...draft, expectedRevision: 0 })
    expect(stale.status).toBe(409)
    expect((await stale.json()).data.code).toBe('STALE_REVISION')
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
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
      expect(await failed.text()).not.toContain('private save detail')
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    }
    finally { await pool.query('DROP TRIGGER fail_test_save ON articles; DROP FUNCTION fail_test_save()') }
    expect((await save(article.id, { ...draft, expectedRevision: 0 })).status).toBe(200)
  })
})


describe('publish saved content', () => {
  const publish = (id: string, body: unknown) => fetch(`${writerUrl}/${id}/publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })

  it('atomically publishes saved content, keeps immutable snapshots, and preserves the first date on republish', async () => {
    const article = await (await createDraft({ ...input, body: '  # Saved words\n', tags: [' Ideas ', 'life'] })).json()
    const before = (await pool.query('SELECT * FROM articles')).rows[0]
    let publishedAt: string | null = null
    let previousSnapshots: unknown[] = []
    for (let revision = 0; revision < 2; revision++) {
      const response = await publish(article.id, { expectedRevision: revision })
      expect(response.status).toBe(200)
      const published = await response.json()
      expect(published).toEqual({ ...article, status: 'published', revision: revision + 1,
        currentPublishedVersionId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
        publishedAt: publishedAt ?? expect.any(String) })
      publishedAt ??= published.publishedAt
      const stored = (await pool.query('SELECT * FROM articles')).rows[0]
      const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
      expect(snapshots).toHaveLength(revision + 1)
      expect(snapshots.slice(0, revision)).toEqual(previousSnapshots)
      const latest = snapshots[revision]
      expect(latest).toEqual({ id: published.currentPublishedVersionId, article_id: article.id,
        version_number: revision + 1, title: article.draft.title, body: article.draft.body,
        tags: article.draft.tags, created_at: expect.any(Date) })
      expect(stored).toEqual({ ...before, status: 'published', revision: revision + 1,
        current_published_version_id: latest.id, next_version_number: revision + 2,
        published_at: new Date(published.publishedAt), updated_at: latest.created_at })
      expect(stored.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime())
      previousSnapshots = snapshots
    }
    await restartApp()
    const reopened = await (await fetch(`${writerUrl}/${article.id}`)).json()
    expect(reopened).toMatchObject({ revision: 2, publishedAt })
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
    const invalid = await publish(article.id, { expectedRevision: 0 })
    expect(invalid.status).toBe(400)
    expect((await invalid.json()).data).toMatchObject({ code: 'VALIDATION_ERROR', fieldErrors: { body: expect.any(Array) } })
    const stale = await publish(article.id, { expectedRevision: 1 })
    expect(stale.status).toBe(409)
    expect((await stale.json()).data.code).toBe('STALE_REVISION')
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

  it.each([{}, { expectedRevision: null }, { expectedRevision: '0' }, { expectedRevision: -1 }, { expectedRevision: 0.5 }, { expectedRevision: Number.MAX_SAFE_INTEGER + 1 }, { expectedRevision: 0, title: 'Browser text' }])(
    'rejects invalid publication action payloads before lookup (case %#)', async (body) => {
      for (const action of [publish, unpublish]) {
        const response = await action(randomUUID(), body)
        expect(response.status).toBe(400)
        expect((await response.json()).data.code).toBe('VALIDATION_ERROR')
      }
      expect((await pool.query('SELECT * FROM articles')).rows).toEqual([])
      expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
    },
  )

  it('distinguishes malformed/missing IDs, validates JSON, and rejects safe but stale revisions without mutation', async () => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    const before = (await pool.query('SELECT * FROM articles')).rows
    for (const [id, revision, status, code] of [
      ['invalid', 0, 400, 'VALIDATION_ERROR'], [randomUUID(), 0, 404, 'ARTICLE_NOT_FOUND'],
      [article.id, Number.MAX_SAFE_INTEGER, 409, 'STALE_REVISION'],
    ] as const) {
      for (const action of [publish, unpublish]) {
        const response = await action(id, { expectedRevision: revision })
        expect(response.status).toBe(status)
        expect((await response.json()).data.code).toBe(code)
      }
    }
    for (const action of ['publish', 'unpublish']) {
      const malformed = await fetch(`${writerUrl}/${article.id}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
      expect(malformed.status).toBe(400)
      expect((await malformed.json()).data.code).toBe('VALIDATION_ERROR')
    }
    expect((await pool.query('SELECT * FROM articles')).rows).toEqual(before)
    expect((await pool.query('SELECT * FROM article_versions')).rows).toEqual([])
  })

  it.each([false, true])('rolls back publication after snapshot insertion (previously published: %s)', async (alreadyPublished) => {
    const article = await (await createDraft({ ...input, body: 'Saved words' })).json()
    let revision = 0
    if (alreadyPublished) {
      expect((await publish(article.id, { expectedRevision: 0 })).status).toBe(200)
      revision = 1
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

  it('republishes an unpublished article with its retained date and advances only that article counter', async () => {
    const article = await (await createDraft({ ...input, body: 'Words' })).json()
    const first = await (await publish(article.id, { expectedRevision: 0 })).json()
    expect((await unpublish(article.id, { expectedRevision: 1 })).status).toBe(200)
    const response = await publish(article.id, { expectedRevision: 2 })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'published', revision: 3, publishedAt: first.publishedAt })
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
    const first = await (await publish(0)).json()
    const published = await (await publish(1)).json()
    const before = (await pool.query('SELECT * FROM articles')).rows[0]
    const snapshots = (await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows
    const response = await unpublish(article.id, { expectedRevision: 2 })
    expect(response.status).toBe(200)
    const hidden = await response.json()
    expect(hidden).toEqual({ ...published, status: 'unpublished', revision: 3 })
    const after = (await pool.query('SELECT * FROM articles')).rows[0]
    expect(after).toEqual({ ...before, status: 'unpublished', revision: 3, updated_at: expect.any(Date) })
    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime())
    expect((await pool.query('SELECT * FROM article_versions ORDER BY version_number')).rows).toEqual(snapshots)
    expect(await (await fetch(`${appUrl}/api/public/articles`)).json()).toEqual([])
    expect((await fetch(`${appUrl}/api/public/articles/${article.slug}`)).status).toBe(404)
    expect((await fetch(`${appUrl}/articles/${article.slug}`)).status).toBe(404)
    await restartApp()
    expect(await (await fetch(`${writerUrl}/${article.id}`)).json()).toEqual(hidden)
    expect((await pool.query('SELECT * FROM articles')).rows[0]).toEqual(after)
    const republished = await publish(3)
    expect(republished.status).toBe(200)
    expect(await republished.json()).toMatchObject({ status: 'published', revision: 4, publishedAt: first.publishedAt })
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
    for (const [token, code] of [[revision, 'INVALID_PUBLICATION_STATE'], [revision + 1, 'STALE_REVISION']] as const) {
      const response = await unpublish(article.id, { expectedRevision: token })
      expect(response.status).toBe(409)
      expect((await response.json()).data.code).toBe(code)
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
      expect(await failed.text()).not.toContain('private unpublish detail')
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
