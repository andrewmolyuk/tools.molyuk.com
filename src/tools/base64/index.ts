import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'base64',
  nameKey: 'tools.base64.name',
  descriptionKey: 'tools.base64.description',
  categoryId: 'encoding',
  order: 3,
}

export const component = defineAsyncComponent(() => import('./Base64Tool.vue'))
