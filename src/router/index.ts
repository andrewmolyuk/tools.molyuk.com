import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { tools } from '../tools/registry'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    ...tools.map((tool) => ({
      path: `/tools/${tool.meta.slug}`,
      name: tool.meta.slug,
      component: tool.component,
    })),
  ],
})
