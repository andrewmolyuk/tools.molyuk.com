import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'hash-generator',
  nameKey: 'tools.hash.name',
  descriptionKey: 'tools.hash.description',
  categoryId: 'encoding',
  order: 4,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./HashGenerator.vue'))
