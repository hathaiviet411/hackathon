<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage as ChatMessageType } from '@/types'
import ChatMessage from './ChatMessage.vue'
import { Send } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    messages?: ChatMessageType[]
    streamingContent?: string
    isStreaming?: boolean
    placeholder?: string
  }>(),
  {
    messages: () => [],
    streamingContent: '',
    isStreaming: false,
    placeholder: 'Type a message...',
  },
)

const emit = defineEmits<{
  send: [message: string]
}>()

const input = ref('')
const messagesRef = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

watch(() => props.messages.length, scrollToBottom)
watch(() => props.streamingContent, scrollToBottom)

function handleSend() {
  const text = input.value.trim()
  if (!text || props.isStreaming) return
  emit('send', text)
  input.value = ''
}
</script>

<template>
  <div class="card flex h-full flex-col">
    <h3 class="mb-3 font-semibold text-slate-100">Chat Assistant</h3>

    <div
      ref="messagesRef"
      class="flex-1 space-y-3 overflow-y-auto pr-1"
      style="max-height: 360px"
    >
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <ChatMessage :content="msg.content" :role="msg.role" />
      </div>

      <div v-if="isStreaming || streamingContent" class="flex justify-start">
        <ChatMessage
          :content="streamingContent"
          role="assistant"
          :is-streaming="isStreaming"
        />
      </div>

      <p v-if="!messages.length && !streamingContent" class="py-8 text-center text-sm text-slate-500">
        Start a conversation
      </p>
    </div>

    <form class="mt-3 flex gap-2" @submit.prevent="handleSend">
      <input
        v-model="input"
        type="text"
        class="input-base flex-1"
        :placeholder="placeholder"
        :disabled="isStreaming"
      />
      <button type="submit" class="btn-primary px-3" :disabled="!input.trim() || isStreaming">
        <Send class="h-4 w-4" />
      </button>
    </form>
  </div>
</template>
