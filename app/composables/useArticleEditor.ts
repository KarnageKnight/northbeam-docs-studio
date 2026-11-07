import type { WriterArticle } from '../../shared/types/articles'

export async function useArticleEditor(articleId: string) {
  const url = `/api/writer/articles/${encodeURIComponent(articleId)}`
  const { data, error } = await useFetch<WriterArticle>(url)
  const article = ref<WriterArticle | null>(data.value ?? null)
  const loadError = ref<{ statusCode?: number } | null>(error.value ?? null)
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
      const failure = error as { data?: { data?: { code?: string; fieldErrors?: Record<string, string[]> } } }
      const details = failure.data?.data
      fieldErrors.value = details?.fieldErrors ?? {}
      if (details?.code === 'STALE_REVISION') {
        conflict.value = true
        errorMessage.value = 'This article changed in another tab or session. Your local text is still here.'
      }
      else if (details?.code === 'VALIDATION_ERROR') errorMessage.value = 'Check the highlighted fields and try again.'
      else errorMessage.value = 'We could not save your draft. Your local text is still here. Please try again.'
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
    }
    catch (error) {
      if (!article.value) loadError.value = error as { statusCode?: number }
      errorMessage.value = 'We could not reload the saved draft. Your local text is still here.'
    }
    finally { pending.value = false }
  }

  return { article, draft, tagsText, dirty, pending, conflict, loadError, fieldErrors, errorMessage, successMessage, save, reload }
}
