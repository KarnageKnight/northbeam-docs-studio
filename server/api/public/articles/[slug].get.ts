import { createError, defineEventHandler, getRouterParam } from 'nuxt/server'
import { getPublicArticle } from '../../../services/articles/queries'

export default defineEventHandler(async (event) => {
  const article = await getPublicArticle(getRouterParam(event, 'slug') ?? '')
  if (!article) throw createError({ status: 404, statusText: 'Article not found', data: { code: 'ARTICLE_NOT_FOUND' } })
  return article
})
