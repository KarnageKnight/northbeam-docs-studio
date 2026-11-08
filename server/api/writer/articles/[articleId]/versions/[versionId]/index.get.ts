import { createError, defineEventHandler, getRouterParam } from 'nuxt/server'
import { getArticleVersion, getWriterArticle } from '../../../../../../services/articles/queries'
import { toApiError } from '../../../../../../utils/api-errors'
import { articleIdSchema } from '../../../../../../validation/articles'

export default defineEventHandler(async (event) => {
  let articleId: string
  let versionId: string
  try {
    articleId = articleIdSchema.parse(getRouterParam(event, 'articleId'))
    versionId = articleIdSchema.parse(getRouterParam(event, 'versionId'))
  }
  catch (error) {
    throw toApiError(error)
  }
  if (!await getWriterArticle(articleId)) {
    throw createError({ status: 404, statusText: 'Article not found', data: { code: 'ARTICLE_NOT_FOUND' } })
  }
  const version = await getArticleVersion(articleId, versionId)
  if (!version) throw createError({ status: 404, statusText: 'Snapshot not found', data: { code: 'SNAPSHOT_NOT_FOUND' } })
  return version
})
