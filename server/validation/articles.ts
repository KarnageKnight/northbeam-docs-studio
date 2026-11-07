import { z } from 'zod'

export const titleSchema = z.string()
  .refine((title) => title.trim().length > 0, 'Title is required.')
  .refine((title) => Array.from(title).length <= 200, 'Title must be 200 characters or fewer.')

const slugCharacters = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const articleIdSchema = z.guid()
const slugSchema = z.string().trim().toLowerCase().min(1).max(100)
  .regex(slugCharacters, 'Use letters, numbers, and single hyphens between words.')
const bodySchema = z.string()
  .refine((body) => Array.from(body).length <= 100000, 'Body must be 100,000 characters or fewer.')
const tagsSchema = z.array(z.string()).transform((tags) => [...new Set(
  tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
)]).pipe(z.array(z.string().max(30).regex(slugCharacters, 'Use letters, numbers, and single hyphens in tags.')).max(10))

export const createArticleSchema = z.strictObject({
  title: titleSchema,
  slug: slugSchema,
  body: bodySchema.nullish().transform((body) => body ?? ''),
  tags: tagsSchema.nullish().transform((tags) => tags ?? []),
})
