<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage as ChatMessageType } from '@/types'
import ChatMessage from './ChatMessage.vue'
import { toSafePromptText, usePlainTextPaste } from '@/utils/plainTextPaste'
import { createSubmitDebounce } from '@/utils/inferenceGuard'
import { Send } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    messages?: ChatMessageType[]
    streamingContent?: string
    isStreaming?: boolean
    placeholder?: string
    contextBanner?: string | null
  }>(),
  {
    messages: () => [],
    streamingContent: '',
    isStreaming: false,
    placeholder: 'Nhập câu hỏi hoặc dán công thức toán (VD: $x^2 - 5x + 6 = 0$)...',
    contextBanner: null,
  },
)

const emit = defineEmits<{
  send: [message: string]
}>()

const input = ref('')
const isSending = ref(false)
const submitDebounce = createSubmitDebounce()
const messagesRef = ref<HTMLElement | null>(null)
const onPaste = usePlainTextPaste(input)

async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

watch(() => props.messages.length, scrollToBottom)
watch(() => props.streamingContent, scrollToBottom)

watch(
  () => props.isStreaming,
  (streaming) => {
    if (!streaming) isSending.value = false
  },
)

function handleSend() {
  if (submitDebounce.shouldBlock()) return

  if (isSending.value || props.isStreaming) {
    if (import.meta.env.DEV) {
      console.warn('[Guard] Đang xử lý câu hỏi trước, chặn gửi trùng lặp')
    }
    return
  }

  const text = toSafePromptText(input.value)
  if (!text) return

  isSending.value = true
  emit('send', text)
  input.value = ''
}
</script>

<template>
  <div class="card flex h-full flex-col">
    <h3 class="mb-3 font-semibold text-slate-100">Chat Assistant</h3>

    <div
      v-if="contextBanner"
      class="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200"
    >
      {{ contextBanner }}
    </div>

    <div
      ref="messagesRef"
      class="flex-1 space-y-3 overflow-y-auto pr-1"
      style="max-height: 360px"
    >
      <div
        v-for="(msg, index) in messages"
        :key="msg.id"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <ChatMessage
          :content="msg.content"
          :role="msg.role"
          :is-streaming="isStreaming && msg.role === 'assistant' && index === messages.length - 1"
        />
      </div>

      <p v-if="!messages.length" class="py-8 text-center text-sm text-slate-500">
        Start a conversation
      </p>
    </div>

    <form class="mt-3 flex gap-2" @submit.prevent="handleSend">
      <textarea
        v-model="input"
        rows="3"
        class="input-base flex-1 resize-y"
        :placeholder="placeholder"
        :disabled="isStreaming || isSending"
        @paste.capture="onPaste"
        @keydown.enter.exact.prevent="handleSend"
      />
      <button
        type="submit"
        class="btn-primary self-end px-3"
        :disabled="!input.trim() || isStreaming || isSending"
      >
        <Send class="h-4 w-4" />
      </button>
    </form>
  </div>
</template>
