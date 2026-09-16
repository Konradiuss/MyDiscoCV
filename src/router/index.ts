import { createRouter, createWebHistory } from 'vue-router'
import ResumePage from '@/components/ResumePage.vue'
import { defaultLocale, isLocale } from '@/data/resume'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: `/${defaultLocale}`,
    },
    {
      path: '/:locale',
      name: 'resume',
      component: ResumePage,
      beforeEnter: (to) => {
        const locale = Array.isArray(to.params.locale) ? to.params.locale[0] : to.params.locale

        if (!isLocale(locale)) {
          return `/${defaultLocale}`
        }
      },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: `/${defaultLocale}`,
    },
  ],
})

export default router
