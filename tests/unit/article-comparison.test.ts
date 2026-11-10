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

describe('historical comparison capture', () => {
  it('reads arbitrary same-article pairs freshly while preserving unrelated dirty/conflicted drafts', async () => {
    const snapshots = {
      first: { ...version, id: 'first', versionNumber: 1, tags: ['first'] },
      third: { ...version, id: 'third', versionNumber: 3, body: 'Third body', tags: ['third'] },
    }
    const read = vi.fn((url: string) => Promise.resolve(snapshots[url.endsWith('/first') ? 'first' : 'third']))
    vi.stubGlobal('$fetch', read)
    const state = setup()
    state.article.value!.status = 'unpublished'
    state.dirty.value = true
    state.conflict.value = true
    state.comparison.mode.value = 'version-version'
    state.comparison.targetVersionId.value = 'third'
    expect(state.comparison.blockedReason.value).toBe('')
    const pair = await state.comparison.readSources('first')
    expect(pair).toMatchObject({ mode: 'version-version', baseline: { versionId: 'first', versionNumber: 1 }, target: { versionId: 'third', versionNumber: 3 } })
    expect(read).toHaveBeenCalledTimes(2)
    expect(read).toHaveBeenCalledWith('/api/writer/articles/article-id/versions/third', { retry: 0, signal: expect.any(AbortSignal) })
    snapshots.first.tags.push('later')
    expect(pair?.baseline.tags).toEqual(['first'])
    await state.comparison.readSources('first')
    expect(read).toHaveBeenCalledTimes(4)
    expect(state.article.value!.draft.body).toBe('Saved body\n')
    expect(state.dirty.value && state.conflict.value).toBe(true)
    state.scope.stop()
  })

  it('uses one fresh owned read per same-source attempt', async () => {
    const read = vi.fn().mockResolvedValue(version)
    vi.stubGlobal('$fetch', read)
    const { comparison, scope } = setup()
    comparison.mode.value = 'version-version'
    comparison.targetVersionId.value = 'version-id'
    expect(await comparison.readSources('version-id')).toMatchObject({ mode: 'version-version', baseline: { versionId: 'version-id' }, target: { versionId: 'version-id' } })
    expect(read).toHaveBeenCalledTimes(1)
    await comparison.readSources('version-id')
    expect(read).toHaveBeenCalledTimes(2)
    scope.stop()
  })

  it('rejects an unavailable side without substitution or retained output', async () => {
    const read = vi.fn().mockResolvedValueOnce(version).mockRejectedValueOnce({ status: 404 })
    vi.stubGlobal('$fetch', read)
    const { comparison, scope } = setup()
    comparison.mode.value = 'version-version'
    comparison.targetVersionId.value = 'missing'
    expect(await comparison.readSources('version-id')).toBeNull()
    expect(comparison.sources.value).toBeNull()
    expect(comparison.result.value).toBeNull()
    expect(comparison.errorMessage.value).toContain('unavailable')
    scope.stop()
  })

  it('still blocks new historical reads during an active lifecycle write', async () => {
    const read = vi.fn()
    vi.stubGlobal('$fetch', read)
    const { comparison, pending, scope } = setup()
    comparison.mode.value = 'version-version'
    comparison.targetVersionId.value = 'version-id'
    pending.value = true
    expect(await comparison.readSources('version-id')).toBeNull()
    expect(read).not.toHaveBeenCalled()
    scope.stop()
  })

  it('permits unrelated revision/dirty/conflict changes during a historical read', async () => {
    const response = deferred<typeof version>()
    vi.stubGlobal('$fetch', vi.fn(() => response.promise))
    const state = setup()
    state.comparison.mode.value = 'version-version'
    state.comparison.targetVersionId.value = 'version-id'
    const reading = state.comparison.readSources('version-id')
    state.article.value!.revision++
    state.dirty.value = true
    state.conflict.value = true
    response.resolve(version)
    expect(await reading).toMatchObject({ mode: 'version-version' })
    state.scope.stop()
  })

  it('computes historical results independently of the unrelated draft revision', async () => {
    workerBoundary()
    const state = setup()
    state.comparison.open('version-id')
    state.comparison.mode.value = 'version-version'
    state.dirty.value = true
    state.conflict.value = true
    await state.comparison.compare()
    state.article.value!.revision++
    expect(state.comparison.status.value).toBe('computing')
    TestWorker.instances[0]!.complete()
    expect(state.comparison.result.value).toMatchObject({ mode: 'version-version', identical: true,
      target: { label: 'Version 3', versionId: 'version-id' } })
    expect(state.conflict.value && state.dirty.value).toBe(true)
    state.scope.stop()
  })
})

