import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true,
    nodeTsConfig: {
      compilerOptions: { types: ['node'] },
      include: ['../drizzle.config.ts'],
    },
  },
  vite: { plugins: [tailwindcss()] },
})
