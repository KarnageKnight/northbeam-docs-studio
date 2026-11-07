import { z } from 'zod'

export const titleSchema = z.string()
  .refine((title) => title.trim().length > 0, 'Title is required.')
  .refine((title) => Array.from(title).length <= 200, 'Title must be 200 characters or fewer.')
