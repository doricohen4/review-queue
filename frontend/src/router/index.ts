import { createRouter, createWebHistory } from 'vue-router'
import QueuePage from '@/pages/QueuePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'queue',
      component: QueuePage,
    },
  ],
})

export default router
