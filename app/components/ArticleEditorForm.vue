<script setup lang="ts">
const props = defineProps<{
  draft: { title: string; body: string }
  tagsText: string
  dirty: boolean
  pending: boolean
  conflict: boolean
  publishDisabledReason: string
  canUnpublish: boolean
  fieldErrors: Record<string, string[]>
}>()
const emit = defineEmits<{
  'update:title': [value: string]
  'update:body': [value: string]
  'update:tagsText': [value: string]
  save: []
  publish: []
  unpublish: []
}>()
const activeTab = ref<'write' | 'preview'>('write')
const writeTab = ref<HTMLButtonElement | null>(null)
const previewTab = ref<HTMLButtonElement | null>(null)

function onTabKey(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  activeTab.value = event.key === 'Home' ? 'write' : event.key === 'End' ? 'preview' : activeTab.value === 'write' ? 'preview' : 'write'
  nextTick(() => (activeTab.value === 'write' ? writeTab.value : previewTab.value)?.focus())
}
</script>

<template>
  <form class="surface editor-form" :aria-busy="pending" novalidate @submit.prevent="emit('save')">
    <div class="editor-fields">
      <div class="field">
        <label for="draft-title">Title</label>
        <input id="draft-title" :value="draft.title" :aria-invalid="!!fieldErrors.title?.length" aria-describedby="draft-title-error" required @input="emit('update:title', ($event.target as HTMLInputElement).value)">
        <span id="draft-title-error" class="field-error">{{ fieldErrors.title?.join(' ') }}</span>
      </div>
      <div class="field">
        <label for="draft-tags">Tags</label>
        <input id="draft-tags" :value="tagsText" :aria-invalid="!!fieldErrors.tags?.length" aria-describedby="tags-hint draft-tags-error" @input="emit('update:tagsText', ($event.target as HTMLInputElement).value)">
        <span id="tags-hint" class="hint">Comma-separated. Up to 10 tags; letters, numbers, and single hyphens.</span>
        <span id="draft-tags-error" class="field-error">{{ fieldErrors.tags?.join(' ') }}</span>
      </div>
    </div>
    <div class="editor-pane">
      <div class="editor-tabs" role="tablist" aria-label="Markdown editor" @keydown="onTabKey">
        <button id="write-tab" ref="writeTab" type="button" role="tab" aria-controls="write-panel" :aria-selected="activeTab === 'write'" :tabindex="activeTab === 'write' ? 0 : -1" @click="activeTab = 'write'">Write</button>
        <button id="preview-tab" ref="previewTab" type="button" role="tab" aria-controls="preview-panel" :aria-selected="activeTab === 'preview'" :tabindex="activeTab === 'preview' ? 0 : -1" @click="activeTab = 'preview'">Preview</button>
        <span class="hint">{{ activeTab === 'write' ? 'Markdown' : 'Local draft' }}</span>
      </div>
      <section id="write-panel" v-show="activeTab === 'write'" role="tabpanel" aria-labelledby="write-tab">
        <label for="draft-body" class="sr-only">Markdown body</label>
        <textarea id="draft-body" class="markdown-source" :value="draft.body" :aria-invalid="!!fieldErrors.body?.length" aria-describedby="draft-body-error" @input="emit('update:body', ($event.target as HTMLTextAreaElement).value)" />
      </section>
      <section id="preview-panel" v-show="activeTab === 'preview'" role="tabpanel" aria-labelledby="preview-tab" tabindex="0" class="draft-preview">
        <MarkdownContent v-if="draft.body" :source="draft.body" />
        <p v-else class="muted">Nothing to preview yet.</p>
      </section>
    </div>
    <p id="draft-body-error" class="field-error">{{ fieldErrors.body?.join(' ') }}</p>
    <div class="editor-actions">
      <span class="hint" role="status">{{ dirty ? 'Unsaved changes' : 'All changes saved' }}</span>
      <div class="editor-action-buttons">
        <button type="submit" class="button" :disabled="props.pending || conflict">{{ pending ? 'Please wait…' : 'Save draft' }}</button>
        <button type="button" class="button primary" :disabled="pending || conflict || !!publishDisabledReason" aria-describedby="publish-hint" @click="emit('publish')">{{ pending ? 'Please wait…' : 'Publish' }}</button>
        <button v-if="canUnpublish" type="button" class="button" :disabled="pending || conflict" @click="emit('unpublish')">{{ pending ? 'Please wait…' : 'Unpublish' }}</button>
      </div>
    </div>
    <p id="publish-hint" class="hint" role="status">{{ publishDisabledReason }}</p>
  </form>
</template>
