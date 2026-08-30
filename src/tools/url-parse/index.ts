import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'url-parse',
  nameKey: 'tools.urlParse.name',
  descriptionKey: 'tools.urlParse.description',
  categoryId: 'encoding',
  order: 11,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./UrlParser.vue'))
