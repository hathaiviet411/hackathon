import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage } from '@/types'
import { AiGateway } from '@/services/AiGateway'
import { useAiEngineStore } from '@/stores/aiEngine'
import { toSafePromptText } from '@/utils/plainTextPaste'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)
  const isOpen = ref(false)

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  async function runInference(prompt: string) {
    const aiStore = useAiEngineStore()
    if (aiStore.engineState === 'idle') {
      await AiGateway.init({ mode: aiStore.routingMode })
    }

    const assistantId = crypto.randomUUID()
    isStreaming.value = true
    messages.value.push({ id: assistantId, role: 'assistant', content: '' })

    try {
      await AiGateway.generate(
        prompt,
        {
          onToken: (token) => {
            const msg = messages.value.find((m) => m.id === assistantId)
            if (msg && token) msg.content += token
          },
        },
        aiStore.routingMode,
        { session: 'chat' },
      )
    } catch (e) {
      const msg = messages.value.find((m) => m.id === assistantId)
      if (msg && !msg.content.trim()) {
        msg.content = e instanceof Error ? e.message : 'Inference failed'
      }
    } finally {
      isStreaming.value = false
      messages.value = messages.value.filter(
        (m) => m.role !== 'assistant' || m.content.trim().length > 0,
      )
    }
  }

  function send(rawMessage: string) {
    const content = toSafePromptText(rawMessage)
    if (!content) return
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content,
    })
    runInference(content)
  }

  function clear() {
    messages.value = []
  }

  return { messages, isStreaming, isOpen, open, close, toggle, send, clear }
})
