import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import { db } from '../../db/client'
import { articles } from '../../db/schema'
import type { createArticleSchema } from '../../validation/articles'
import { toWriterArticle } from './toWriterArticle'

export async function createArticle(input: z.infer<typeof createArticleSchema>) {
  const [article] = await db.insert(articles).values({
    id: randomUUID(), slug: input.slug, draftTitle: input.title,
    draftBody: input.body, draftTags: input.tags,
  }).returning()
  if (!article) throw new Error('Article insertion returned no row.')
  return toWriterArticle(article)
}
