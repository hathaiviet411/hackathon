<script setup lang="ts">
import Skeleton from './Skeleton.vue'

withDefaults(defineProps<{ rows?: number }>(), { rows: 5 })
</script>

<template>
  <div class="card space-y-3">
    <Skeleton class="h-5 w-40" />
    <div class="space-y-2">
      <Skeleton v-for="i in rows" :key="i" class="h-9 w-full" />
    </div>
  </div>
</template>
