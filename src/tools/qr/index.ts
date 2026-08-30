import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'qr',
  nameKey: 'tools.qr.name',
  descriptionKey: 'tools.qr.description',
  categoryId: 'converters',
  order: 27,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./QrGenerator.vue'))
