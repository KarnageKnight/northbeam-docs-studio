import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { articles, articleVersions } from '../../db/schema'
import { publishContentSchema } from '../../validation/articles'
import { toWriterArticle } from './toWriterArticle'
import { withArticleTransaction } from './withArticleTransaction'

export function publishArticle(articleId: string, expectedRevision: number) {
  return withArticleTransaction(articleId, expectedRevision, async (transaction, article) => {
    const content = publishContentSchema.parse({ title: article.draftTitle, body: article.draftBody })
    const versionId = randomUUID()
    await transaction.insert(articleVersions).values({
      id: versionId, articleId, versionNumber: article.nextVersionNumber,
      title: content.title, body: content.body, tags: article.draftTags,
    })
    const [published] = await transaction.update(articles).set({
      status: 'published', currentPublishedVersionId: versionId,
      nextVersionNumber: article.nextVersionNumber + 1, revision: article.revision + 1,
      publishedAt: article.publishedAt ?? sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(articles.id, articleId)).returning()
    if (!published) throw new Error('Publication update returned no row.')
    return toWriterArticle(published)
  })
}
