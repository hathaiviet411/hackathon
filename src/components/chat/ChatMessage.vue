<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const props = defineProps<{
  content: string
  role: 'user' | 'assistant'
  isStreaming?: boolean
}>()

const renderedHtml = computed(() => {
  if (props.role === 'user') return DOMPurify.sanitize(props.content)
  const html = marked.parse(props.content, { async: false }) as string
  return DOMPurify.sanitize(html)
})
</script>

<template>
  <div
    :class="[
      'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
      role === 'user'
        ? 'ml-auto bg-blue-600 text-white'
        : 'bg-slate-800 text-slate-200',
    ]"
  >
    <div
      v-if="role === 'assistant'"
      class="prose prose-invert prose-sm max-w-none [&_code]:rounded [&_code]:bg-slate-700 [&_code]:px-1 [&_pre]:bg-slate-900"
      v-html="renderedHtml"
    />
    <p v-else class="whitespace-pre-wrap">{{ content }}</p>
    <span v-if="isStreaming" class="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-blue-400" />
  </div>
</template>
