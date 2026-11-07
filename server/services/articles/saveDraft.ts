import { eq, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { articles } from '../../db/schema'
import type { saveDraftSchema } from '../../validation/articles'
import { toWriterArticle } from './toWriterArticle'
import { withArticleTransaction } from './withArticleTransaction'

export function saveDraft(articleId: string, input: z.infer<typeof saveDraftSchema>) {
  return withArticleTransaction(articleId, input.expectedRevision, async (transaction, article) => {
    const [saved] = await transaction.update(articles).set({
      draftTitle: input.title, draftBody: input.body, draftTags: input.tags,
      revision: article.revision + 1, updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(articles.id, articleId)).returning()
    if (!saved) throw new Error('Draft update returned no row.')
    return toWriterArticle(saved)
  })
}
