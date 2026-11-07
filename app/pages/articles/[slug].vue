<script setup lang="ts">
import type { PublicDetail } from '../../../shared/types/articles'

definePageMeta({ key: route => String(route.params.slug) })
const route = useRoute()
const requestEvent = useRequestEvent()
const { data: article, status, error, refresh } = await useFetch<PublicDetail>(`/api/public/articles/${encodeURIComponent(String(route.params.slug))}`)
const missing = computed(() => error.value?.status === 404)
if (missing.value && requestEvent) setResponseStatus(requestEvent, 404)
useHead({ title: computed(() => `${article.value?.title ?? 'Article'} · Northbeam Docs Studio`) })
</script>

<template>
  <div class="public-reader">
    <NuxtLink to="/" class="back-link">← All articles</NuxtLink>
    <p v-if="status === 'pending'" role="status">Loading article…</p>
    <section v-else-if="missing" class="surface empty-state">
      <h1>Article not found</h1><p class="muted">This article is unavailable. Return to all articles to keep reading.</p>
    </section>
    <div v-else-if="error" class="notice error" role="alert">
      <h1>Unable to load article</h1>
      <p>We could not load this article. Please try again.</p>
      <button class="button" @click="refresh()">Retry</button>
    </div>
    <article v-else-if="article" class="surface public-detail">
      <header class="public-detail-heading">
        <h1>{{ article.title }}</h1>
        <ul v-if="article.tags.length" class="public-article-tags" aria-label="Tags">
          <li v-for="tag in article.tags" :key="tag">{{ tag }}</li>
        </ul>
        <p class="hint">First published <time :datetime="article.publishedAt">{{ new Date(article.publishedAt).toISOString().slice(0, 10) }}</time></p>
      </header>
      <MarkdownContent :source="article.body" />
    </article>
  </div>
</template>
