<script setup lang="ts">
import type { ArticleStatus, VersionSummary } from '../../shared/types/articles'
import type { ArticleComparisonResult, ComparisonLineChange, ComparisonMode, ComparisonStatus } from '../../shared/types/article-comparison'

const props = defineProps<{
  versions: VersionSummary[]
  publicationStatus: ArticleStatus
  publishedVersionId: string | null
  savedRevision: number
  status: ComparisonStatus
  mode: ComparisonMode
  selectedVersionId: string | null
  targetVersionId: string | null
  result: ArticleComparisonResult | null
  blockedReason: string
  errorMessage: string
}>()
const emit = defineEmits<{ compare: []; reverse: []; cancel: []; close: [];
  selectMode: [mode: ComparisonMode]; selectVersion: [versionId: string | null]; selectTarget: [versionId: string | null] }>()
const heading = ref<HTMLHeadingElement | null>(null)
const batches = shallowRef<(readonly ComparisonLineChange[])[]>([])
const rendering = ref(false)
const renderedRows = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined
let renderGeneration = 0
const busy = computed(() => props.status === 'fetching' || props.status === 'computing')
const capturedRevision = computed(() => props.result?.mode === 'draft-version' ? props.result.target.revision : props.savedRevision)
const announcement = computed(() => props.status === 'fetching' ? 'Loading comparison sources…'
  : props.status === 'computing' ? 'Comparing…'
    : rendering.value ? 'Preparing the complete article…'
      : props.result ? props.result.identical ? 'No differences.' : 'Comparison ready.' : '')

function versionLabel(version: VersionSummary) {
  return `Version ${version.versionNumber}${version.id === props.publishedVersionId
    ? props.publicationStatus === 'unpublished' ? ' · Last published' : ' · Current published' : ''}`
}
function lineEnding(text: string) { return text.endsWith('\r\n') ? '↵ CRLF' : text.endsWith('\n') ? '↵ LF' : 'No final newline' }
function cue(kind: ComparisonLineChange['kind']) { return kind === 'removed' ? '−' : kind === 'added' ? '+' : ' ' }

watch(() => props.result, (result) => {
  const attempt = ++renderGeneration
  clearTimeout(timer)
  batches.value = []
  renderedRows.value = 0
  rendering.value = !!result?.body.length
  if (!result) return
  // Append every row automatically, yielding between batches to keep exit controls usable.
  const append = () => {
    if (attempt !== renderGeneration) return
    const batch = result.body.slice(renderedRows.value, renderedRows.value + 1000)
    if (batch.length) batches.value = [...batches.value, batch]
    renderedRows.value += batch.length
    rendering.value = renderedRows.value < result.body.length
    if (rendering.value) timer = setTimeout(append, 0)
  }
  timer = setTimeout(append, 0)
}, { immediate: true })
onMounted(() => heading.value?.focus())
onBeforeUnmount(() => { renderGeneration++; clearTimeout(timer) })
</script>

