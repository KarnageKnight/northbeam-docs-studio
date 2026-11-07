<script setup lang="ts">
import type { WriterArticle } from '../../../../shared/types/articles'

const draft = reactive({ title: '', slug: '' })
const pending = ref(false)
const errorMessage = ref('')
const fieldErrors = ref<Record<string, string[]>>({})
useHead({ title: 'New article · Northbeam Docs Studio' })

async function createDraft() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  fieldErrors.value = {}
  try {
    const article = await $fetch<WriterArticle>('/api/writer/articles', {
      method: 'POST', body: { title: draft.title, slug: draft.slug }, retry: 0,
    })
    await navigateTo(`/writer/articles/${article.id}`)
  }
  catch (error) {
    const failure = error as { data?: { data?: { code?: string; fieldErrors?: Record<string, string[]> } } }
    const details = failure.data?.data
    fieldErrors.value = details?.fieldErrors ?? {}
    if (details?.code === 'SLUG_CONFLICT') {
      fieldErrors.value.slug = ['This slug is already in use. Choose another.']
      errorMessage.value = 'Choose another slug to create your draft.'
    }
    else if (details?.code === 'VALIDATION_ERROR') errorMessage.value = 'Check the highlighted fields and try again.'
    else errorMessage.value = 'We could not create your draft. Your text is still here. Please try again.'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="form-page">
    <NuxtLink to="/writer/articles" class="back-link">← Writer articles</NuxtLink>
    <h1>New article</h1><p class="muted form-description">Start with a title and a permanent URL.</p>
    <div v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</div>
    <form class="surface form-box" :aria-busy="pending" novalidate @submit.prevent="createDraft">
      <div class="field">
        <label for="title">Title</label>
        <input id="title" v-model="draft.title" name="title" :disabled="pending" :aria-invalid="!!fieldErrors.title?.length" aria-describedby="title-hint title-error" required>
        <span id="title-hint" class="hint">Required. Up to 200 Unicode characters.</span>
        <span id="title-error" class="field-error">{{ fieldErrors.title?.join(' ') }}</span>
      </div>
      <div class="field">
        <label for="slug">Slug</label>
        <input id="slug" v-model="draft.slug" name="slug" :disabled="pending" :aria-invalid="!!fieldErrors.slug?.length" aria-describedby="slug-hint slug-error" required>
        <span id="slug-hint" class="hint">Lowercase letters, numbers, and single hyphens. Up to 100 characters.<br>The slug cannot change after creation.</span>
        <span id="slug-error" class="field-error">{{ fieldErrors.slug?.join(' ') }}</span>
      </div>
      <div class="form-actions">
        <button type="submit" class="button primary" :disabled="pending">{{ pending ? 'Creating…' : 'Create draft' }}</button>
        <NuxtLink v-if="!pending" to="/writer/articles" class="button quiet">Cancel</NuxtLink>
      </div>
    </form>
  </div>
</template>
