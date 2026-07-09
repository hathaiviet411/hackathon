import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AiBackend, AiEngineState, AiRoutingMode } from '@/types'

export const useAiEngineStore = defineStore('aiEngine', () => {
  const engineState = ref<AiEngineState>('idle')
  const activeBackend = ref<AiBackend | null>(null)
  const routingMode = ref<AiRoutingMode>('auto')
  const modelProgress = ref(0)
  const errorMessage = ref<string | null>(null)
  const isOnline = ref(navigator.onLine)

  const badgeLabel = computed(() => {
    if (!isOnline.value && activeBackend.value !== 'edge') return 'Offline'
    if (engineState.value === 'error') return 'Engine Error'
    if (engineState.value === 'loading') return 'Edge (Loading...)'
    if (activeBackend.value === 'edge') return 'Edge (Local)'
    if (activeBackend.value === 'cloud') return 'Cloud'
    return 'Not Ready'
  })

  const badgeVariant = computed(() => {
    if (!isOnline.value && activeBackend.value !== 'edge') return 'offline' as const
    if (engineState.value === 'error') return 'error' as const
    if (engineState.value === 'loading') return 'loading' as const
    if (activeBackend.value === 'edge') return 'edge' as const
    if (activeBackend.value === 'cloud') return 'cloud' as const
    return 'idle' as const
  })

  function setEngineState(state: AiEngineState) {
    engineState.value = state
  }

  function setActiveBackend(backend: AiBackend | null) {
    activeBackend.value = backend
  }

  function setRoutingMode(mode: AiRoutingMode) {
    routingMode.value = mode
  }

  function setModelProgress(progress: number) {
    modelProgress.value = progress
  }

  function setError(message: string | null) {
    errorMessage.value = message
    if (message) engineState.value = 'error'
  }

  function setOnline(online: boolean) {
    isOnline.value = online
  }

  return {
    engineState,
    activeBackend,
    routingMode,
    modelProgress,
    errorMessage,
    isOnline,
    badgeLabel,
    badgeVariant,
    setEngineState,
    setActiveBackend,
    setRoutingMode,
    setModelProgress,
    setError,
    setOnline,
  }
})
