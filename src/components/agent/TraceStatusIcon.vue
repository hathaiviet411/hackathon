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
        class: 'text-aurora-primary-400 shadow-glow-primary',
        badge: 'bg-primary-soft text-primary-soft-foreground border-transparent',
        label: 'Running',
      }
    case 'SUCCESS':
      return {
        icon: CheckCircle2,
        class: 'text-aurora-secondary-300 shadow-glow-secondary',
        badge: 'bg-secondary-soft text-secondary-soft-foreground border-transparent',
        label: 'Success',
      }
    case 'ERROR':
      return {
        icon: XCircle,
        class: 'text-status-red',
        badge: 'bg-status-red/10 text-status-red border-status-red/30',
        label: 'Error',
      }
    default:
      return {
        icon: Circle,
        class: 'text-fg-subtle',
        badge: 'bg-surface-muted text-fg-subtle border-transparent',
        label: 'Pending',
      }
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
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
