import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'ip-list',
  nameKey: 'tools.ipList.name',
  descriptionKey: 'tools.ipList.description',
  categoryId: 'network',
  order: 19,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./IpListGenerator.vue'))
