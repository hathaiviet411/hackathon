<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdownHtml } from '@/utils/renderMarkdown'

const props = withDefaults(
  defineProps<{
    content: string
    isStreaming?: boolean
  }>(),
  {
    isStreaming: false,
  },
)

const html = computed(() =>
  renderMarkdownHtml(props.content, { streaming: props.isStreaming }),
)
</script>

<template>
  <div
    class="math-renderer prose prose-invert prose-sm max-w-none [&_code]:rounded [&_code]:bg-slate-700 [&_code]:px-1 [&_pre]:bg-slate-900"
    v-html="html"
  />
</template>

<style scoped>
.math-renderer {
  line-height: 1.6;
}

.math-renderer :deep(.katex) {
  font-size: 1.1em;
  text-rendering: auto;
}

.math-renderer :deep(.katex-display) {
  margin: 1em 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.2em 0;
}
</style>
