import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser } from '@/types'
import { i18n } from '@/i18n'

const STORAGE_KEY = 'aurora-auth'

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(loadStoredUser())
  const isAuthenticating = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)

  async function login(email: string, password: string) {
    error.value = null
    if (!email.trim() || !password.trim()) {
      error.value = i18n.global.t('auth.errorRequired')
      throw new Error(error.value)
    }

    isAuthenticating.value = true
    try {
      // Mock auth — no backend yet. Replace with a real API call once available.
      await new Promise((resolve) => setTimeout(resolve, 600))
      const nextUser: AuthUser = {
        id: crypto.randomUUID(),
        name: email.split('@')[0] || 'Demo User',
        email,
      }
      user.value = nextUser
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    } finally {
      isAuthenticating.value = false
    }
  }

  async function loginAsDemo() {
    await login('demo@aurora.app', 'demo')
  }

  function logout() {
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { user, isAuthenticating, error, isAuthenticated, login, loginAsDemo, logout }
})
