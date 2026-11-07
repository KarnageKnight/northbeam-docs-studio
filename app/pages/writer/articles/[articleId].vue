<script setup lang="ts">
definePageMeta({ key: route => String(route.params.articleId) })
const route = useRoute()
const { article, draft, tagsText, dirty, pending, conflict, publishDisabledReason, loadError, fieldErrors, errorMessage, successMessage, save, publish, unpublish, reload } = await useArticleEditor(String(route.params.articleId))
const missing = computed(() => loadError.value?.status === 404)
const confirmReload = ref(false)

function requestReload() {
  if (dirty.value) confirmReload.value = true
  else reload()
}

function confirmDiscard() {
  confirmReload.value = false
  reload()
}
useHead({ title: computed(() => `${article.value?.draft.title ?? 'Article'} · Northbeam Docs Studio`) })
</script>

<template>
  <div>
    <NuxtLink to="/writer/articles" class="back-link">← Writer articles</NuxtLink>
    <section v-if="loadError && !article" class="surface empty-state">
      <h1>{{ missing ? 'Article not found' : 'Unable to load article' }}</h1>
      <p class="muted" role="alert">{{ missing ? 'This article is unavailable. Return to your article list.' : 'We could not load this draft. Please try again.' }}</p>
      <button v-if="!missing" class="button" :disabled="pending" @click="reload()">{{ pending ? 'Loading…' : 'Retry' }}</button>
    </section>
    <template v-else-if="article">
      <header class="editor-heading">
        <div class="editor-title"><h1>{{ article.draft.title }}</h1><span class="badge" :class="article.status">{{ article.status }}</span></div>
        <p class="metadata">Slug: <code>{{ article.slug }}</code> · fixed</p>
        <p v-if="article.publishedAt" class="metadata">First published {{ new Date(article.publishedAt).toISOString().slice(0, 10) }}</p>
        <p v-if="article.currentPublishedVersionId" class="metadata">{{ article.status === 'unpublished' ? 'Last published snapshot' : 'Published snapshot' }}: <code>{{ article.currentPublishedVersionId }}</code></p>
      </header>
      <div v-if="errorMessage" class="notice" :class="conflict ? 'warning' : 'error'" role="alert">
        <p>{{ errorMessage }}</p>
        <button v-if="conflict" class="button" :disabled="pending" @click="requestReload">Reload saved article</button>
      </div>
      <div v-if="confirmReload" class="notice warning" role="alert">
        <p>Reloading replaces your local edits with the saved draft. Continue?</p>
        <div class="confirmation-actions"><button class="button" :disabled="pending" @click="confirmDiscard">Confirm reload</button><button class="button" @click="confirmReload = false">Cancel</button></div>
      </div>
      <p v-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>
      <ArticleEditorForm :draft="draft" :tags-text="tagsText" :dirty="dirty" :pending="pending" :conflict="conflict" :publish-disabled-reason="publishDisabledReason" :can-unpublish="article.status === 'published'" :field-errors="fieldErrors" @update:title="draft.title = $event" @update:body="draft.body = $event" @update:tags-text="tagsText = $event" @save="save" @publish="publish" @unpublish="unpublish" />
    </template>
  </div>
</template>
