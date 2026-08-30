import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'totp',
  nameKey: 'tools.totp.name',
  descriptionKey: 'tools.totp.description',
  categoryId: 'identifiers',
  order: 3,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./TotpGenerator.vue'))
