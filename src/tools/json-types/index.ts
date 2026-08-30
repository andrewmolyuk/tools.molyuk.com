import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'json-types',
  nameKey: 'tools.jsonTypes.name',
  descriptionKey: 'tools.jsonTypes.description',
  categoryId: 'converters',
  order: 31,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./JsonTypes.vue'))
