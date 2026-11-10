import { effectScope, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useArticleComparison } from '../../app/composables/useArticleComparison'
import type { WriterArticle } from '../../shared/types/articles'
import type { ArticleComparisonRequest, ArticleComparisonResponse } from '../../shared/types/article-comparison'
import { compareArticle } from '../../app/utils/articleDiff'

afterEach(() => vi.unstubAllGlobals())

const version = { id: 'version-id', versionNumber: 3, title: 'Published title', body: 'Published body\n', tags: ['published'] }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

class TestWorker {
  static instances: TestWorker[] = []
  onmessage: ((event: MessageEvent<ArticleComparisonResponse>) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null
  request: ArticleComparisonRequest | null = null
  terminated = false
  constructor() { TestWorker.instances.push(this) }
  postMessage(request: ArticleComparisonRequest) { this.request = request }
  terminate() { this.terminated = true }
  complete() {
    const request = this.request!
    this.onmessage?.({ data: { type: 'result', requestId: request.requestId, articleId: request.articleId,
      result: compareArticle(request) } } as MessageEvent<ArticleComparisonResponse>)
  }
}

function workerBoundary() {
  TestWorker.instances = []
  vi.stubGlobal('Worker', TestWorker)
  vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(version))
}

function setup() {
  const article = ref<WriterArticle | null>({
    id: 'article-id', slug: 'article', status: 'published', revision: 7,
    draft: { title: 'Saved title', body: 'Saved body\n', tags: ['guide'] },
    publishedAt: '2026-11-10T00:00:00.000Z', currentPublishedVersionId: 'version-id',
  })
  const dirty = ref(false)
  const pending = ref(false)
  const conflict = ref(false)
  const scope = effectScope()
  const comparison = scope.run(() => useArticleComparison({ article, dirty, pending, conflict }))!
  return { article, dirty, pending, conflict, scope, comparison }
}

describe('saved draft comparison capture', () => {
  it('copies the saved source and revision without retaining mutable tag references', () => {
    const { article, scope, comparison } = setup()
    const capture = comparison.captureSavedDraft()
    expect(capture).toEqual({ kind: 'saved-draft', articleId: 'article-id', revision: 7,
      label: 'Saved draft', title: 'Saved title', body: 'Saved body\n', tags: ['guide'] })
    article.value!.draft.tags.push('later')
    article.value!.draft.body = 'Later saved body'
    article.value!.revision++
    expect(capture?.tags).toEqual(['guide'])
    expect(capture?.body).toBe('Saved body\n')
    expect(capture?.revision).toBe(7)
    scope.stop()
  })

  it.each(['dirty', 'pending', 'conflict'] as const)('blocks capture while %s is true', (flag) => {
    const state = setup()
    state[flag].value = true
    expect(state.comparison.blockedReason.value).not.toBe('')
    expect(state.comparison.captureSavedDraft()).toBeNull()
    expect(state.article.value!.draft.body).toBe('Saved body\n')
    state.scope.stop()
  })

  it('stays blocked if a successful save leaves newer input dirty', () => {
    const { article, dirty, pending, comparison, scope } = setup()
    pending.value = true
    dirty.value = true
    article.value = { ...article.value!, revision: 8 }
    pending.value = false
    expect(comparison.captureSavedDraft()).toBeNull()
    dirty.value = false
    expect(comparison.captureSavedDraft()?.revision).toBe(8)
    article.value = null
    expect(comparison.captureSavedDraft()).toBeNull()
    scope.stop()
  })
})

describe('draft comparison source reads', () => {
  it('fetches the selected owned version freshly with retry disabled and a signal', async () => {
    const read = vi.fn().mockResolvedValue(version)
    vi.stubGlobal('$fetch', read)
    const { comparison, scope } = setup()
    const sources = await comparison.readSources('version-id')
    expect(read).toHaveBeenCalledWith('/api/writer/articles/article-id/versions/version-id', {
      retry: 0, signal: expect.any(AbortSignal),
    })
    expect(sources).toMatchObject({ mode: 'draft-version', baseline: { kind: 'version', versionId: 'version-id', versionNumber: 3 },
      target: { kind: 'saved-draft', revision: 7, label: 'Saved draft' } })
    await comparison.readSources('version-id')
    expect(read).toHaveBeenCalledTimes(2)
    version.tags.push('later')
    expect(sources?.baseline.tags).toEqual(['published'])
    version.tags.pop()
    scope.stop()
  })

  it.each(['dirty', 'pending', 'conflict', 'article', 'revision'] as const)(
    'rechecks %s after reads without changing saved fields', async (change) => {
      const response = deferred<typeof version>()
      vi.stubGlobal('$fetch', vi.fn(() => response.promise))
      const state = setup()
      const reading = state.comparison.readSources('version-id')
      if (change === 'article') state.article.value = { ...state.article.value!, id: 'another-article' }
      else if (change === 'revision') state.article.value!.revision++
      else state[change].value = true
      response.resolve(version)
      expect(await reading).toBeNull()
      expect(state.comparison.sources.value).toBeNull()
      expect(state.article.value!.draft.body).toBe('Saved body\n')
      state.scope.stop()
    },
  )

  it('blocks dirty requests before network access and clears prior captures on a failed reread', async () => {
    const read = vi.fn().mockResolvedValueOnce(version).mockRejectedValueOnce({ status: 404 })
    vi.stubGlobal('$fetch', read)
    const { comparison, dirty, scope } = setup()
    dirty.value = true
    expect(await comparison.readSources('version-id')).toBeNull()
    expect(read).not.toHaveBeenCalled()
    dirty.value = false
    expect(await comparison.readSources('version-id')).not.toBeNull()
    expect(await comparison.readSources('version-id')).toBeNull()
    expect(comparison.sources.value).toBeNull()
    expect(comparison.errorMessage.value).toContain('unavailable')
    scope.stop()
  })
})

