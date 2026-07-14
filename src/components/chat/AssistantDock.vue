<script setup lang="ts">
import { useChatStore } from '@/stores/chat'
import ChatAssistant from './ChatAssistant.vue'
import { Bot, X } from 'lucide-vue-next'

const chatStore = useChatStore()
</script>

<template>
  <button
    v-if="!chatStore.isOpen"
    class="fixed bottom-5 right-5 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-aurora text-white shadow-glow-primary transition-transform hover:scale-105 active:scale-95"
    aria-label="Open assistant"
    @click="chatStore.open()"
  >
    <Bot class="h-6 w-6" />
    <span
      v-if="chatStore.messages.length"
      class="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-canvas bg-aurora-secondary-300"
      aria-hidden="true"
    />
  </button>

  <div
    v-if="chatStore.isOpen"
    class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
    @click="chatStore.close()"
  />

  <div
    :class="[
      'fixed z-50 flex flex-col overflow-hidden border-surface-border bg-surface shadow-2xl transition-transform duration-300',
      'inset-x-0 bottom-0 h-[85dvh] rounded-t-2xl border-t',
      'md:inset-y-0 md:right-0 md:left-auto md:h-dvh md:w-[26rem] md:rounded-l-2xl md:rounded-t-none md:border-l md:border-t-0',
      chatStore.isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full',
    ]"
  >
    <div class="flex items-center justify-between border-b border-surface-border px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-aurora">
          <Bot class="h-4 w-4 text-white" />
        </span>
        <span class="text-sm font-semibold text-fg">Assistant</span>
      </div>
      <button
        class="btn-ghost cursor-pointer rounded-lg p-1.5"
        aria-label="Close assistant"
        @click="chatStore.close()"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <ChatAssistant
      class="min-h-0 flex-1 !rounded-none !border-0 !shadow-none"
      :messages="chatStore.messages"
      :is-streaming="chatStore.isStreaming"
      @send="chatStore.send"
    />
  </div>
</template>
