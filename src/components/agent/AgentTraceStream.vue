<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { TraceEvent } from '@/types'
import TraceTimelineItem from './TraceTimelineItem.vue'
import { useSseStream } from '@/composables/useSseStream'
import { useTraceStore } from '@/stores/trace'
import { Play, Square, Pin, PinOff } from 'lucide-vue-next'

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
const timelineRef = ref<HTMLElement | null>(null)
const pinScroll = ref(true)

const displayEvents = ref<TraceEvent[]>([])

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

async function scrollToBottom() {
  if (!pinScroll.value || !timelineRef.value) return
  await nextTick()
  timelineRef.value.scrollTop = timelineRef.value.scrollHeight
}

watch(displayEvents, () => scrollToBottom(), { deep: true })

function startStream() {
  traceStore.clearEvents()
  traceStore.setConnectionStatus('connecting')
  connect(props.sseUrl, (event) => {
    traceStore.addEvent(event)
    traceStore.setConnectionStatus('connected')
  })
}

function stopStream() {
  disconnect()
  traceStore.setConnectionStatus('disconnected')
}

onMounted(() => {
  if (props.autoConnect) startStream()
})

onUnmounted(() => {
  stopStream()
})

const statusLabel = {
  idle: 'Idle',
  connecting: 'Connecting...',
  connected: 'Live',
  error: 'Error',
  closed: 'Disconnected',
}
</script>

<template>
  <div class="card flex h-full flex-col">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <h3 class="font-semibold text-slate-100">Agent Trace</h3>
        <p class="text-xs text-slate-400">
          {{ displayEvents.length }} events ·
          <span :class="status === 'connected' ? 'text-green-400' : 'text-slate-500'">
            {{ statusLabel[status] ?? status }}
          </span>
        </p>
      </div>
      <div class="flex gap-2">
        <button
          class="btn-secondary px-2 py-1.5"
          :title="pinScroll ? 'Unpin scroll' : 'Pin scroll'"
          @click="pinScroll = !pinScroll"
        >
          <Pin v-if="pinScroll" class="h-4 w-4" />
          <PinOff v-else class="h-4 w-4" />
        </button>
        <button
          v-if="status === 'connected' || status === 'connecting'"
          class="btn-secondary px-2 py-1.5"
          @click="stopStream"
        >
          <Square class="h-4 w-4" />
        </button>
        <button v-else class="btn-primary px-2 py-1.5" @click="startStream">
          <Play class="h-4 w-4" />
          Stream
        </button>
      </div>
    </div>

    <div
      ref="timelineRef"
      class="flex-1 space-y-2 overflow-y-auto pr-1"
      style="max-height: 400px; content-visibility: auto"
    >
      <TraceTimelineItem
        v-for="event in displayEvents"
        :key="event.id"
        v-memo="[event.id, event.status, event.title]"
        :event="event"
      />
      <p v-if="!displayEvents.length" class="py-8 text-center text-sm text-slate-500">
        Click "Stream" to start receiving trace events
      </p>
    </div>
  </div>
</template>
