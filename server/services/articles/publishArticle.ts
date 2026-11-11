import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { articles, articleVersions } from '../../db/schema'
import { publishContentSchema } from '../../validation/articles'
import { samePublicationContent } from './samePublicationContent'
import { toWriterArticle } from './toWriterArticle'
import { withArticleTransaction } from './withArticleTransaction'

export function publishArticle(articleId: string, expectedRevision: number) {
  return withArticleTransaction(articleId, expectedRevision, async (transaction, article) => {
    const content = publishContentSchema.parse({ title: article.draftTitle, body: article.draftBody })
    if (article.status === 'draft') {
      if (article.currentPublishedVersionId !== null || article.publishedAt !== null) {
        throw new Error('Invalid draft publication state.')
      }
    }
    else {
      if (!article.currentPublishedVersionId || !article.publishedAt) {
        throw new Error('Missing retained publication state.')
      }
      const [snapshot] = await transaction.select().from(articleVersions).where(and(
        eq(articleVersions.id, article.currentPublishedVersionId), eq(articleVersions.articleId, articleId),
      ))
      if (!snapshot) throw new Error('Missing owned publication snapshot.')
      if (samePublicationContent({ ...content, tags: article.draftTags }, snapshot)) {
        if (article.status === 'published') return toWriterArticle(article)
        const [reactivated] = await transaction.update(articles).set({
          status: 'published', revision: article.revision + 1, updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(articles.id, articleId)).returning()
        if (!reactivated) throw new Error('Publication reactivation returned no row.')
        return toWriterArticle(reactivated)
      }
    }
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
