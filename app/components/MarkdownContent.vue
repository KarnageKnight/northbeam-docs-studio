<script setup lang="ts">
import { renderMarkdown } from '#shared/utils/markdown'

const props = defineProps<{ source: string }>()
const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <div class="markdown-content" v-html="html" />
</template>
