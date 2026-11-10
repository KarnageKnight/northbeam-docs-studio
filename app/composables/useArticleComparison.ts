import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import type { VersionDetail, WriterArticle } from '../../shared/types/articles'
import type { ArticleComparisonRequest, ArticleComparisonResponse, ArticleComparisonResult,
  CapturedSavedDraft, ComparisonCaptures, ComparisonStatus } from '../../shared/types/article-comparison'

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
  const selectedVersionId = ref<string | null>(null)
  const errorMessage = ref('')
  let generation = 0
  let controller: AbortController | null = null
  let worker: Worker | null = null
  let pendingDraft: CapturedSavedDraft | null = null
  const blockedReason = computed(() => !inputs.article.value ? 'Load an article before comparing.'
    : inputs.pending.value ? 'Wait for the current action to finish before comparing.'
      : inputs.conflict.value ? 'Resolve the draft conflict before comparing.'
        : inputs.dirty.value ? 'Save your draft before comparing.' : '')

  function captureSavedDraft(): CapturedSavedDraft | null {
    const article = inputs.article.value
    if (blockedReason.value || !article) return null
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
  function open(versionId: string | null) {
    invalidate()
    selectedVersionId.value = versionId
    status.value = 'selecting'
  }
  function fail(message: string) { invalidate(); errorMessage.value = message; status.value = 'error' }

  async function readSources(versionId: string): Promise<ComparisonCaptures | null> {
    selectedVersionId.value = versionId
    invalidate()
    const attempt = generation
    pendingDraft = captureSavedDraft()
    if (!pendingDraft) {
      errorMessage.value = blockedReason.value
      status.value = 'error'
      return null
    }
    const articleId = pendingDraft.articleId
    const revision = pendingDraft.revision
    const abort = new AbortController()
    controller = abort
    status.value = 'fetching'
    try {
      const version = await $fetch<VersionDetail>(`/api/writer/articles/${encodeURIComponent(articleId)}/versions/${encodeURIComponent(versionId)}`, {
        retry: 0, signal: abort.signal,
      })
      if (attempt !== generation) return null
      if (!pendingDraft || blockedReason.value || inputs.article.value?.id !== articleId || inputs.article.value.revision !== revision) {
        fail(blockedReason.value || 'The saved draft changed. Compare again to capture it.')
        return null
      }
      if (version.id !== versionId) throw new Error('Unavailable source')
      sources.value = { mode: 'draft-version', target: pendingDraft, baseline: {
        kind: 'version', articleId, versionId: version.id,
        versionNumber: version.versionNumber, label: `Version ${version.versionNumber}`,
        title: version.title, body: version.body, tags: [...version.tags],
      } }
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
    if (!pair || pair.mode !== 'draft-version' || attempt !== generation) return
    const articleId = pair.target.articleId
    const revision = pair.target.revision
    const current = () => generation === attempt && inputs.article.value?.id === articleId
      && inputs.article.value.revision === revision && selectedVersionId.value === versionId && !blockedReason.value
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
        if (output.requestId !== attempt || output.articleId !== articleId || output.mode !== 'draft-version'
          || output.baseline.articleId !== articleId || output.target.articleId !== articleId
          || output.baseline.versionId !== versionId || output.target.revision !== revision) return
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

  watch(selectedVersionId, () => {
    const wasOpen = status.value !== 'closed'
    invalidate()
    if (wasOpen) status.value = 'selecting'
  }, { flush: 'sync' })
  watch(() => inputs.article.value?.id, close, { flush: 'sync' })
  watch([blockedReason, () => inputs.article.value?.revision], () => {
    if (status.value === 'fetching' || status.value === 'computing') {
      fail(blockedReason.value || 'The saved draft changed. Compare again to capture it.')
    }
  }, { flush: 'sync' })
  onScopeDispose(close)

  return { blockedReason, captureSavedDraft, sources, errorMessage, readSources,
    result, status, selectedVersionId, open, compare, cancel, close }
}
