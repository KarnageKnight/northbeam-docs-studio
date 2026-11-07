<script setup lang="ts">
import type { WriterArticle } from '../../../../shared/types/articles'

const route = useRoute()
const { data: article, status, error, refresh } = await useFetch<WriterArticle>(() => `/api/writer/articles/${encodeURIComponent(String(route.params.articleId))}`)
const missing = computed(() => error.value?.statusCode === 404)
useHead({ title: computed(() => `${article.value?.draft.title ?? 'Article'} · Northbeam Docs Studio`) })
</script>

<template>
  <div>
    <NuxtLink to="/writer/articles" class="back-link">← Writer articles</NuxtLink>
    <p v-if="status === 'pending'" role="status">Loading draft…</p>
    <section v-else-if="error" class="surface empty-state">
      <h1>{{ missing ? 'Article not found' : 'Unable to load article' }}</h1>
      <p class="muted" role="alert">{{ missing ? 'This article is unavailable. Return to your article list.' : 'We could not load this draft. Please try again.' }}</p>
      <button v-if="!missing" class="button" @click="refresh()">Retry</button>
    </section>
    <template v-else-if="article">
      <header class="editor-heading">
        <div class="editor-title"><h1>{{ article.draft.title }}</h1><span class="badge" :class="article.status">{{ article.status }}</span></div>
        <p class="metadata">Slug: <code>{{ article.slug }}</code> · fixed</p>
        <p v-if="article.publishedAt" class="metadata">First published {{ new Date(article.publishedAt).toISOString().slice(0, 10) }}</p>
      </header>
      <section class="surface draft-details" aria-label="Saved draft">
        <h2>Saved draft</h2>
        <dl>
          <dt>Title</dt><dd>{{ article.draft.title }}</dd>
          <dt>Tags</dt><dd><template v-if="article.draft.tags.length"><span v-for="tag in article.draft.tags" :key="tag" class="tag">{{ tag }}</span></template><span v-else class="muted">No tags</span></dd>
          <dt>Markdown body</dt><dd><pre v-if="article.draft.body" class="saved-body">{{ article.draft.body }}</pre><span v-else class="muted">No content yet</span></dd>
        </dl>
      </section>
    </template>
  </div>
</template>
