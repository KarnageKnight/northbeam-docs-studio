import { defineEventHandler, readBody, setResponseStatus } from 'nuxt/server'
import { createArticle } from '../../../services/articles/createArticle'
import { toApiError, validationError } from '../../../utils/api-errors'
import { createArticleSchema } from '../../../validation/articles'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => { throw validationError() })
  try {
    const article = await createArticle(createArticleSchema.parse(body))
    setResponseStatus(event, 201)
    return article
  }
  catch (error) {
    throw toApiError(error)
  }
})
