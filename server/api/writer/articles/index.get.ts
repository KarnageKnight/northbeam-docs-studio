import { defineEventHandler } from 'nuxt/server'
import { listWriterArticles } from '../../../services/articles/queries'

export default defineEventHandler(() => listWriterArticles())