describe('comparison attempt lifecycle', () => {
  it('loads a Worker lazily, accepts only current scoped results, and retains a labeled capture after later edits', async () => {
    workerBoundary()
    const { comparison, dirty, scope } = setup()
    comparison.open('version-id')
    expect(comparison.status.value).toBe('selecting')
    expect(TestWorker.instances).toHaveLength(0)
    await comparison.compare()
    expect(comparison.status.value).toBe('computing')
    const worker = TestWorker.instances[0]!
    worker.onmessage!({ data: { type: 'error', requestId: -1, articleId: 'another', code: 'comparison-failed', message: 'stale' } } as MessageEvent<ArticleComparisonResponse>)
    expect(comparison.status.value).toBe('computing')
    worker.complete()
    expect(comparison.status.value).toBe('ready')
    expect(comparison.result.value?.target).toMatchObject({ label: 'Saved draft', revision: 7 })
    expect(worker.terminated).toBe(true)
    expect(comparison.sources.value).toBeNull()
    dirty.value = true
    expect(comparison.result.value?.target).toMatchObject({ revision: 7 })
    expect(comparison.status.value).toBe('ready')
    scope.stop()
  })

  it.each(['cancel', 'close', 'selection', 'unmount', 'article', 'dirty'] as const)(
    'terminates computation and rejects late output on %s', async (action) => {
      workerBoundary()
      const state = setup()
      state.comparison.open('version-id')
      await state.comparison.compare()
      const worker = TestWorker.instances[0]!
      if (action === 'selection') state.comparison.selectedVersionId.value = 'another-version'
      else if (action === 'unmount') state.scope.stop()
      else if (action === 'article') state.article.value = { ...state.article.value!, id: 'another-article' }
      else if (action === 'dirty') state.dirty.value = true
      else state.comparison[action]()
      expect(worker.terminated).toBe(true)
      worker.complete()
      expect(state.comparison.result.value).toBeNull()
      expect(state.comparison.sources.value).toBeNull()
      expect(state.comparison.status.value).not.toBe('computing')
      state.scope.stop()
    },
  )

  it('aborts pending reads, ignores obsolete HTTP completions, and starts a fresh attempt', async () => {
    workerBoundary()
    const response = deferred<typeof version>()
    const read = vi.fn().mockReturnValueOnce(response.promise).mockResolvedValue(version)
    vi.stubGlobal('$fetch', read)
    const { comparison, scope } = setup()
    comparison.open('version-id')
    const obsolete = comparison.compare()
    expect(comparison.status.value).toBe('fetching')
    const signal = read.mock.calls[0]![1].signal as AbortSignal
    comparison.close()
    expect(signal.aborted).toBe(true)
    comparison.open('version-id')
    await comparison.compare()
    response.resolve(version)
    await obsolete
    expect(TestWorker.instances).toHaveLength(1)
    TestWorker.instances[0]!.complete()
    expect(comparison.status.value).toBe('ready')
    scope.stop()
  })

  it('fails safely for startup/runtime/message failures and can retry with a new Worker', async () => {
    workerBoundary()
    const { comparison, scope } = setup()
    comparison.open('version-id')
    vi.stubGlobal('Worker', class { constructor() { throw new Error('private startup detail') } })
    await comparison.compare()
    expect(comparison.status.value).toBe('error')
    expect(comparison.errorMessage.value).not.toContain('private')
    vi.stubGlobal('Worker', TestWorker)
    await comparison.compare()
    TestWorker.instances[0]!.onerror!()
    expect(comparison.status.value).toBe('error')
    await comparison.compare()
    TestWorker.instances[1]!.onmessageerror!()
    expect(comparison.status.value).toBe('error')
    await comparison.compare()
    TestWorker.instances[2]!.complete()
    expect(comparison.status.value).toBe('ready')
    scope.stop()
  })
})
