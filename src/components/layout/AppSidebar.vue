<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { LayoutDashboard, FormInput, Bot, Cpu, Camera, X, Menu } from 'lucide-vue-next'

const appStore = useAppStore()

const navItems = [
  { id: 'forms', label: 'Forms & Data', icon: FormInput },
  { id: 'agent', label: 'Agent Trace', icon: Bot },
  { id: 'ai', label: 'AI Engine', icon: Cpu },
  { id: 'media', label: 'File & Media', icon: Camera },
]
</script>

<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 flex w-sidebar flex-col border-r border-slate-700/60 bg-slate-900 transition-transform duration-200 md:translate-x-0',
      appStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <div class="flex h-14 items-center justify-between border-b border-slate-700/60 px-4">
      <div class="flex items-center gap-2">
        <LayoutDashboard class="h-5 w-5 text-blue-400" />
        <span class="font-semibold text-slate-100">VAIC 2026</span>
      </div>
      <button
        class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 md:hidden"
        aria-label="Close sidebar"
        @click="appStore.closeSidebar()"
      >
        <X class="h-5 w-5" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 p-3">
      <button
        v-for="item in navItems"
        :key="item.id"
        :class="[
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          appStore.activeSection === item.id
            ? 'bg-blue-600/20 text-blue-400'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
        ]"
        @click="appStore.setActiveSection(item.id)"
      >
        <component :is="item.icon" class="h-4 w-4 shrink-0" />
        {{ item.label }}
      </button>
    </nav>

    <div class="border-t border-slate-700/60 p-4 text-xs text-slate-500">
      PWA Foundation Template
    </div>
  </aside>

  <div
    v-if="appStore.sidebarOpen"
    class="fixed inset-0 z-30 bg-black/50 md:hidden"
    @click="appStore.closeSidebar()"
  />

  <button
    class="fixed left-4 top-3.5 z-20 rounded-lg bg-slate-800 p-2 text-slate-300 shadow-lg md:hidden"
    aria-label="Open menu"
    @click="appStore.toggleSidebar()"
  >
    <Menu class="h-5 w-5" />
  </button>
</template>
