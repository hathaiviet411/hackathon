<script setup lang="ts">
import StatusBadge from '@/components/ai/StatusBadge.vue'
import { useThemeStore } from '@/stores/theme'
import { useI18n } from 'vue-i18n'
import { availableLocales, localeName, setLocale } from '@/i18n'
import { Download, Sun, Moon, Languages, Check } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'radix-vue'

defineProps<{
  title?: string
}>()

const themeStore = useThemeStore()
const { locale } = useI18n()

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
  <header class="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-surface-border bg-canvas-translucent px-4 pl-14 backdrop-blur-md md:pl-6">
    <h1 class="text-lg font-semibold tracking-tight text-fg">{{ title ?? 'Showcase' }}</h1>
    <div class="flex items-center gap-2">
      <StatusBadge />

      <DropdownMenuRoot>
        <DropdownMenuTrigger class="btn-ghost cursor-pointer rounded-lg p-2" aria-label="Change language">
          <Languages class="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            class="z-50 min-w-[9rem] rounded-lg border border-surface-border bg-surface-elevated p-1 shadow-xl"
            align="end"
            :side-offset="8"
          >
            <DropdownMenuItem
              v-for="code in availableLocales"
              :key="code"
              class="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm text-fg outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-soft-foreground"
              @select="setLocale(code)"
            >
              {{ localeName(code) }}
              <Check v-if="locale === code" class="h-3.5 w-3.5" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>

      <button
        class="btn-ghost rounded-lg p-2"
        :aria-label="themeStore.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="themeStore.toggleMode()"
      >
        <Sun v-if="themeStore.mode === 'dark'" class="h-4 w-4" />
        <Moon v-else class="h-4 w-4" />
      </button>

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
