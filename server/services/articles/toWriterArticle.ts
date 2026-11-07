import type { articles } from '../../db/schema'
import type { WriterArticle } from '../../../shared/types/articles'

export function toWriterArticle(article: typeof articles.$inferSelect): WriterArticle {
  return {
    id: article.id,
    slug: article.slug,
    status: article.status as WriterArticle['status'],
    revision: article.revision,
    draft: { title: article.draftTitle, body: article.draftBody, tags: article.draftTags },
    publishedAt: article.publishedAt?.toISOString() ?? null,
    currentPublishedVersionId: article.currentPublishedVersionId,
  }
}
