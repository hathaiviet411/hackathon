<script setup lang="ts">
import { watch } from 'vue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { useAiEngineStore } from '@/stores/aiEngine'

const { isOnline } = useNetworkStatus()
const aiStore = useAiEngineStore()

watch(isOnline, (online) => aiStore.setOnline(online), { immediate: true })
</script>

<template>
  <span class="hidden" aria-hidden="true" />
</template>
