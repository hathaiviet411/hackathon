import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TraceEvent } from '@/types'

const MAX_EVENTS = 500

export const useTraceStore = defineStore('trace', () => {
  const events = ref<TraceEvent[]>([])
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')

  function addEvent(event: TraceEvent) {
    events.value.push(event)
    if (events.value.length > MAX_EVENTS) {
      events.value = events.value.slice(-MAX_EVENTS)
    }
  }

  function clearEvents() {
    events.value = []
  }

  function setConnectionStatus(status: typeof connectionStatus.value) {
    connectionStatus.value = status
  }

  const eventCount = computed(() => events.value.length)

  return { events, connectionStatus, eventCount, addEvent, clearEvents, setConnectionStatus }
})
