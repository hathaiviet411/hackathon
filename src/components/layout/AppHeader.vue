<script setup lang="ts">
import StatusBadge from '@/components/ai/StatusBadge.vue'
import { Download } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

defineProps<{
  title?: string
}>()

const canInstall = ref(false)
let deferredPrompt: Event | null = null

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    canInstall.value = true
  })
})

async function installPwa() {
  if (!deferredPrompt) return
  const prompt = deferredPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
  await prompt.prompt()
  await prompt.userChoice
  deferredPrompt = null
  canInstall.value = false
}
</script>

<template>
  <header class="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-700/60 bg-slate-950/80 px-4 pl-14 backdrop-blur-md md:pl-6">
    <h1 class="text-lg font-semibold text-slate-100">{{ title ?? 'Showcase' }}</h1>
    <div class="flex items-center gap-3">
      <StatusBadge />
      <button
        v-if="canInstall"
        class="btn-secondary hidden sm:inline-flex"
        @click="installPwa"
      >
        <Download class="h-4 w-4" />
        Install
      </button>
    </div>
  </header>
</template>
