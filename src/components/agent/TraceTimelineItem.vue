<script setup lang="ts">
import { ref } from 'vue'
import type { TraceEvent, TraceEventType } from '@/types'
import TraceStatusIcon from './TraceStatusIcon.vue'
import { Route, Brain, Wrench, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-vue-next'

defineProps<{
  event: TraceEvent
}>()

const expanded = ref(false)

const typeConfig: Record<TraceEventType, { icon: typeof Route; color: string; label: string }> = {
  ROUTER: { icon: Route, color: 'border-purple-500', label: 'Router' },
  PLANNER: { icon: Brain, color: 'border-blue-500', label: 'Planner' },
  TOOL_CALL: { icon: Wrench, color: 'border-amber-500', label: 'Tool' },
  HUMAN_ESCALATION: { icon: AlertTriangle, color: 'border-orange-500', label: 'Escalation' },
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString()
}
</script>

<template>
  <div
    :class="[
      'animate-fade-in rounded-lg border-l-4 bg-slate-800/50 p-3',
      typeConfig[event.type].color,
    ]"
  >
    <div class="flex items-start gap-3">
      <component :is="typeConfig[event.type].icon" class="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-slate-500">
              {{ typeConfig[event.type].label }}
            </span>
            <TraceStatusIcon :status="event.status" />
          </div>
          <span class="shrink-0 text-xs text-slate-500">{{ formatTime(event.timestamp) }}</span>
        </div>
        <p class="mt-1 text-sm font-medium text-slate-200">{{ event.title }}</p>
        <p v-if="event.detail" class="mt-0.5 text-xs text-slate-400">{{ event.detail }}</p>

        <button
          v-if="event.payload"
          class="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          @click="expanded = !expanded"
        >
          <component :is="expanded ? ChevronDown : ChevronRight" class="h-3 w-3" />
          Payload
        </button>
        <pre
          v-if="expanded && event.payload"
          class="mt-2 max-h-40 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-300"
        >{{ JSON.stringify(event.payload, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
