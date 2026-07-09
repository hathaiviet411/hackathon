<script setup lang="ts">
import { computed } from 'vue'
import { useAiEngineStore } from '@/stores/aiEngine'
import { Loader2 } from 'lucide-vue-next'

const store = useAiEngineStore()

const variantClasses = computed(() => {
  switch (store.badgeVariant) {
    case 'edge':
      return 'bg-green-500/15 text-green-400 ring-green-500/30'
    case 'cloud':
      return 'bg-blue-500/15 text-blue-400 ring-blue-500/30'
    case 'loading':
      return 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30'
    case 'error':
      return 'bg-red-500/15 text-red-400 ring-red-500/30'
    case 'offline':
      return 'bg-slate-500/15 text-slate-400 ring-slate-500/30'
    default:
      return 'bg-slate-500/15 text-slate-400 ring-slate-500/30'
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
        store.badgeVariant === 'edge' ? 'bg-green-400' :
        store.badgeVariant === 'cloud' ? 'bg-blue-400' :
        store.badgeVariant === 'error' ? 'bg-red-400' : 'bg-slate-400',
      ]"
    />
    {{ store.badgeLabel }}
    <span v-if="store.badgeVariant === 'loading'" class="text-yellow-500/80">
      {{ store.modelProgress }}%
    </span>
  </span>
</template>
