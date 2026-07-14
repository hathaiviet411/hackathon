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
      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
      role === 'user'
        ? 'ml-auto bg-primary text-primary-foreground'
        : 'bg-surface-muted text-fg',
    ]"
  >
    <p v-if="role === 'user'" class="whitespace-pre-wrap" v-html="userHtml" />
    <MarkdownContent v-else :content="content" :is-streaming="isStreaming" />
    <span v-if="isStreaming" class="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-aurora-primary-400" />
  </div>
</template>
