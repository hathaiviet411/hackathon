<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TraceEvent, TraceEventType } from '@/types'
import TraceStatusIcon from './TraceStatusIcon.vue'
import { Route, Brain, Wrench, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  event: TraceEvent
}>()

const expanded = ref(true)

const typeConfig: Record<
  TraceEventType,
  {
    icon: typeof Route
    label: string
    accent: string
    glow: string
    border: string
    iconBg: string
    line: string
  }
> = {
  ROUTER: {
    icon: Route,
    label: 'Router',
    accent: 'text-fuchsia-400',
    glow: 'shadow-neon-purple',
    border: 'border-fuchsia-500/50',
    iconBg: 'bg-fuchsia-500/20 ring-fuchsia-400/30',
    line: 'from-fuchsia-500/80 via-fuchsia-400/40 to-transparent',
  },
  PLANNER: {
    icon: Brain,
    label: 'Planner',
    accent: 'text-cyan-400',
    glow: 'shadow-neon-blue',
    border: 'border-cyan-500/50',
    iconBg: 'bg-cyan-500/20 ring-cyan-400/30',
    line: 'from-cyan-500/80 via-cyan-400/40 to-transparent',
  },
  TOOL_CALL: {
    icon: Wrench,
    label: 'Tool',
    accent: 'text-amber-400',
    glow: 'shadow-neon-amber',
    border: 'border-amber-500/50',
    iconBg: 'bg-amber-500/20 ring-amber-400/30',
    line: 'from-amber-500/80 via-amber-400/40 to-transparent',
  },
  HUMAN_ESCALATION: {
    icon: AlertTriangle,
    label: 'Escalation',
    accent: 'text-orange-400',
    glow: 'shadow-neon-orange',
    border: 'border-orange-500/50',
    iconBg: 'bg-orange-500/20 ring-orange-400/30',
    line: 'from-orange-500/80 via-orange-400/40 to-transparent',
  },
}

const theme = computed(() => typeConfig[props.event.type])
const isRunning = computed(() => props.event.status === 'RUNNING')

function formatTime(ts: number) {
  const d = new Date(ts)
  const base = d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${base}.${ms}`
}
</script>

<template>
  <div class="trace-item group relative animate-trace-in pl-8">
    <!-- Timeline node -->
    <div
      :class="[
        'absolute left-2 top-5 z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-slate-950',
        theme.border,
        isRunning ? 'animate-neon-pulse' : theme.glow,
      ]"
    />
  <!-- Connector line -->
    <div
      class="absolute bottom-0 left-2 top-8 w-px -translate-x-1/2 bg-gradient-to-b from-slate-600/60 to-transparent group-last:hidden"
    />

    <div
      :class="[
        'relative overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-300',
        'bg-slate-900/30 border-white/10',
        theme.border,
        isRunning ? theme.glow : 'hover:shadow-lg',
        isRunning && 'animate-glow-pulse',
      ]"
    >
      <!-- Top neon accent bar -->
      <div
        :class="['h-px w-full bg-gradient-to-r', theme.line]"
      />

      <!-- Glass shine -->
      <div
        class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent"
      />

      <div class="relative flex items-start gap-3 p-3.5">
        <div
          :class="[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1',
            theme.iconBg,
            theme.accent,
          ]"
        >
          <component :is="theme.icon" class="h-4 w-4 drop-shadow-[0_0_6px_currentColor]" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span
                :class="[
                  'font-mono text-[10px] font-bold uppercase tracking-[0.2em]',
                  theme.accent,
                ]"
              >
                {{ theme.label }}
              </span>
              <TraceStatusIcon :status="event.status" />
            </div>
            <span class="shrink-0 font-mono text-[10px] tabular-nums text-slate-500">
              {{ formatTime(event.timestamp) }}
            </span>
          </div>

          <p class="mt-1.5 text-sm font-medium tracking-wide text-slate-100">
            {{ event.title }}
          </p>
          <p v-if="event.detail" class="mt-1 text-xs leading-relaxed text-slate-400">
            {{ event.detail }}
          </p>

          <button
            v-if="event.payload"
            :class="[
              'mt-2.5 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1',
              'font-mono text-[10px] uppercase tracking-wider transition hover:bg-white/10',
              theme.accent,
            ]"
            @click="expanded = !expanded"
          >
            <component :is="expanded ? ChevronDown : ChevronRight" class="h-3 w-3" />
            Payload
          </button>

          <pre
            v-if="expanded && event.payload"
            :class="[
              'mt-2 max-h-40 overflow-auto rounded-lg border p-2.5 font-mono text-[11px] leading-relaxed',
              'border-white/10 bg-black/40 text-slate-300 backdrop-blur-sm',
              theme.glow,
            ]"
          >{{ JSON.stringify(event.payload, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
