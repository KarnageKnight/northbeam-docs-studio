import { eq, sql } from 'drizzle-orm'
import { createError } from 'nuxt/server'
import { articles } from '../../db/schema'
import { toWriterArticle } from './toWriterArticle'
import { withArticleTransaction } from './withArticleTransaction'

export function unpublishArticle(articleId: string, expectedRevision: number) {
  return withArticleTransaction(articleId, expectedRevision, async (transaction, article) => {
    if (article.status !== 'published') {
      throw createError({ status: 409, statusText: 'Article is not published', data: { code: 'INVALID_PUBLICATION_STATE' } })
    }
    const [unpublished] = await transaction.update(articles).set({
      status: 'unpublished', revision: article.revision + 1, updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(articles.id, articleId)).returning()
    if (!unpublished) throw new Error('Unpublish update returned no row.')
    return toWriterArticle(unpublished)
  })
}
