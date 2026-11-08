<script setup lang="ts">
import type { VersionSummary } from '../../../../../shared/types/articles'

definePageMeta({ key: route => String(route.params.slug) })
const route = useRoute()
const { article, draft, tagsText, dirty, pending, conflict, publishDisabledReason, loadError, fieldErrors, errorMessage, successMessage, save, publish, unpublish, restore, deleteVersion, reload,
  history, historyStatus, historyError, refreshHistory, inspectedVersion, selectedVersionId, inspectionPending, inspectionError, inspectVersion } = await useArticleEditor(String(route.params.slug))
const missing = computed(() => loadError.value?.status === 404)
const confirmReload = ref(false)
const restoreConfirmation = ref<VersionSummary | null>(null)
const deleteConfirmation = ref<VersionSummary | null>(null)

function requestRestore(versionId: string) {
  if (pending.value || conflict.value || !inspectedVersion.value || inspectedVersion.value.id !== versionId) return
  deleteConfirmation.value = null
  if (dirty.value) restoreConfirmation.value = { id: versionId, versionNumber: inspectedVersion.value.versionNumber }
  else restore(versionId)
}

function confirmRestore() {
  const target = restoreConfirmation.value
  restoreConfirmation.value = null
  if (target) restore(target.id)
}

function requestDelete(versionId: string) {
  if (pending.value || conflict.value || !inspectedVersion.value || inspectedVersion.value.id !== versionId || article.value?.currentPublishedVersionId === versionId) return
  restoreConfirmation.value = null
  deleteConfirmation.value = { id: versionId, versionNumber: inspectedVersion.value.versionNumber }
}

function confirmDelete() {
  const target = deleteConfirmation.value
  deleteConfirmation.value = null
  if (target) deleteVersion(target.id)
}

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
      <ArticleHistory :versions="history ?? []" :loading="historyStatus === 'pending'" :failed="!!historyError" :publication-status="article.status" :published-version-id="article.currentPublishedVersionId" :inspected-version="inspectedVersion" :selected-version-id="selectedVersionId" :inspection-pending="inspectionPending" :inspection-error="inspectionError" :write-pending="pending" :conflict="conflict" :restore-confirmation="restoreConfirmation" :delete-confirmation="deleteConfirmation" @refresh="refreshHistory()" @inspect="inspectVersion" @restore="requestRestore" @confirm-restore="confirmRestore" @cancel-restore="restoreConfirmation = null" @delete="requestDelete" @confirm-delete="confirmDelete" @cancel-delete="deleteConfirmation = null" />
    </template>
  </div>
</template>
