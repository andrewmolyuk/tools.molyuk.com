import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'timestamp',
  nameKey: 'tools.timestamp.name',
  descriptionKey: 'tools.timestamp.description',
  categoryId: 'converters',
  order: 18,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./TimestampConverter.vue'))
