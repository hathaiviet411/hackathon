<script setup lang="ts">
import { computed } from 'vue'
import type { StatCardConfig } from '@/types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'

const props = defineProps<{
  stat: StatCardConfig
}>()

const trendIcon = computed(() => {
  if (props.stat.trend === 'up') return TrendingUp
  if (props.stat.trend === 'down') return TrendingDown
  return Minus
})

const trendColor = computed(() => {
  if (props.stat.trend === 'up') return 'text-aurora-secondary-400'
  if (props.stat.trend === 'down') return 'text-status-red'
  return 'text-fg-subtle'
})
</script>

<template>
  <div class="card space-y-2">
    <p class="text-sm font-medium text-fg-muted">{{ stat.label }}</p>
    <p class="text-2xl font-bold tracking-tight text-fg">{{ stat.value }}</p>
    <p v-if="stat.delta" :class="['flex items-center gap-1 text-xs font-medium', trendColor]">
      <component :is="trendIcon" class="h-3.5 w-3.5" />
      {{ stat.delta }}
    </p>
  </div>
</template>
