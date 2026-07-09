import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'showcase',
      component: () => import('@/views/ShowcaseView.vue'),
    },
  ],
})

export default router
