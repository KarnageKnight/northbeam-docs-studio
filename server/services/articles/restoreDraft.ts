import { and, eq, sql } from 'drizzle-orm'
import { createError } from 'nuxt/server'
import { articles, articleVersions } from '../../db/schema'
import { toWriterArticle } from './toWriterArticle'
import { withArticleTransaction } from './withArticleTransaction'

export function restoreDraft(articleId: string, versionId: string, expectedRevision: number) {
  return withArticleTransaction(articleId, expectedRevision, async (transaction, article) => {
    const [version] = await transaction.select().from(articleVersions)
      .where(and(eq(articleVersions.articleId, articleId), eq(articleVersions.id, versionId)))
    if (!version) throw createError({ status: 404, statusText: 'Snapshot not found', data: { code: 'SNAPSHOT_NOT_FOUND' } })
    const [restored] = await transaction.update(articles).set({
      draftTitle: version.title, draftBody: version.body, draftTags: version.tags,
      revision: article.revision + 1, updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(articles.id, articleId)).returning()
    if (!restored) throw new Error('Restore update returned no row.')
    return toWriterArticle(restored)
  })
}
