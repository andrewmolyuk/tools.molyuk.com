import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'color',
  nameKey: 'tools.color.name',
  descriptionKey: 'tools.color.description',
  categoryId: 'converters',
  order: 20,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./ColorConverter.vue'))
