<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import type { TraceEvent } from '@/types'
import TraceTimelineItem from './TraceTimelineItem.vue'
import { useSseStream } from '@/composables/useSseStream'
import { useTraceStore } from '@/stores/trace'
import { clearLiveTrace } from '@/services/TraceEmitter'
import { apiUrl } from '@/config/env'
import { Play, Square, Pin, PinOff, Trash2, Activity, Radio } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    sseUrl?: string
    events?: TraceEvent[]
    autoConnect?: boolean
  }>(),
  {
    sseUrl: () => apiUrl('/api/mock-trace'),
    autoConnect: false,
  },
)

const traceStore = useTraceStore()
const { connect, disconnect, status } = useSseStream<TraceEvent>()
const timelineRef = ref<HTMLElement | null>(null)
const pinScroll = ref(true)
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

async function scrollToBottom() {
  if (!pinScroll.value || !timelineRef.value) return
  await nextTick()
  timelineRef.value.scrollTop = timelineRef.value.scrollHeight
}

watch(displayEvents, () => scrollToBottom(), { deep: true })

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

const statusColor = computed(() => {
  if (statusLabel.value === 'Live' || statusLabel.value === 'Demo stream') return 'text-aurora-secondary-300'
  if (statusLabel.value === 'connecting') return 'text-status-orange'
  return 'text-fg-subtle'
})
</script>

<template>
  <div class="trace-panel relative flex h-full flex-col overflow-hidden rounded-2xl border border-aurora-primary-500/20 bg-surface-translucent p-4 shadow-glow-primary backdrop-blur-xl">
    <!-- Ambient grid -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.06]"
      style="background-image: linear-gradient(rgba(156,89,252,1) 1px, transparent 1px), linear-gradient(90deg, rgba(156,89,252,1) 1px, transparent 1px); background-size: 24px 24px;"
    />
    <!-- Scan line -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
      <div class="h-1/3 w-full animate-scan-line bg-gradient-to-b from-transparent via-aurora-primary-400 to-transparent" />
    </div>

  <!-- Header -->
    <div class="relative mb-4 flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <Activity class="h-5 w-5 text-aurora-primary-400 drop-shadow-[0_0_8px_rgba(156,89,252,0.8)]" />
          <h3 class="aurora-text font-mono text-sm font-bold uppercase tracking-[0.25em]">
            Agent Trace
          </h3>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-3">
          <span class="font-mono text-xs text-fg-muted">
            <span class="text-aurora-primary-400">{{ displayEvents.length }}</span> events
          </span>
          <span class="flex items-center gap-1.5 font-mono text-xs">
            <Radio
              :class="[
                'h-3 w-3',
                statusColor,
                (statusLabel === 'Live' || statusLabel === 'Demo stream') && 'animate-glow-pulse',
              ]"
            />
            <span :class="statusColor">{{ statusLabel }}</span>
          </span>
        </div>
        <p class="mt-1.5 max-w-sm text-[11px] leading-relaxed text-fg-subtle">
          Live events stream automatically during local/cloud inference.
        </p>
      </div>

      <div class="flex shrink-0 gap-1.5">
        <button
          class="trace-btn"
          title="Clear trace"
          :disabled="!displayEvents.length"
          @click="clearTrace"
        >
          <Trash2 class="h-4 w-4" />
        </button>
        <button
          class="trace-btn"
          :title="pinScroll ? 'Unpin scroll' : 'Pin scroll'"
          @click="pinScroll = !pinScroll"
        >
          <Pin v-if="pinScroll" class="h-4 w-4" />
          <PinOff v-else class="h-4 w-4" />
        </button>
        <button
          v-if="isDemoStream && (status === 'connected' || status === 'connecting')"
          class="trace-btn"
          @click="stopStream"
        >
          <Square class="h-4 w-4" />
        </button>
        <button v-else class="trace-btn trace-btn-primary" title="Load demo mock trace" @click="startDemoStream">
          <Play class="h-4 w-4" />
          <span class="hidden sm:inline">Demo</span>
        </button>
      </div>
    </div>

    <!-- Timeline -->
    <div
      ref="timelineRef"
      class="trace-timeline scrollbar-aurora relative flex-1 space-y-3 overflow-y-auto pr-1"
      style="max-height: 400px; content-visibility: auto"
    >
      <TraceTimelineItem
        v-for="event in displayEvents"
        :key="event.id"
        v-memo="[event.id, event.status, event.title]"
        :event="event"
      />

      <div
        v-if="!displayEvents.length"
        class="flex flex-col items-center justify-center rounded-xl border border-dashed border-aurora-primary-500/25 bg-aurora-primary-500/5 px-6 py-12 text-center backdrop-blur-sm"
      >
        <Radio class="mb-3 h-8 w-8 text-aurora-primary-500/40" />
        <p class="font-mono text-xs uppercase tracking-widest text-fg-subtle">No trace signal</p>
        <p class="mt-2 max-w-xs text-sm text-fg-muted">
          Run inference to see live trace events, or click Demo for a mock stream.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trace-btn {
  @apply inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-surface-muted px-2.5 py-1.5 text-sm text-fg-muted backdrop-blur-sm transition hover:border-aurora-primary-400/40 hover:bg-aurora-primary-500/10 hover:text-aurora-primary-400 disabled:cursor-not-allowed disabled:opacity-40;
}

.trace-btn-primary {
  @apply border-aurora-primary-500/40 bg-aurora-primary-500/10 text-aurora-primary-400 hover:bg-aurora-primary-500/20;
  box-shadow: 0 0 10px rgba(156, 89, 252, 0.4), 0 0 20px rgba(156, 89, 252, 0.2);
}
</style>
