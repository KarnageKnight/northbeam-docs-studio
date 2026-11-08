import { defineEventHandler, getRouterParam, readBody } from 'nuxt/server'
import { restoreDraft } from '../../../../../../services/articles/restoreDraft'
import { toApiError, validationError } from '../../../../../../utils/api-errors'
import { articleIdSchema, restoreDraftSchema } from '../../../../../../validation/articles'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => { throw validationError() })
  try {
    const articleId = articleIdSchema.parse(getRouterParam(event, 'articleId'))
    const versionId = articleIdSchema.parse(getRouterParam(event, 'versionId'))
    const input = restoreDraftSchema.parse(body)
    return await restoreDraft(articleId, versionId, input.expectedRevision)
  }
  catch (error) {
    throw toApiError(error)
  }
})
