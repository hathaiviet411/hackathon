<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="flex min-h-dvh">
    <AppSidebar />
    <div class="flex flex-1 flex-col md:pl-sidebar">
      <AppHeader :title="title" />
      <main class="flex-1 overflow-auto p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
