import { defineEventHandler, getRouterParam, readBody } from 'nuxt/server'
import { publishArticle } from '../../../../services/articles/publishArticle'
import { toApiError, validationError } from '../../../../utils/api-errors'
import { articleIdSchema, publishArticleSchema } from '../../../../validation/articles'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => { throw validationError() })
  try {
    const id = articleIdSchema.parse(getRouterParam(event, 'articleId'))
    const input = publishArticleSchema.parse(body)
    return await publishArticle(id, input.expectedRevision)
  }
  catch (error) {
    throw toApiError(error)
  }
})
