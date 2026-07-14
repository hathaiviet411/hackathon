<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import { ToastProvider, ToastPortal, ToastViewport, ToastRoot, ToastTitle, ToastClose } from 'radix-vue'
import { CheckCircle2, XCircle, Info, X } from 'lucide-vue-next'

const toastStore = useToastStore()

const iconFor = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const accentFor = {
  success: 'border-aurora-secondary-300/40 text-aurora-secondary-400',
  error: 'border-status-red/40 text-status-red',
  info: 'border-aurora-primary-500/40 text-aurora-primary-400',
}
</script>

<template>
  <ToastProvider swipe-direction="right">
    <ToastRoot
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      :open="toast.open"
      class="glass-panel data-[state=open]:animate-fade-in flex w-full items-start gap-3 border p-3.5 shadow-lg"
      :class="accentFor[toast.variant]"
      @update:open="(value) => { if (!value) toastStore.close(toast.id) }"
    >
      <component :is="iconFor[toast.variant]" class="mt-0.5 h-5 w-5 shrink-0" />
      <ToastTitle class="flex-1 text-sm font-medium text-fg">{{ toast.message }}</ToastTitle>
      <ToastClose class="cursor-pointer text-fg-subtle transition-colors hover:text-fg" aria-label="Dismiss">
        <X class="h-4 w-4" />
      </ToastClose>
    </ToastRoot>

    <ToastPortal>
      <ToastViewport
        class="fixed bottom-4 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none"
      />
    </ToastPortal>
  </ToastProvider>
</template>
