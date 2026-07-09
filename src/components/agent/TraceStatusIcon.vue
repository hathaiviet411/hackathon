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
      return { icon: Loader2, class: 'text-blue-400 animate-spin', label: 'Running' }
    case 'SUCCESS':
      return { icon: CheckCircle2, class: 'text-green-400', label: 'Success' }
    case 'ERROR':
      return { icon: XCircle, class: 'text-red-400', label: 'Error' }
    default:
      return { icon: Circle, class: 'text-slate-500', label: 'Pending' }
  }
})
</script>

<template>
  <component
    :is="config.icon"
    :class="['h-4 w-4 shrink-0', config.class]"
    :aria-label="config.label"
  />
</template>
