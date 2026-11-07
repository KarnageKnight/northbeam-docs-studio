import { defineEventHandler, getRouterParam, readBody } from 'nuxt/server'
import { saveDraft } from '../../../../services/articles/saveDraft'
import { toApiError, validationError } from '../../../../utils/api-errors'
import { articleIdSchema, saveDraftSchema } from '../../../../validation/articles'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => { throw validationError() })
  try {
    const id = articleIdSchema.parse(getRouterParam(event, 'articleId'))
    return await saveDraft(id, saveDraftSchema.parse(body))
  }
  catch (error) {
    throw toApiError(error)
  }
})
