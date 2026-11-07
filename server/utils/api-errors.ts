import { DrizzleQueryError } from 'drizzle-orm'
import { createError } from 'nuxt/server'
import pg from 'pg'
import { z } from 'zod'

export function validationError(error?: z.ZodError) {
  return createError({
    status: 400,
    statusText: 'Invalid input',
    data: {
      code: 'VALIDATION_ERROR',
      ...(error ? { fieldErrors: z.flattenError(error).fieldErrors } : {}),
    },
  })
}

export function toApiError(error: unknown) {
  if (error instanceof z.ZodError) return validationError(error)
  const cause = error instanceof DrizzleQueryError ? error.cause : error
  if (cause instanceof pg.DatabaseError && cause.code === '23505' && cause.constraint === 'articles_slug_unique') {
    return createError({ status: 409, statusText: 'Slug already in use', data: { code: 'SLUG_CONFLICT' } })
  }
  throw error
}
