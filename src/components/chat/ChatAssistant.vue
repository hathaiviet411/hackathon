<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { ChatMessage as ChatMessageType } from '@/types'
import ChatMessage from './ChatMessage.vue'
import { toSafePromptText, usePlainTextPaste } from '@/utils/plainTextPaste'
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
    placeholder: 'Nhập câu hỏi hoặc dán công thức toán (VD: $x^2 - 5x + 6 = 0$)...',
  },
)

const emit = defineEmits<{
  send: [message: string]
}>()

const input = ref('')
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

function handleSend() {
  const text = toSafePromptText(input.value)
  if (!text || props.isStreaming) return
  emit('send', text)
  input.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  handleSend()
}
</script>

<template>
  <div class="card flex h-full min-h-0 flex-col">
    <h3 class="mb-3 shrink-0 font-semibold text-fg">Chat Assistant</h3>

    <div
      ref="messagesRef"
      class="scrollbar-aurora min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
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

      <p v-if="!messages.length" class="py-8 text-center text-sm text-fg-subtle">
        Start a conversation
      </p>
    </div>

    <form class="mt-3 flex shrink-0 gap-2" @submit.prevent="handleSend">
      <textarea
        v-model="input"
        rows="3"
        class="input-base flex-1 resize-y"
        :placeholder="placeholder"
        :disabled="isStreaming"
        @paste.capture="onPaste"
        @keydown="onKeydown"
      />
      <button type="submit" class="btn-primary self-end px-3" :disabled="!input.trim() || isStreaming">
        <Send class="h-4 w-4" />
      </button>
    </form>
  </div>
</template>
