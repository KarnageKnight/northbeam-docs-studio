import { and, eq } from 'drizzle-orm'
import { createError } from 'nuxt/server'
import { db } from '../../db/client'
import { articles, articleVersions } from '../../db/schema'

export function deleteSnapshot(articleId: string, versionId: string) {
  return db.transaction(async (transaction) => {
    const [article] = await transaction.select({ currentPublishedVersionId: articles.currentPublishedVersionId })
      .from(articles).where(eq(articles.id, articleId)).for('update')
    if (!article) throw createError({ status: 404, statusText: 'Article not found', data: { code: 'ARTICLE_NOT_FOUND' } })
    const [version] = await transaction.select({ id: articleVersions.id }).from(articleVersions)
      .where(and(eq(articleVersions.articleId, articleId), eq(articleVersions.id, versionId)))
    if (!version) throw createError({ status: 404, statusText: 'Snapshot not found', data: { code: 'SNAPSHOT_NOT_FOUND' } })
    if (article.currentPublishedVersionId === versionId) {
      throw createError({ status: 409, statusText: 'Snapshot is protected', data: { code: 'SNAPSHOT_PROTECTED' } })
    }
    await transaction.delete(articleVersions)
      .where(and(eq(articleVersions.articleId, articleId), eq(articleVersions.id, versionId)))
  }, { isolationLevel: 'read committed' })
}
