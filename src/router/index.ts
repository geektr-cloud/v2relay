import { createRouter, createWebHistory } from 'vue-router'
import ProviderPage from '../views/provider/ProviderPage.vue'
import ProviderDetailPage from '../views/provider/ProviderDetailPage.vue'
import SubscriptionPage from '../views/subscription/SubscriptionPage.vue'
import SubscriptionDetailPage from '../views/subscription/SubscriptionDetailPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: ProviderPage,
    },
    {
      path: '/subscriptions',
      name: 'subscriptions',
      component: SubscriptionPage,
    },
    {
      path: '/subscriptions/:id',
      name: 'subscription-detail',
      component: SubscriptionDetailPage,
    },
    {
      path: '/providers/:idOrName',
      name: 'provider-detail',
      component: ProviderDetailPage,
    },
  ],
})

export default router
