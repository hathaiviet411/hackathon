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

  function updateEvent(id: string, patch: Partial<Omit<TraceEvent, 'id'>>) {
    const index = events.value.findIndex((e) => e.id === id)
    if (index === -1) return false

    const current = events.value[index]
    events.value[index] = {
      ...current,
      ...patch,
      id: current.id,
      timestamp: patch.timestamp ?? Date.now(),
    }
    // Replace array reference so subscribers re-render reliably
    events.value = [...events.value]
    return true
  }

  /** Mark every RUNNING step as terminal — safety net when stream closes */
  function finalizeRunningSteps(
    status: Extract<TraceEvent['status'], 'SUCCESS' | 'ERROR'>,
    detail?: string,
  ) {
    let changed = false
    events.value = events.value.map((event) => {
      if (event.status !== 'RUNNING') return event
      changed = true
      return {
        ...event,
        status,
        detail: detail ?? event.detail,
        timestamp: Date.now(),
      }
    })
    return changed
  }

  const isTracing = computed(() => events.value.some((e) => e.status === 'RUNNING'))

  function clearEvents() {
    events.value = []
  }

  function setConnectionStatus(status: typeof connectionStatus.value) {
    connectionStatus.value = status
  }

  const eventCount = computed(() => events.value.length)

  return {
    events,
    connectionStatus,
    eventCount,
    isTracing,
    addEvent,
    updateEvent,
    finalizeRunningSteps,
    clearEvents,
    setConnectionStatus,
  }
})
