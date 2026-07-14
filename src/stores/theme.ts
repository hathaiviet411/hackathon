import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'aurora-theme'
type ThemeMode = 'light' | 'dark'

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(getInitialMode())

  function applyMode(value: ThemeMode) {
    document.documentElement.classList.toggle('dark', value === 'dark')
  }

  function setMode(value: ThemeMode) {
    mode.value = value
    localStorage.setItem(STORAGE_KEY, value)
  }

  function toggleMode() {
    setMode(mode.value === 'dark' ? 'light' : 'dark')
  }

  watch(mode, applyMode, { immediate: true })

  return { mode, setMode, toggleMode }
})
