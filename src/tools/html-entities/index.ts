import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'html-entities',
  nameKey: 'tools.htmlEntities.name',
  descriptionKey: 'tools.htmlEntities.description',
  categoryId: 'encoding',
  order: 8,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./HtmlEntities.vue'))
