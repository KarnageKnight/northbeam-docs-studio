import { eq } from 'drizzle-orm'
import { createError } from 'nuxt/server'
import { db } from '../../db/client'
import { articles } from '../../db/schema'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export function withArticleTransaction<T>(
  articleId: string,
  expectedRevision: number,
  operation: (transaction: Transaction, article: typeof articles.$inferSelect) => Promise<T>,
) {
  return db.transaction(async (transaction) => {
    const [article] = await transaction.select().from(articles).where(eq(articles.id, articleId)).for('update')
    if (!article) throw createError({ status: 404, statusText: 'Article not found', data: { code: 'ARTICLE_NOT_FOUND' } })
    if (article.revision !== expectedRevision) {
      throw createError({ status: 409, statusText: 'Article changed', data: { code: 'STALE_REVISION' } })
    }
    return operation(transaction, article)
  }, { isolationLevel: 'read committed' })
}
