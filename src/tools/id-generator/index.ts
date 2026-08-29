import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'id-generator',
  nameKey: 'tools.idGenerator.name',
  descriptionKey: 'tools.idGenerator.description',
  categoryId: 'identifiers',
  order: 1,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./IdGenerator.vue'))