describe('historical roles and supersession', () => {
  it('reverses selected UUID roles with fresh reads and reversed tag changes', async () => {
    workerBoundary()
    const read = vi.fn((url: string) => Promise.resolve(url.endsWith('/first')
      ? { ...version, id: 'first', versionNumber: 1, body: 'Shared old body', tags: ['old'] }
      : { ...version, id: 'third', versionNumber: 3, body: 'Shared new body', tags: ['new'] }))
    vi.stubGlobal('$fetch', read)
    const { comparison, scope } = setup()
    comparison.open('first', 'third')
    comparison.mode.value = 'version-version'
    await comparison.compare()
    TestWorker.instances[0]!.complete()
    expect(comparison.result.value?.tags).toMatchObject({ added: ['new'], removed: ['old'] })
    await comparison.reverse()
    expect(comparison.selectedVersionId.value).toBe('third')
    expect(comparison.targetVersionId.value).toBe('first')
    expect(read).toHaveBeenCalledTimes(4)
    expect(TestWorker.instances[1]!.request).toMatchObject({ baseline: { versionId: 'third' }, target: { versionId: 'first' } })
    TestWorker.instances[1]!.complete()
    expect(comparison.result.value?.tags).toMatchObject({ added: ['old'], removed: ['new'] })
    scope.stop()
  })

  it('reverses identical UUID selections as a fresh one-read attempt', async () => {
    workerBoundary()
    const { comparison, scope } = setup()
    comparison.open('version-id')
    comparison.mode.value = 'version-version'
    await comparison.compare()
    TestWorker.instances[0]!.complete()
    await comparison.reverse()
    expect(TestWorker.instances[1]!.request!.requestId).toBeGreaterThan(TestWorker.instances[0]!.request!.requestId)
    TestWorker.instances[1]!.complete()
    expect(comparison.result.value?.identical).toBe(true)
    scope.stop()
  })

  it.each(['baseline', 'target', 'mode'] as const)('terminates historical computation on %s changes', async (change) => {
    workerBoundary()
    const { comparison, scope } = setup()
    comparison.open('version-id')
    comparison.mode.value = 'version-version'
    await comparison.compare()
    const obsolete = TestWorker.instances[0]!
    if (change === 'mode') comparison.mode.value = 'draft-version'
    else if (change === 'baseline') comparison.selectedVersionId.value = 'changed-version'
    else comparison.targetVersionId.value = 'changed-version'
    expect(obsolete.terminated).toBe(true)
    obsolete.complete()
    expect(comparison.result.value).toBeNull()
    expect(comparison.status.value).toBe('selecting')
    scope.stop()
  })

  it('rejects obsolete HTTP after switching modes away and back to the same selections', async () => {
    workerBoundary()
    const response = deferred<typeof version>()
    const read = vi.fn().mockReturnValueOnce(response.promise).mockResolvedValue(version)
    vi.stubGlobal('$fetch', read)
    const { comparison, scope } = setup()
    comparison.open('version-id')
    comparison.mode.value = 'version-version'
    const obsolete = comparison.compare()
    comparison.mode.value = 'draft-version'
    comparison.mode.value = 'version-version'
    expect((read.mock.calls[0]![1].signal as AbortSignal).aborted).toBe(true)
    await comparison.compare()
    response.resolve(version)
    await obsolete
    expect(TestWorker.instances).toHaveLength(1)
    TestWorker.instances[0]!.complete()
    expect(comparison.result.value?.mode).toBe('version-version')
    scope.stop()
  })

  it.each(['article', 'unmount'] as const)('cleans up historical work on %s navigation', async (change) => {
    workerBoundary()
    const state = setup()
    state.comparison.open('version-id')
    state.comparison.mode.value = 'version-version'
    await state.comparison.compare()
    const obsolete = TestWorker.instances[0]!
    if (change === 'article') state.article.value = { ...state.article.value!, id: 'different-article' }
    else state.scope.stop()
    obsolete.complete()
    expect(obsolete.terminated).toBe(true)
    expect(state.comparison.status.value).toBe('closed')
    expect(state.comparison.result.value).toBeNull()
    state.scope.stop()
  })
})
