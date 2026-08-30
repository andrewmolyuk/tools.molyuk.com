import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'password',
  nameKey: 'tools.password.name',
  descriptionKey: 'tools.password.description',
  categoryId: 'identifiers',
  order: 2,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./PasswordGenerator.vue'))
