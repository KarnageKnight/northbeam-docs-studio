import type { VersionDetail, VersionSummary, WriterArticle } from '../../shared/types/articles'

export async function useArticleEditor(articleId: string) {
  const url = `/api/writer/articles/${encodeURIComponent(articleId)}`
  const articleRequest = useFetch<WriterArticle>(url)
  const historyRequest = useFetch<VersionSummary[]>(`${url}/versions`, { retry: 0 })
  const [{ data, error }, { data: history, status: historyStatus, error: historyError, refresh: refreshHistory }] = await Promise.all([articleRequest, historyRequest])
  const article = ref<WriterArticle | null>(data.value ?? null)
  const loadError = ref<{ status?: number } | null>(error.value ?? null)
  const inspectedVersion = ref<VersionDetail | null>(null)
  const selectedVersionId = ref<string | null>(null)
  const inspectionPending = ref(false)
  const inspectionError = ref('')
  const draft = reactive({ title: article.value?.draft.title ?? '', body: article.value?.draft.body ?? '' })
  const tagsText = ref(article.value?.draft.tags.join(', ') ?? '')
  const pending = ref(false)
  const conflict = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const fieldErrors = ref<Record<string, string[]>>({})
  const localContent = () => ({ title: draft.title, body: draft.body, tags: tagsText.value })
  const sameContent = (left: ReturnType<typeof localContent>, right: ReturnType<typeof localContent>) =>
    left.title === right.title && left.body === right.body && left.tags === right.tags
  const dirty = computed(() => !!article.value && !sameContent(localContent(), {
    title: article.value.draft.title, body: article.value.draft.body, tags: article.value.draft.tags.join(', '),
  }))
  const publishDisabledReason = computed(() => dirty.value
    ? 'Save your draft before publishing.'
    : !article.value?.draft.title.trim() || !article.value.draft.body.trim()
        ? 'Save a nonblank title and body before publishing.' : '')

  function reportWriteError(error: unknown, action: 'save' | 'publish' | 'unpublish') {
    const failure = error as { data?: { data?: { code?: string; fieldErrors?: Record<string, string[]> } } }
    const details = failure.data?.data
    fieldErrors.value = details?.fieldErrors ?? {}
    if (details?.code === 'STALE_REVISION') {
      conflict.value = true
      errorMessage.value = 'This article changed in another tab or session. Your local text is still here.'
    }
    else if (details?.code === 'INVALID_PUBLICATION_STATE') {
      conflict.value = true
      errorMessage.value = 'This article is not currently published. Your local text is still here. Reload the saved article before trying again.'
    }
    else if (details?.code === 'VALIDATION_ERROR') errorMessage.value = 'Check the highlighted fields and try again.'
    else errorMessage.value = `We could not ${action} your ${action === 'save' ? 'draft' : 'article'}. Your local text is still here. Please try again.`
  }

  function acceptSaved(saved: WriterArticle, submitted: ReturnType<typeof localContent>) {
    const unchanged = sameContent(localContent(), submitted)
    article.value = saved
    if (unchanged) {
      draft.title = saved.draft.title
      draft.body = saved.draft.body
      tagsText.value = saved.draft.tags.join(', ')
    }
  }

  async function save() {
    if (pending.value || conflict.value || !article.value) return
    const submitted = localContent()
    const expectedRevision = article.value.revision
    pending.value = true
    errorMessage.value = ''
    successMessage.value = ''
    fieldErrors.value = {}
    try {
      const saved = await $fetch<WriterArticle>(`${url}/draft`, {
        method: 'PUT', retry: 0,
        body: { title: submitted.title, body: submitted.body, tags: submitted.tags.split(','), expectedRevision },
      })
      acceptSaved(saved, submitted)
      successMessage.value = dirty.value ? 'Draft saved. Newer local edits are still unsaved.' : 'Draft saved.'
    }
    catch (error) {
      reportWriteError(error, 'save')
    }
    finally { pending.value = false }
  }

  async function publish() {
    if (pending.value || conflict.value || publishDisabledReason.value || !article.value) return
    const submitted = localContent()
    const expectedRevision = article.value.revision
    pending.value = true
    errorMessage.value = ''
    successMessage.value = ''
    fieldErrors.value = {}
    try {
      const published = await $fetch<WriterArticle>(`${url}/publish`, {
        method: 'POST', retry: 0, body: { expectedRevision },
      })
      acceptSaved(published, submitted)
      successMessage.value = 'Article published. A new version was created.'
      await refreshHistory()
    }
    catch (error) {
      reportWriteError(error, 'publish')
    }
    finally { pending.value = false }
  }

  async function reload() {
    if (pending.value) return
    const beforeReload = localContent()
    pending.value = true
    errorMessage.value = ''
    successMessage.value = ''
    try {
      const saved = await $fetch<WriterArticle>(url, { retry: 0 })
      acceptSaved(saved, beforeReload)
      loadError.value = null
      conflict.value = false
      fieldErrors.value = {}
      successMessage.value = dirty.value ? 'Saved draft loaded. Newer local edits were kept.' : 'Saved draft loaded.'
      await refreshHistory()
    }
    catch (error) {
      if (!article.value) loadError.value = error as { status?: number }
      errorMessage.value = 'We could not reload the saved draft. Your local text is still here.'
    }
    finally { pending.value = false }
  }

  async function unpublish() {
    if (pending.value || conflict.value || article.value?.status !== 'published') return
    const expectedRevision = article.value.revision
    pending.value = true
    errorMessage.value = ''
    successMessage.value = ''
    fieldErrors.value = {}
    try {
      article.value = await $fetch<WriterArticle>(`${url}/unpublish`, {
        method: 'POST', retry: 0, body: { expectedRevision },
      })
      successMessage.value = 'Article unpublished. It is no longer publicly available.'
    }
    catch (error) {
      reportWriteError(error, 'unpublish')
    }
    finally { pending.value = false }
  }

  async function inspectVersion(versionId: string) {
    if (inspectionPending.value || !article.value) return
    selectedVersionId.value = versionId
    inspectedVersion.value = null
    inspectionError.value = ''
    inspectionPending.value = true
    try {
      inspectedVersion.value = await $fetch<VersionDetail>(`${url}/versions/${encodeURIComponent(versionId)}`, { retry: 0 })
    }
    catch (error) {
      inspectionError.value = (error as { status?: number }).status === 404
        ? 'This version is no longer available. Refresh history to see available versions.'
        : 'We could not load this version. Please try again.'
    }
    finally { inspectionPending.value = false }
  }

  return { article, draft, tagsText, dirty, pending, conflict, publishDisabledReason, loadError, fieldErrors, errorMessage, successMessage, save, publish, unpublish, reload,
    history, historyStatus, historyError, refreshHistory, inspectedVersion, selectedVersionId, inspectionPending, inspectionError, inspectVersion }
}
