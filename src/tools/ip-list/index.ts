import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'ip-list',
  name: 'Генератор списков IP',
  description: 'IPv4/IPv6: диапазон по CIDR или случайные адреса',
  category: 'Сеть',
  order: 5,
}

export const component = defineAsyncComponent(() => import('./IpListGenerator.vue'))
