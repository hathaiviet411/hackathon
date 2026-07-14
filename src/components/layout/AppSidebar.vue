<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard,
  FormInput,
  Bot,
  Cpu,
  Camera,
  Settings,
  LogOut,
  X,
  Menu,
  Sparkles,
} from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const router = useRouter()

const navItems = computed(() => [
  { to: { name: 'dashboard' }, label: t('nav.dashboard'), icon: LayoutDashboard },
  { to: { name: 'forms' }, label: t('nav.forms'), icon: FormInput },
  { to: { name: 'agent' }, label: t('nav.agent'), icon: Bot },
  { to: { name: 'ai-engine' }, label: t('nav.aiEngine'), icon: Cpu },
  { to: { name: 'media' }, label: t('nav.media'), icon: Camera },
])

function handleLogout() {
  authStore.logout()
  appStore.closeSidebar()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 flex w-sidebar flex-col border-r border-surface-border bg-surface transition-transform duration-200 md:translate-x-0',
      appStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <div class="flex h-16 items-center justify-between border-b border-surface-border px-4">
      <div class="flex items-center gap-2.5">
        <span class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-aurora shadow-glow-primary">
          <Sparkles class="h-4 w-4 text-white" />
        </span>
        <div class="leading-tight">
          <span class="block text-sm font-bold tracking-tight text-fg">VAIC 2026</span>
          <span class="block text-[11px] font-medium text-fg-subtle">Aurora Design System</span>
        </div>
      </div>
      <button
        class="btn-ghost rounded-lg p-1.5 md:hidden"
        aria-label="Close sidebar"
        @click="appStore.closeSidebar()"
      >
        <X class="h-5 w-5" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto p-3">
      <RouterLink
        v-for="item in navItems"
        v-slot="{ isActive }"
        :key="item.label"
        :to="item.to"
        custom
      >
        <a
          :class="[
            'group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
            isActive
              ? 'bg-primary-soft text-primary-soft-foreground'
              : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
          ]"
          @click="router.push(item.to); appStore.closeSidebar()"
        >
          <span
            v-if="isActive"
            class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-aurora"
            aria-hidden="true"
          />
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          {{ item.label }}
        </a>
      </RouterLink>
    </nav>

    <div class="border-t border-surface-border p-3">
      <RouterLink v-slot="{ isActive }" :to="{ name: 'settings' }" custom>
        <a
          :class="[
            'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
            isActive
              ? 'bg-primary-soft text-primary-soft-foreground'
              : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
          ]"
          @click="router.push({ name: 'settings' }); appStore.closeSidebar()"
        >
          <Settings class="h-4 w-4 shrink-0" />
          {{ t('nav.settings') }}
        </a>
      </RouterLink>

      <button
        class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-status-red/10 hover:text-status-red"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4 shrink-0" />
        {{ t('nav.logout') }}
      </button>

      <p v-if="authStore.user" class="mt-2 truncate px-3 text-xs text-fg-subtle">
        {{ authStore.user.email }}
      </p>
    </div>
  </aside>

  <div
    v-if="appStore.sidebarOpen"
    class="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
    @click="appStore.closeSidebar()"
  />

  <button
    class="btn-secondary fixed left-4 top-3.5 z-20 p-2 shadow-lg md:hidden"
    aria-label="Open menu"
    @click="appStore.toggleSidebar()"
  >
    <Menu class="h-5 w-5" />
  </button>
</template>
