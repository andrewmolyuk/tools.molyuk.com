import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'cidr',
  nameKey: 'tools.cidr.name',
  descriptionKey: 'tools.cidr.description',
  categoryId: 'network',
  order: 20,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./CidrCalculator.vue'))
