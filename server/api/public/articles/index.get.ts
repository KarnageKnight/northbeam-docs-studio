import { defineEventHandler } from 'nuxt/server'
import { listPublicArticles } from '../../../services/articles/queries'

export default defineEventHandler(() => listPublicArticles())
