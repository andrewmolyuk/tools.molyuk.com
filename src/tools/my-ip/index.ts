import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'my-ip',
  nameKey: 'tools.myIp.name',
  descriptionKey: 'tools.myIp.description',
  categoryId: 'network',
  order: 16,
  compute: 'edge',
}

export const component = defineAsyncComponent(() => import('./MyIp.vue'))
