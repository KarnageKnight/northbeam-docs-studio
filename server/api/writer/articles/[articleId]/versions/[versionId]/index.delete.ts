import { defineEventHandler, getRouterParam, setResponseStatus } from 'nuxt/server'
import { deleteSnapshot } from '../../../../../../services/articles/deleteSnapshot'
import { toApiError } from '../../../../../../utils/api-errors'
import { articleIdSchema } from '../../../../../../validation/articles'

export default defineEventHandler(async (event) => {
  try {
    const articleId = articleIdSchema.parse(getRouterParam(event, 'articleId'))
    const versionId = articleIdSchema.parse(getRouterParam(event, 'versionId'))
    await deleteSnapshot(articleId, versionId)
    setResponseStatus(event, 204)
    return null
  }
  catch (error) {
    throw toApiError(error)
  }
})
