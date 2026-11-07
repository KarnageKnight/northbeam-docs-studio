import { createError, defineEventHandler, getRouterParam } from 'nuxt/server'
import { getWriterArticle } from '../../../../services/articles/queries'
import { toApiError } from '../../../../utils/api-errors'
import { articleIdSchema } from '../../../../validation/articles'

export default defineEventHandler(async (event) => {
  let id: string
  try {
    id = articleIdSchema.parse(getRouterParam(event, 'articleId'))
  }
  catch (error) {
    throw toApiError(error)
  }
  const article = await getWriterArticle(id)
  if (!article) throw createError({ status: 404, statusText: 'Article not found', data: { code: 'ARTICLE_NOT_FOUND' } })
  return article
})
