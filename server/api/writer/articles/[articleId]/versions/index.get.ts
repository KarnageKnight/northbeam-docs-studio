import { createError, defineEventHandler, getRouterParam } from 'nuxt/server'
import { getWriterArticle, listArticleVersions } from '../../../../../services/articles/queries'
import { toApiError } from '../../../../../utils/api-errors'
import { articleIdSchema } from '../../../../../validation/articles'

export default defineEventHandler(async (event) => {
  let articleId: string
  try {
    articleId = articleIdSchema.parse(getRouterParam(event, 'articleId'))
  }
  catch (error) {
    throw toApiError(error)
  }
  if (!await getWriterArticle(articleId)) {
    throw createError({ status: 404, statusText: 'Article not found', data: { code: 'ARTICLE_NOT_FOUND' } })
  }
  return listArticleVersions(articleId)
})
