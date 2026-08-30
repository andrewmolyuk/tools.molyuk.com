import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import { tools } from '../tools/registry'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    ...tools.map((tool) => ({
      path: `/${tool.meta.slug}`,
      name: tool.meta.slug,
      component: tool.component,
    })),
    // Must stay last: it matches anything the routes above did not.
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})
