<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DashboardLayout from '@/components/layout/DashboardLayout.vue'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { useAiEngineStore } from '@/stores/aiEngine'
import { useChatStore } from '@/stores/chat'
import { useTraceStore } from '@/stores/trace'
import { useToast } from '@/composables/useToast'
import { availableLocales, localeName, setLocale } from '@/i18n'
import { AiGateway } from '@/services/AiGateway'
import { LOCAL_MODELS } from '@/config/ai'
import { Sun, Moon, LogOut } from 'lucide-vue-next'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
} from 'radix-vue'

const { t, locale } = useI18n()
const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const aiStore = useAiEngineStore()
const chatStore = useChatStore()
const traceStore = useTraceStore()
const toast = useToast()

const routingOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'local', label: 'Local (Edge)' },
  { value: 'cloud', label: 'Cloud' },
]

function onRoutingChange(value: string) {
  aiStore.setRoutingMode(value as 'auto' | 'local' | 'cloud')
}

function onModelChange(value: string) {
  AiGateway.setModelId(value)
}

function clearChatHistory() {
  chatStore.clear()
  AiGateway.clearHistory('chat')
  toast.success(t('settings.clearChatHistory'))
}

function clearTraceHistory() {
  traceStore.clearEvents()
  toast.success(t('settings.clearTraceHistory'))
}

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <DashboardLayout :title="t('settings.title')">
    <section class="max-w-2xl space-y-6">
      <!-- Appearance -->
      <div class="card space-y-4">
        <h3 class="font-semibold text-fg">{{ t('settings.appearance') }}</h3>
        <div class="flex items-center justify-between">
          <span class="text-sm text-fg-muted">{{ t('settings.theme') }}</span>
          <div class="inline-flex rounded-lg bg-surface-muted p-1">
            <button
              class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="themeStore.mode === 'light' ? 'bg-surface-elevated text-fg shadow-sm' : 'text-fg-muted'"
              @click="themeStore.setMode('light')"
            >
              <Sun class="h-3.5 w-3.5" /> {{ t('settings.light') }}
            </button>
            <button
              class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="themeStore.mode === 'dark' ? 'bg-surface-elevated text-fg shadow-sm' : 'text-fg-muted'"
              @click="themeStore.setMode('dark')"
            >
              <Moon class="h-3.5 w-3.5" /> {{ t('settings.dark') }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-sm text-fg-muted">{{ t('settings.language') }}</span>
          <div class="inline-flex rounded-lg bg-surface-muted p-1">
            <button
              v-for="code in availableLocales"
              :key="code"
              class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              :class="locale === code ? 'bg-surface-elevated text-fg shadow-sm' : 'text-fg-muted'"
              @click="setLocale(code)"
            >
              {{ localeName(code) }}
            </button>
          </div>
        </div>
      </div>

      <!-- AI Engine -->
      <div class="card space-y-4">
        <h3 class="font-semibold text-fg">{{ t('settings.aiEngineSection') }}</h3>

        <div class="flex items-center justify-between gap-3">
          <span class="text-sm text-fg-muted">{{ t('settings.routingMode') }}</span>
          <SelectRoot :model-value="aiStore.routingMode" @update:model-value="onRoutingChange">
            <SelectTrigger class="input-base inline-flex w-40 cursor-pointer items-center justify-between">
              <SelectValue placeholder="Routing mode" />
            </SelectTrigger>
            <SelectPortal>
              <SelectContent class="z-50 rounded-lg border border-surface-border bg-surface-elevated p-1 shadow-xl">
                <SelectViewport>
                  <SelectItem
                    v-for="opt in routingOptions"
                    :key="opt.value"
                    :value="opt.value"
                    class="cursor-pointer rounded px-3 py-2 text-sm text-fg outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-soft-foreground"
                  >
                    <SelectItemText>{{ opt.label }}</SelectItemText>
                  </SelectItem>
                </SelectViewport>
              </SelectContent>
            </SelectPortal>
          </SelectRoot>
        </div>

        <div class="flex items-center justify-between gap-3">
          <span class="text-sm text-fg-muted">{{ t('settings.model') }}</span>
          <SelectRoot :model-value="AiGateway.getModelId()" @update:model-value="onModelChange">
            <SelectTrigger class="input-base inline-flex w-44 cursor-pointer items-center justify-between">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectPortal>
              <SelectContent class="z-50 rounded-lg border border-surface-border bg-surface-elevated p-1 shadow-xl">
                <SelectViewport>
                  <SelectItem
                    v-for="model in LOCAL_MODELS"
                    :key="model.id"
                    :value="model.id"
                    :disabled="'requiresSetup' in model && model.requiresSetup"
                    class="cursor-pointer rounded px-3 py-2 text-sm text-fg outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-soft-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
                    :title="'requiresSetup' in model && model.requiresSetup ? model.hint : undefined"
                  >
                    <SelectItemText>{{ model.label }}</SelectItemText>
                  </SelectItem>
                </SelectViewport>
              </SelectContent>
            </SelectPortal>
          </SelectRoot>
        </div>
      </div>

      <!-- Data -->
      <div class="card space-y-3">
        <h3 class="font-semibold text-fg">{{ t('settings.data') }}</h3>
        <div class="flex flex-wrap gap-3">
          <button class="btn-secondary" @click="clearChatHistory">
            {{ t('settings.clearChatHistory') }}
          </button>
          <button class="btn-secondary" @click="clearTraceHistory">
            {{ t('settings.clearTraceHistory') }}
          </button>
        </div>
      </div>

      <!-- Account -->
      <div class="card space-y-3">
        <h3 class="font-semibold text-fg">{{ t('settings.account') }}</h3>
        <p v-if="authStore.user" class="text-sm text-fg-muted">
          {{ t('settings.loggedInAs') }} <span class="font-medium text-fg">{{ authStore.user.email }}</span>
        </p>
        <button class="btn-secondary text-status-red" @click="handleLogout">
          <LogOut class="h-4 w-4" />
          {{ t('settings.logout') }}
        </button>
      </div>
    </section>
  </DashboardLayout>
</template>
