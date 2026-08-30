import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'unicode',
  nameKey: 'tools.unicode.name',
  descriptionKey: 'tools.unicode.description',
  categoryId: 'text',
  order: 17,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./UnicodeInspector.vue'))
