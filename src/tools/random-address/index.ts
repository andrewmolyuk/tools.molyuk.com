import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'random-address',
  nameKey: 'tools.randomAddress.name',
  descriptionKey: 'tools.randomAddress.description',
  categoryId: 'data',
  order: 23,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./RandomAddressGenerator.vue'))
