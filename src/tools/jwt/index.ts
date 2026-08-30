import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'jwt',
  nameKey: 'tools.jwt.name',
  descriptionKey: 'tools.jwt.description',
  categoryId: 'encoding',
  order: 7,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./JwtDecoder.vue'))
