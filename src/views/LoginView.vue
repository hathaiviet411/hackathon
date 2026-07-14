<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Sparkles, Loader2 } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

async function handleSubmit() {
  try {
    await authStore.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch {
    // error surfaced via authStore.error
  }
}

async function handleDemo() {
  await authStore.loginAsDemo()
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4">
    <div
      class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-aurora opacity-20 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-aurora opacity-20 blur-3xl"
      aria-hidden="true"
    />

    <div class="glass-panel relative w-full max-w-sm p-8">
      <div class="mb-6 flex flex-col items-center gap-3 text-center">
        <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-aurora shadow-glow-primary">
          <Sparkles class="h-6 w-6 text-white" />
        </span>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-fg">{{ t('auth.title') }}</h1>
          <p class="text-sm text-fg-muted">{{ t('auth.subtitle') }}</p>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1.5">
          <label for="email" class="block text-sm font-medium text-fg-muted">{{ t('auth.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            class="input-base"
            placeholder="you@company.com"
            :disabled="authStore.isAuthenticating"
          />
        </div>

        <div class="space-y-1.5">
          <label for="password" class="block text-sm font-medium text-fg-muted">{{ t('auth.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="input-base"
            placeholder="••••••••"
            :disabled="authStore.isAuthenticating"
          />
        </div>

        <p v-if="authStore.error" class="rounded-lg bg-status-red/10 px-3 py-2 text-sm text-status-red">
          {{ authStore.error }}
        </p>

        <button type="submit" class="btn-primary w-full" :disabled="authStore.isAuthenticating">
          <Loader2 v-if="authStore.isAuthenticating" class="h-4 w-4 animate-spin" />
          {{ t('auth.signIn') }}
        </button>
      </form>

      <div class="relative my-5">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-surface-border" />
        </div>
        <div class="relative flex justify-center text-xs">
          <span class="bg-surface px-2 text-fg-subtle">{{ t('auth.or') }}</span>
        </div>
      </div>

      <button
        type="button"
        class="btn-secondary w-full"
        :disabled="authStore.isAuthenticating"
        @click="handleDemo"
      >
        {{ t('auth.continueAsDemo') }}
      </button>

      <p class="mt-6 text-center text-xs text-fg-subtle">
        {{ t('auth.mockNotice') }}
      </p>
    </div>
  </div>
</template>
