import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../server/db/client'
import { articles, articleVersions } from '../../server/db/schema'
import { appUrl, pool, resetDatabase, startApp, stopApp } from './helpers'

async function createArticle() {
  const [article] = await db.insert(articles).values({
    id: randomUUID(), slug: randomUUID(), draftTitle: 'Draft title',
  }).returning()
  if (!article) throw new Error('Fixture article was not inserted.')
  return article
}

async function createSnapshot(articleId: string, versionNumber = 1) {
  const [snapshot] = await db.insert(articleVersions).values({
    id: randomUUID(), articleId, versionNumber,
    title: 'Saved title', body: 'Saved body', tags: ['guide'],
  }).returning()
  if (!snapshot) throw new Error('Fixture snapshot was not inserted.')
  return snapshot
}

beforeAll(async () => {
  await startApp()
  const { rows } = await pool.query('SELECT current_database() AS name')
  expect(rows[0].name).toBe('northbeam_test')
  const counts = await pool.query('SELECT (SELECT count(*) FROM articles) + (SELECT count(*) FROM article_versions) AS count')
  expect(Number(counts.rows[0].count)).toBe(0)
})

beforeEach(resetDatabase)
afterAll(async () => { await stopApp(); await resetDatabase(); await pool.end() })

describe('migrated PostgreSQL foundation', () => {
  it('serves the production shell over HTTP', async () => {
    const response = await fetch(appUrl)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Northbeam Docs Studio')
  })

  it('persists typed draft defaults and database audit timestamps', async () => {
    const article = await createArticle()
    expect(article).toMatchObject({
      status: 'draft', draftBody: '', draftTags: [], revision: 0, nextVersionNumber: 1,
      currentPublishedVersionId: null, publishedAt: null,
    })
    expect(article.createdAt).toBeInstanceOf(Date)
    expect(article.updatedAt).toEqual(article.createdAt)
  })

  it('rejects duplicate slugs with the named uniqueness constraint', async () => {
    const article = await createArticle()
    await expect(pool.query(
      'INSERT INTO articles (id, slug, draft_title) VALUES ($1, $2, $3)',
      [randomUUID(), article.slug, 'Other title'],
    )).rejects.toMatchObject({ code: '23505', constraint: 'articles_slug_unique' })
  })

  it('rejects unknown publication statuses', async () => {
    const article = await createArticle()
    await expect(pool.query('UPDATE articles SET status = $1 WHERE id = $2', ['invalid', article.id]))
      .rejects.toMatchObject({ code: '23514', constraint: 'articles_status_check' })
  })

  it.each(['id', 'slug', 'status', 'draft_title', 'draft_body', 'draft_tags', 'revision', 'next_version_number', 'created_at', 'updated_at'])(
    'rejects NULL article %s', async (column) => {
      const article = await createArticle()
      await expect(pool.query(`UPDATE articles SET ${column} = NULL WHERE id = $1`, [article.id]))
        .rejects.toMatchObject({ code: '23502' })
    },
  )

  it.each(['id', 'article_id', 'version_number', 'title', 'body', 'tags', 'created_at'])(
    'rejects NULL snapshot %s', async (column) => {
      const article = await createArticle()
      const values: Record<string, unknown> = {
        id: randomUUID(), article_id: article.id, version_number: 1,
        title: 'Title', body: 'Body', tags: [], created_at: new Date(),
      }
      values[column] = null
      await expect(pool.query(
        'INSERT INTO article_versions (id, article_id, version_number, title, body, tags, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        Object.values(values),
      )).rejects.toMatchObject({ code: '23502' })
    },
  )

  it('requires supplied snapshot content and an existing owning article', async () => {
    const article = await createArticle()
    await expect(pool.query(
      'INSERT INTO article_versions (id, article_id, version_number) VALUES ($1, $2, 1)',
      [randomUUID(), article.id],
    )).rejects.toMatchObject({ code: '23502' })
    await expect(pool.query(
      'INSERT INTO article_versions (id, article_id, version_number, title, body, tags) VALUES ($1, $2, 1, $3, $4, $5)',
      [randomUUID(), randomUUID(), 'Title', 'Body', []],
    )).rejects.toMatchObject({ code: '23503', constraint: 'article_versions_article_fk' })
  })

  it('allows the same version number across articles but rejects duplicates within one', async () => {
    const first = await createArticle()
    const second = await createArticle()
    await createSnapshot(first.id)
    await createSnapshot(second.id)
    await expect(pool.query(
      'INSERT INTO article_versions (id, article_id, version_number, title, body, tags) VALUES ($1, $2, 1, $3, $4, $5)',
      [randomUUID(), first.id, 'Title', 'Body', []],
    )).rejects.toMatchObject({ code: '23505', constraint: 'article_versions_number_unique' })
  })

  it('rejects a current reference to another article’s snapshot', async () => {
    const first = await createArticle()
    const second = await createArticle()
    const snapshot = await createSnapshot(second.id)
    await expect(pool.query(
      'UPDATE articles SET current_published_version_id = $1 WHERE id = $2', [snapshot.id, first.id],
    )).rejects.toMatchObject({ code: '23503', constraint: 'articles_published_version_fk' })
  })

  it.each(['published', 'unpublished'])('protects the referenced snapshot while %s', async (status) => {
    const article = await createArticle()
    const snapshot = await createSnapshot(article.id)
    await pool.query(
      'UPDATE articles SET status = $1, current_published_version_id = $2, published_at = CURRENT_TIMESTAMP WHERE id = $3',
      [status, snapshot.id, article.id],
    )
    await expect(pool.query('DELETE FROM article_versions WHERE id = $1', [snapshot.id]))
      .rejects.toMatchObject({ code: '23001' })
  })

  it('allows deletion of an unreferenced snapshot without changing the article', async () => {
    const article = await createArticle()
    const snapshot = await createSnapshot(article.id)
    await db.delete(articleVersions).where(eq(articleVersions.id, snapshot.id))
    expect(await db.select().from(articleVersions)).toEqual([])
    expect(await db.select().from(articles)).toEqual([article])
  })

  it.each(['title', 'body', 'tags', 'created_at'])('rejects even a no-op snapshot update to %s', async (column) => {
    const article = await createArticle()
    const snapshot = await createSnapshot(article.id)
    await expect(pool.query(`UPDATE article_versions SET ${column} = ${column} WHERE id = $1`, [snapshot.id]))
      .rejects.toMatchObject({ code: '55000' })
    expect(await db.select().from(articleVersions)).toEqual([snapshot])
  })

  it('resets application data while preserving the migration journal and constraints', async () => {
    const before = await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')
    const article = await createArticle()
    const snapshot = await createSnapshot(article.id)
    await pool.query('UPDATE articles SET current_published_version_id = $1 WHERE id = $2', [snapshot.id, article.id])
    await resetDatabase()
    expect(await db.select().from(articles)).toEqual([])
    expect(await db.select().from(articleVersions)).toEqual([])
    expect((await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows).toEqual(before.rows)
    expect(before.rows).toHaveLength(2)
  })
})
