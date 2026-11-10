import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import type { VersionDetail, WriterArticle } from '../../shared/types/articles'
import type { ArticleComparisonRequest, ArticleComparisonResponse, ArticleComparisonResult,
  CapturedSavedDraft, CapturedVersion, ComparisonCaptures, ComparisonMode, ComparisonStatus } from '../../shared/types/article-comparison'

interface ComparisonInputs {
  article: Readonly<Ref<WriterArticle | null>>
  dirty: Readonly<Ref<boolean>>
  pending: Readonly<Ref<boolean>>
  conflict: Readonly<Ref<boolean>>
}

export function useArticleComparison(inputs: ComparisonInputs) {
  const sources = shallowRef<ComparisonCaptures | null>(null)
  const result = shallowRef<ArticleComparisonResult | null>(null)
  const status = ref<ComparisonStatus>('closed')
  const mode = ref<ComparisonMode>('draft-version')
  const selectedVersionId = ref<string | null>(null)
  const targetVersionId = ref<string | null>(null)
  const errorMessage = ref('')
  let generation = 0
  let controller: AbortController | null = null
  let worker: Worker | null = null
  let pendingDraft: CapturedSavedDraft | null = null
  const draftBlockedReason = computed(() => !inputs.article.value ? 'Load an article before comparing.'
    : inputs.pending.value ? 'Wait for the current action to finish before comparing.'
      : inputs.conflict.value ? 'Resolve the draft conflict before comparing.'
        : inputs.dirty.value ? 'Save your draft before comparing.' : '')
  const blockedReason = computed(() => mode.value === 'version-version' && inputs.article.value && !inputs.pending.value
    ? '' : draftBlockedReason.value)

  function captureSavedDraft(): CapturedSavedDraft | null {
    const article = inputs.article.value
    if (draftBlockedReason.value || !article) return null
    return {
      kind: 'saved-draft', articleId: article.id, revision: article.revision, label: 'Saved draft',
      title: article.draft.title, body: article.draft.body, tags: [...article.draft.tags],
    }
  }

  function invalidate() {
    generation++
    controller?.abort()
    controller = null
    worker?.terminate()
    worker = null
    pendingDraft = null
    sources.value = null
    result.value = null
    errorMessage.value = ''
  }

  function close() { invalidate(); status.value = 'closed' }
  function cancel() { invalidate(); status.value = 'selecting' }
  function open(versionId: string | null, targetId: string | null = versionId) {
    invalidate()
    selectedVersionId.value = versionId
    targetVersionId.value = targetId
    status.value = 'selecting'
  }
  function fail(message: string) { invalidate(); errorMessage.value = message; status.value = 'error' }

  async function readSources(versionId: string): Promise<ComparisonCaptures | null> {
    selectedVersionId.value = versionId
    invalidate()
    const attempt = generation
    const selectedMode = mode.value
    const selectedTargetId = targetVersionId.value
    const article = inputs.article.value
    if (!article || blockedReason.value || (selectedMode === 'version-version' && !selectedTargetId)) {
      fail(blockedReason.value || 'Choose a retained target version before comparing.')
      return null
    }
    pendingDraft = selectedMode === 'draft-version' ? captureSavedDraft() : null
    const articleId = article.id
    const revision = article.revision
    const abort = new AbortController()
    controller = abort
    status.value = 'fetching'
    const readVersion = async (id: string): Promise<CapturedVersion> => {
      const version = await $fetch<VersionDetail>(`/api/writer/articles/${encodeURIComponent(articleId)}/versions/${encodeURIComponent(id)}`, {
        retry: 0, signal: abort.signal,
      })
      if (version.id !== id) throw new Error('Unavailable source')
      return { kind: 'version', articleId, versionId: version.id,
        versionNumber: version.versionNumber, label: `Version ${version.versionNumber}`,
        title: version.title, body: version.body, tags: [...version.tags] }
    }
    try {
      const [baseline, historicalTarget] = selectedMode === 'version-version' && selectedTargetId !== versionId
        ? await Promise.all([readVersion(versionId), readVersion(selectedTargetId!)])
        : [await readVersion(versionId), null]
      if (attempt !== generation) return null
      if (blockedReason.value || inputs.article.value?.id !== articleId
        || (selectedMode === 'draft-version' && (!pendingDraft || inputs.article.value.revision !== revision))) {
        fail(blockedReason.value || 'The saved draft changed. Compare again to capture it.')
        return null
      }
      sources.value = selectedMode === 'draft-version'
        ? { mode: selectedMode, target: pendingDraft!, baseline }
        : { mode: selectedMode, baseline, target: historicalTarget ?? baseline }
      pendingDraft = null
      status.value = 'selecting'
      return sources.value
    }
    catch (error) {
      if (attempt === generation) {
        fail((error as { status?: number }).status === 404
          ? 'This version is unavailable. Choose a retained version and try again.'
          : 'We could not load this comparison source. Please try again.')
      }
      return null
    }
    finally { if (controller === abort) controller = null }
  }

  async function compare() {
    const versionId = selectedVersionId.value
    if (!versionId) { fail('Choose a retained version before comparing.'); return }
    const reading = readSources(versionId)
    const attempt = generation
    const pair = await reading
    if (!pair || attempt !== generation) return
    const articleId = pair.target.articleId
    const comparisonMode = pair.mode
    const revision = pair.mode === 'draft-version' ? pair.target.revision : null
    const targetId = pair.mode === 'version-version' ? pair.target.versionId : null
    const current = () => generation === attempt && inputs.article.value?.id === articleId
      && mode.value === comparisonMode && selectedVersionId.value === versionId && !blockedReason.value
      && (comparisonMode === 'draft-version' ? inputs.article.value.revision === revision : targetVersionId.value === targetId)
    if (!current()) { fail(blockedReason.value || 'The saved draft changed. Compare again to capture it.'); return }
    try {
      // Vite bundles this module separately; no Worker is constructed during SSR/setup.
      const activeWorker = new Worker(new URL('../workers/articleDiff.worker.ts', import.meta.url), { type: 'module' })
      worker = activeWorker
      status.value = 'computing'
      activeWorker.onmessage = ({ data }: MessageEvent<ArticleComparisonResponse>) => {
        if (!current() || status.value !== 'computing' || data.requestId !== attempt || data.articleId !== articleId) return
        if (data.type === 'error') {
          fail('We could not compare these sources. Please try again.')
          return
        }
        const output = data.result
        if (output.requestId !== attempt || output.articleId !== articleId || output.mode !== comparisonMode
          || output.baseline.articleId !== articleId || output.target.articleId !== articleId
          || output.baseline.versionId !== versionId) return
        if (output.mode === 'draft-version' ? output.target.revision !== revision : output.target.versionId !== targetId) return
        activeWorker.terminate()
        worker = null
        sources.value = null
        result.value = output
        status.value = 'ready'
      }
      const transportFailure = () => {
        if (current() && status.value === 'computing') fail('We could not run the comparison. Please try again.')
      }
      activeWorker.onerror = transportFailure
      activeWorker.onmessageerror = transportFailure
      const request: ArticleComparisonRequest = { type: 'compare', requestId: attempt, articleId, ...pair }
      activeWorker.postMessage(request)
      sources.value = null
    }
    catch { if (current()) fail('We could not start the comparison. Please try again.') }
  }

  async function reverse() {
    if (mode.value !== 'version-version' || blockedReason.value || !selectedVersionId.value || !targetVersionId.value) return
    const baselineId = selectedVersionId.value
    selectedVersionId.value = targetVersionId.value
    targetVersionId.value = baselineId
    await compare()
  }

  watch([selectedVersionId, targetVersionId, mode], () => {
    const wasOpen = status.value !== 'closed'
    invalidate()
    if (wasOpen) status.value = 'selecting'
  }, { flush: 'sync' })
  watch(() => inputs.article.value?.id, close, { flush: 'sync' })
  watch([blockedReason, () => inputs.article.value?.revision], () => {
    if ((status.value === 'fetching' || status.value === 'computing') && (blockedReason.value || mode.value === 'draft-version')) {
      fail(blockedReason.value || 'The saved draft changed. Compare again to capture it.')
    }
  }, { flush: 'sync' })
  onScopeDispose(close)

  return { blockedReason, captureSavedDraft, sources, errorMessage, readSources,
    result, status, mode, selectedVersionId, targetVersionId, open, compare, reverse, cancel, close }
}
