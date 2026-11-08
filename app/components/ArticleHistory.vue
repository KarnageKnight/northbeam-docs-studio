<script setup lang="ts">
import type { ArticleStatus, VersionDetail, VersionSummary } from '../../shared/types/articles'

defineProps<{
  versions: VersionSummary[]
  loading: boolean
  failed: boolean
  publicationStatus: ArticleStatus
  publishedVersionId: string | null
  inspectedVersion: VersionDetail | null
  selectedVersionId: string | null
  inspectionPending: boolean
  inspectionError: string
}>()
const emit = defineEmits<{ refresh: []; inspect: [versionId: string] }>()
</script>

<template>
  <section class="surface article-history" aria-labelledby="history-heading">
    <header class="history-heading">
      <div><h2 id="history-heading">Version history</h2><p class="hint">Published snapshots · newest first</p></div>
      <button type="button" class="button" :disabled="loading" @click="emit('refresh')">Refresh history</button>
    </header>
    <p v-if="loading" role="status">Loading history…</p>
    <div v-else-if="failed" class="notice error history-list-error" role="alert">
      <p>We could not load version history. Please try again.</p>
      <button type="button" class="button" @click="emit('refresh')">Retry history</button>
    </div>
    <p v-else-if="!versions.length" class="muted">No published versions yet.</p>
    <ul v-else class="history-list" aria-label="Published versions">
      <li v-for="version in versions" :key="version.id" class="history-row">
        <span class="history-version">Version {{ version.versionNumber }}</span>
        <span class="hint">{{ version.id === publishedVersionId ? publicationStatus === 'unpublished' ? 'Last published' : 'Current published' : 'Historical snapshot' }}</span>
        <button type="button" class="button" :aria-label="`Inspect version ${version.versionNumber}`" :aria-pressed="selectedVersionId === version.id" :disabled="inspectionPending" @click="emit('inspect', version.id)">Inspect</button>
      </li>
    </ul>
    <p v-if="inspectionPending" class="history-feedback" role="status">Loading version…</p>
    <div v-else-if="inspectionError" class="notice error history-inspection-error" role="alert">
      <p>{{ inspectionError }}</p>
      <button v-if="selectedVersionId" type="button" class="button" @click="emit('inspect', selectedVersionId)">Retry inspection</button>
    </div>
    <section v-else-if="inspectedVersion" class="history-inspection" aria-labelledby="inspected-heading" aria-live="polite">
      <h3 id="inspected-heading">Version {{ inspectedVersion.versionNumber }} · Read-only snapshot</h3>
      <h4>{{ inspectedVersion.title }}</h4>
      <ul v-if="inspectedVersion.tags.length" class="public-article-tags" aria-label="Snapshot tags">
        <li v-for="tag in inspectedVersion.tags" :key="tag">{{ tag }}</li>
      </ul>
      <MarkdownContent :source="inspectedVersion.body" />
    </section>
  </section>
</template>
