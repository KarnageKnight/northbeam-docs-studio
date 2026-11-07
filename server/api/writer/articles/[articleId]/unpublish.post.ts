import { defineEventHandler, getRouterParam, readBody } from 'nuxt/server'
import { unpublishArticle } from '../../../../services/articles/unpublishArticle'
import { toApiError, validationError } from '../../../../utils/api-errors'
import { articleIdSchema, unpublishArticleSchema } from '../../../../validation/articles'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => { throw validationError() })
  try {
    const id = articleIdSchema.parse(getRouterParam(event, 'articleId'))
    const input = unpublishArticleSchema.parse(body)
    return await unpublishArticle(id, input.expectedRevision)
  }
  catch (error) {
    throw toApiError(error)
  }
})
