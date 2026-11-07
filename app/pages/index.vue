<script setup lang="ts">
import type { PublicSummary } from '../../shared/types/articles'

const { data: articles, status, error, refresh } = await useFetch<PublicSummary[]>('/api/public/articles')
useHead({ title: 'Articles · Northbeam Docs Studio' })
</script>

<template>
  <div>
    <div class="page-heading">
      <div><p class="eyebrow">Public</p><h1>Articles</h1><p class="muted">Explore articles published by our writers.</p></div>
    </div>
    <p v-if="status === 'pending'" role="status">Loading articles…</p>
    <div v-else-if="error" class="notice error" role="alert">
      <p>We could not load published articles. Please try again.</p>
      <button class="button" @click="refresh()">Retry</button>
    </div>
    <section v-else-if="!articles?.length" class="surface empty-state">
      <h2>No published articles yet</h2><p class="muted">Check back when our writers have published something new.</p>
    </section>
    <section v-else class="surface" aria-label="Published articles">
      <article v-for="article in articles" :key="article.slug" class="public-article-row">
        <div class="public-article-summary">
          <h2><NuxtLink :to="`/articles/${article.slug}`" class="public-article-title">{{ article.title }}</NuxtLink></h2>
          <ul v-if="article.tags.length" class="public-article-tags" aria-label="Tags">
            <li v-for="tag in article.tags" :key="tag">{{ tag }}</li>
          </ul>
          <p class="hint">First published <time :datetime="article.publishedAt">{{ new Date(article.publishedAt).toISOString().slice(0, 10) }}</time></p>
        </div>
        <NuxtLink :to="`/articles/${article.slug}`" class="button" :aria-label="`Read ${article.title}`">Read article →</NuxtLink>
      </article>
    </section>
  </div>
</template>
