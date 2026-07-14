<script setup lang="ts">
import { computed } from 'vue'
import { useAiEngineStore } from '@/stores/aiEngine'
import { Loader2 } from 'lucide-vue-next'

const store = useAiEngineStore()

const variantClasses = computed(() => {
  switch (store.badgeVariant) {
    case 'edge':
      return 'bg-aurora-secondary-300/15 text-aurora-secondary-400 ring-aurora-secondary-300/30'
    case 'cloud':
      return 'bg-status-blue/15 text-status-blue ring-status-blue/30'
    case 'loading':
      return 'bg-status-orange/15 text-status-orange ring-status-orange/30'
    case 'error':
      return 'bg-status-red/15 text-status-red ring-status-red/30'
    case 'offline':
      return 'bg-surface-muted text-fg-subtle ring-surface-border'
    default:
      return 'bg-surface-muted text-fg-subtle ring-surface-border'
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
      variantClasses,
    ]"
  >
    <Loader2 v-if="store.badgeVariant === 'loading'" class="h-3 w-3 animate-spin" />
    <span
      v-else
      :class="[
        'h-1.5 w-1.5 rounded-full',
        store.badgeVariant === 'edge' ? 'bg-aurora-secondary-300' :
        store.badgeVariant === 'cloud' ? 'bg-status-blue' :
        store.badgeVariant === 'error' ? 'bg-status-red' : 'bg-fg-subtle',
      ]"
    />
    {{ store.badgeLabel }}
    <span v-if="store.badgeVariant === 'loading'" class="text-status-orange/80">
      {{ store.modelProgress }}%
    </span>
  </span>
</template>
