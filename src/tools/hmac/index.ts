import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'hmac',
  nameKey: 'tools.hmac.name',
  descriptionKey: 'tools.hmac.description',
  categoryId: 'encoding',
  order: 11,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./HmacGenerator.vue'))
