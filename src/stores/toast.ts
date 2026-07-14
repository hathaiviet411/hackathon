import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  message: string
  open: boolean
}

const AUTO_DISMISS_MS = 4000

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])

  function push(variant: ToastVariant, message: string) {
    const id = crypto.randomUUID()
    toasts.value.push({ id, variant, message, open: true })
    setTimeout(() => close(id), AUTO_DISMISS_MS)
  }

  function close(id: string) {
    const toast = toasts.value.find((t) => t.id === id)
    if (toast) toast.open = false
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 250)
  }

  return { toasts, push, close }
})
