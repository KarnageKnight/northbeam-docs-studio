import { eq } from 'drizzle-orm'
import type { WriterSummary } from '../../../shared/types/articles'
import { db } from '../../db/client'
import { articles } from '../../db/schema'
import { toWriterArticle } from './toWriterArticle'

export async function listWriterArticles(): Promise<WriterSummary[]> {
  const rows = await db.select({
    id: articles.id, slug: articles.slug, title: articles.draftTitle, status: articles.status,
  }).from(articles)
  return rows.map((row) => ({ ...row, status: row.status as WriterSummary['status'] }))
}

export async function getWriterArticle(id: string) {
  const [article] = await db.select().from(articles).where(eq(articles.id, id))
  return article ? toWriterArticle(article) : null
}