<template>
  <section class="surface article-comparison" aria-labelledby="comparison-heading" :data-state="status" :data-rendered-rows="renderedRows" :data-rendering="rendering">
    <header class="comparison-heading">
      <div><p class="eyebrow">Read-only comparison</p><h2 id="comparison-heading" ref="heading" tabindex="-1">Review changes</h2></div>
      <button id="comparison-close" type="button" class="button" @click="emit('close')">Close comparison</button>
    </header>
    <p class="hint">Baseline is the starting content. Target is the content you are reviewing.</p>
    <div class="comparison-selectors">
      <div class="field"><label for="comparison-mode">Compare</label><select id="comparison-mode" :value="mode" @change="emit('selectMode', ($event.target as HTMLSelectElement).value as ComparisonMode)"><option value="draft-version">Saved draft with a version</option><option value="version-version">Two versions</option></select></div>
      <div class="field"><label for="comparison-baseline">Baseline</label>
        <select id="comparison-baseline" :value="selectedVersionId ?? ''" @change="emit('selectVersion', ($event.target as HTMLSelectElement).value || null)">
          <option value="" disabled>Choose a version</option><option v-for="version in versions" :key="version.id" :value="version.id">{{ versionLabel(version) }}</option>
        </select>
      </div>
      <div v-if="mode === 'version-version'" class="field"><label for="comparison-target">Target</label>
        <select id="comparison-target" :value="targetVersionId ?? ''" @change="emit('selectTarget', ($event.target as HTMLSelectElement).value || null)">
          <option value="" disabled>Choose a version</option><option v-for="version in versions" :key="version.id" :value="version.id">{{ versionLabel(version) }}</option>
        </select>
      </div>
      <div v-else class="field"><span id="comparison-target-label" class="comparison-label">Target</span><p class="comparison-saved" aria-labelledby="comparison-target-label">Saved draft · revision {{ capturedRevision }}</p></div>
    </div>
    <p v-if="mode === 'draft-version'" class="hint">This captures your saved draft. Save and refresh to include later edits.</p>
    <p v-else class="hint">Compare retained snapshots without saving or changing your draft edits.</p>
    <p v-if="!versions.length" class="notice warning">Publish a version before comparing.</p>
    <p v-else-if="mode === 'version-version' && versions.length === 1" class="notice warning">A second retained version is needed to review historical changes. Select the same version twice to check for identical content.</p>
    <p v-if="blockedReason" id="comparison-guard" class="notice warning">{{ blockedReason }}</p>
    <div class="confirmation-actions">
      <button id="comparison-run" type="button" class="button primary" :disabled="!!blockedReason || !selectedVersionId || (mode === 'version-version' && !targetVersionId) || busy" :aria-describedby="blockedReason ? 'comparison-guard' : undefined" @click="emit('compare')">{{ result ? 'Refresh comparison' : status === 'error' ? 'Retry comparison' : 'Compare' }}</button>
      <button v-if="mode === 'version-version'" id="comparison-reverse" type="button" class="button" :disabled="!!blockedReason || !selectedVersionId || !targetVersionId" @click="emit('reverse')">Reverse sources</button>
      <button v-if="busy || rendering" id="comparison-cancel" type="button" class="button" @click="emit('cancel')">Cancel comparison</button>
    </div>
    <p class="comparison-status hint" role="status" aria-live="polite">{{ announcement }}</p>
    <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
    <template v-if="result">
      <p class="comparison-capture">{{ result.baseline.label }} → {{ result.target.label }}<template v-if="result.mode === 'draft-version'"> · revision {{ capturedRevision }}</template></p>
      <p v-if="result.identical" class="notice success">No differences. The captured sources have identical content.</p>
      <div class="comparison-legend" aria-label="Change legend"><span>− Removed line</span><span>+ Added line</span><span><del>Removed word</del></span><span><ins>Added word</ins></span><span>Plain text = unchanged</span></div>
      <div :key="result.requestId" class="comparison-source-view" tabindex="0" aria-label="Complete article source comparison">
        <table class="comparison-diff">
          <caption>Article source · Unified diff</caption>
          <thead><tr><th scope="col" class="comparison-number">Old</th><th scope="col" class="comparison-number">New</th><th scope="col" class="comparison-cue"><span class="sr-only">Change</span></th><th scope="col">Source text</th></tr></thead>
          <tbody><tr><th colspan="4" class="comparison-field">Title</th></tr>
            <tr v-for="(row, index) in result.title" :key="index" class="comparison-line" :class="row.kind" data-field="title" :data-kind="row.kind">
              <td class="comparison-number">{{ row.baselineLine ?? '—' }}</td><td class="comparison-number">{{ row.targetLine ?? '—' }}</td><td class="comparison-cue"><span class="sr-only">{{ row.kind }}</span>{{ cue(row.kind) }}</td>
              <td class="comparison-text"><span class="comparison-source"><component :is="segment.kind === 'added' ? 'ins' : segment.kind === 'removed' ? 'del' : 'span'" v-for="(segment, part) in row.segments" :key="part">{{ segment.text }}</component></span><span class="comparison-newline">{{ lineEnding(row.text) }}</span></td>
            </tr>
          </tbody>
          <tbody><tr><th colspan="4" class="comparison-field">Markdown body · entire source</th></tr><tr v-if="!result.body.length"><td colspan="4" class="comparison-empty">Empty body</td></tr></tbody>
          <tbody v-for="(batch, batchIndex) in batches" :key="batchIndex" v-memo="[batch]">
            <tr v-for="(row, index) in batch" :key="index" class="comparison-line" :class="row.kind" data-field="body" :data-kind="row.kind">
              <td class="comparison-number">{{ row.baselineLine ?? '—' }}</td><td class="comparison-number">{{ row.targetLine ?? '—' }}</td><td class="comparison-cue"><span class="sr-only">{{ row.kind }}</span>{{ cue(row.kind) }}</td>
              <td class="comparison-text"><span class="comparison-source"><component :is="segment.kind === 'added' ? 'ins' : segment.kind === 'removed' ? 'del' : 'span'" v-for="(segment, part) in row.segments" :key="part">{{ segment.text }}</component></span><span class="comparison-newline">{{ lineEnding(row.text) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">The complete article is shown in one continuous diff. Line numbers refer to each source field.</p>
      <section class="comparison-tags" aria-labelledby="comparison-tags-heading"><h3 id="comparison-tags-heading">Tags</h3>
        <p v-if="!result.tags.added.length && !result.tags.removed.length" class="hint">No tag changes.</p>
        <ul aria-label="Tag changes"><li v-for="tag in result.tags.added" :key="`added-${tag}`">+ Added: {{ tag }}</li><li v-for="tag in result.tags.removed" :key="`removed-${tag}`">− Removed: {{ tag }}</li><li v-for="tag in result.tags.unchanged" :key="`unchanged-${tag}`">Unchanged: {{ tag }}</li></ul>
      </section>
      <button type="button" class="button comparison-bottom-close" @click="emit('close')">Close comparison</button>
    </template>
  </section>
</template>
