import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'url-encode',
  nameKey: 'tools.urlEncode.name',
  descriptionKey: 'tools.urlEncode.description',
  categoryId: 'encoding',
  order: 6,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./UrlEncodeTool.vue'))
