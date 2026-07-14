<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdownHtml } from '@/utils/renderMarkdown'
import MarkdownContent from './MarkdownContent.vue'

const props = defineProps<{
  content: string
  role: 'user' | 'assistant'
  isStreaming?: boolean
}>()

const userHtml = computed(() =>
  renderMarkdownHtml(props.content, { plainText: true }),
)
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
    <p v-if="role === 'user'" class="whitespace-pre-wrap" v-html="userHtml" />
    <MarkdownContent v-else :content="content" :is-streaming="isStreaming" />
    <span v-if="isStreaming" class="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-blue-400" />
  </div>
</template>
