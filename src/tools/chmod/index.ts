import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'chmod',
  nameKey: 'tools.chmod.name',
  descriptionKey: 'tools.chmod.description',
  categoryId: 'converters',
  order: 32,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./ChmodCalculator.vue'))
