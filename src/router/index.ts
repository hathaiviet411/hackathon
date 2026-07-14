import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/forms',
      name: 'forms',
      component: () => import('@/views/FormsView.vue'),
    },
    {
      path: '/agent',
      name: 'agent',
      component: () => import('@/views/AgentView.vue'),
    },
    {
      path: '/ai-engine',
      name: 'ai-engine',
      component: () => import('@/views/AiEngineView.vue'),
    },
    {
      path: '/media',
      name: 'media',
      component: () => import('@/views/MediaView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (!to.meta.guestOnly && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  return true
})

export default router
