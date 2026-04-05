import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProviderDetailView from '../views/ProviderDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/providers/:idOrName',
      name: 'provider-detail',
      component: ProviderDetailView,
    },
  ],
})

export default router
