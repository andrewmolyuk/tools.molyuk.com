import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'json-format',
  nameKey: 'tools.jsonFormat.name',
  descriptionKey: 'tools.jsonFormat.description',
  categoryId: 'encoding',
  order: 7,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./JsonFormatter.vue'))
