<script setup lang="ts">
import { computed } from 'vue'
import type { TraceStatus } from '@/types'
import { Loader2, CheckCircle2, XCircle, Circle } from 'lucide-vue-next'

const props = defineProps<{
  status: TraceStatus
}>()

const config = computed(() => {
  switch (props.status) {
    case 'RUNNING':
      return {
        icon: Loader2,
        class: 'text-cyan-400 shadow-neon-cyan',
        badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40',
        label: 'Running',
      }
    case 'SUCCESS':
      return {
        icon: CheckCircle2,
        class: 'text-emerald-400 shadow-neon-cyan',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40',
        label: 'Success',
      }
    case 'ERROR':
      return {
        icon: XCircle,
        class: 'text-rose-400',
        badge: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
        label: 'Error',
      }
    default:
      return {
        icon: Circle,
        class: 'text-slate-400',
        badge: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
        label: 'Pending',
      }
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider backdrop-blur-sm',
      config.badge,
      status === 'RUNNING' && 'animate-glow-pulse',
    ]"
  >
    <component
      :is="config.icon"
      :class="['h-3 w-3 shrink-0', config.class, status === 'RUNNING' && 'animate-spin']"
      :aria-label="config.label"
    />
    {{ config.label }}
  </span>
</template>
