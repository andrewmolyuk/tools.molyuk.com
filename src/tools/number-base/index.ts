import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'number-base',
  nameKey: 'tools.numberBase.name',
  descriptionKey: 'tools.numberBase.description',
  categoryId: 'converters',
  order: 19,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./NumberBaseConverter.vue'))
