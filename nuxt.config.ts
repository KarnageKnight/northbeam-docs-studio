import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  typescript: { strict: true },
  vite: { plugins: [tailwindcss()] },
})
