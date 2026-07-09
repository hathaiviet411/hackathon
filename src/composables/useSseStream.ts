import { ref, onUnmounted } from 'vue'

export function useSseStream<T = unknown>() {
  const data = ref<T[]>([]) as { value: T[] }
  const status = ref<'idle' | 'connecting' | 'connected' | 'error' | 'closed'>('idle')
  const error = ref<string | null>(null)

  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5

  function connect(url: string, onEvent?: (item: T) => void) {
    disconnect()
    status.value = 'connecting'
    error.value = null

    eventSource = new EventSource(url)

    eventSource.onopen = () => {
      status.value = 'connected'
      reconnectAttempts = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T
        data.value.push(parsed)
        onEvent?.(parsed)
      } catch (e) {
        console.warn('SSE parse error:', e)
      }
    }

    eventSource.onerror = () => {
      status.value = 'error'
      error.value = 'Connection lost'
      eventSource?.close()
      eventSource = null

      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000)
        reconnectAttempts++
        reconnectTimer = setTimeout(() => connect(url, onEvent), delay)
      }
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    eventSource?.close()
    eventSource = null
    status.value = 'closed'
  }

  function clear() {
    data.value = []
  }

  onUnmounted(disconnect)

  return { data, status, error, connect, disconnect, clear }
}
