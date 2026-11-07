<script setup lang="ts">
import type { WriterSummary } from '../../../../shared/types/articles'

const { data: articles, status, error, refresh } = await useFetch<WriterSummary[]>('/api/writer/articles')
useHead({ title: 'Writer articles · Northbeam Docs Studio' })
</script>

<template>
  <div>
    <div class="page-heading">
      <div><p class="eyebrow">Workspace</p><h1>Writer articles</h1><p class="muted">Open an article to work on its draft.</p></div>
      <NuxtLink to="/writer/articles/new" class="button primary">+ New article</NuxtLink>
    </div>
    <p v-if="status === 'pending'" role="status">Loading articles…</p>
    <div v-else-if="error" class="notice error" role="alert">
      <p>We could not load your articles. Please try again.</p>
      <button class="button" @click="refresh()">Retry</button>
    </div>
    <section v-else-if="!articles?.length" class="surface empty-state">
      <h2>No articles yet</h2><p class="muted">Create your first draft to get started.</p>
      <NuxtLink to="/writer/articles/new" class="button primary">Create a draft</NuxtLink>
    </section>
    <section v-else class="surface article-list" aria-label="Writer articles">
      <div class="list-heading" aria-hidden="true"><span>Draft title</span><span>Status</span><span /></div>
      <div v-for="article in articles" :key="article.id" class="article-row">
        <NuxtLink :to="`/writer/articles/${article.id}`" class="article-title">{{ article.title }}</NuxtLink>
        <span class="badge" :class="article.status">{{ article.status }}</span>
        <NuxtLink :to="`/writer/articles/${article.id}`" class="open-link" :aria-label="`Open ${article.title}`">Open →</NuxtLink>
      </div>
    </section>
    <p v-if="articles?.length && !error" class="hint list-note">Titles reflect your saved drafts.</p>
  </div>
</template>
