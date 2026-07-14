import { useToastStore } from '@/stores/toast'

export function useToast() {
  const store = useToastStore()

  return {
    success: (message: string) => store.push('success', message),
    error: (message: string) => store.push('error', message),
    info: (message: string) => store.push('info', message),
  }
}
