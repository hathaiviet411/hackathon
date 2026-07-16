<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import type { TraceEvent } from '@/types'
import AgentTraceUI from './AgentTraceUI.vue'
import { useSseStream } from '@/composables/useSseStream'
import { useTraceStore } from '@/stores/trace'
import { clearLiveTrace } from '@/services/TraceEmitter'
import { Play, Square, Trash2, Activity, Radio } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    sseUrl?: string
    events?: TraceEvent[]
    autoConnect?: boolean
  }>(),
  {
    sseUrl: '/api/mock-trace',
    autoConnect: false,
  },
)

const traceStore = useTraceStore()
const { connect, disconnect, status } = useSseStream<TraceEvent>()
const isDemoStream = ref(false)

const displayEvents = ref<TraceEvent[]>([])

const isLive = computed(() => traceStore.connectionStatus === 'connected' && !isDemoStream.value)

watch(
  () => props.events,
  (val) => {
    if (val) displayEvents.value = val
  },
  { immediate: true },
)

watch(
  () => traceStore.events,
  (val) => {
    if (!props.events) displayEvents.value = val
  },
  { deep: true },
)

function startDemoStream() {
  isDemoStream.value = true
  traceStore.clearEvents()
  traceStore.setConnectionStatus('connecting')
  connect(props.sseUrl, (event) => {
    traceStore.addEvent(event)
    traceStore.setConnectionStatus('connected')
  })
}

function stopStream() {
  disconnect()
  isDemoStream.value = false
  traceStore.setConnectionStatus(displayEvents.value.length ? 'connected' : 'disconnected')
}

function clearTrace() {
  stopStream()
  clearLiveTrace()
}

onMounted(() => {
  if (props.autoConnect) startDemoStream()
})

onUnmounted(() => {
  stopStream()
})

const statusLabel = computed(() => {
  if (isDemoStream.value) {
    return status.value === 'connected' ? 'Demo stream' : status.value
  }
  if (isLive.value || displayEvents.value.length) return 'Live'
  return 'Idle'
})
</script>

<template>
  <div class="card flex h-full flex-col">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <Activity class="h-5 w-5 text-blue-500" />
          <h3 class="text-sm font-semibold text-slate-100">Agent Trace</h3>
        </div>
        <div class="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
          <Radio
            :class="[
              'h-3 w-3',
              statusLabel === 'Live' || statusLabel === 'Demo stream' ? 'text-green-400' : 'text-slate-500',
            ]"
          />
          <span>{{ statusLabel }}</span>
          <span v-if="displayEvents.length">· {{ displayEvents.length }} bước</span>
        </div>
      </div>

      <div class="flex shrink-0 gap-1.5">
        <button
          class="btn-secondary px-2 py-1.5"
          title="Xóa trace"
          :disabled="!displayEvents.length"
          @click="clearTrace"
        >
          <Trash2 class="h-4 w-4" />
        </button>
        <button
          v-if="isDemoStream && (status === 'connected' || status === 'connecting')"
          class="btn-secondary px-2 py-1.5"
          @click="stopStream"
        >
          <Square class="h-4 w-4" />
        </button>
        <button
          v-else
          class="btn-primary px-2 py-1.5"
          title="Chạy demo trace"
          @click="startDemoStream"
        >
          <Play class="h-4 w-4" />
          <span class="hidden sm:inline">Demo</span>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto" style="max-height: 420px">
      <AgentTraceUI :traces="displayEvents" />
    </div>
  </div>
</template>
