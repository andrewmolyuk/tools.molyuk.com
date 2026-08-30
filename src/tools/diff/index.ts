import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'diff',
  nameKey: 'tools.diff.name',
  descriptionKey: 'tools.diff.description',
  categoryId: 'text',
  order: 14,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./DiffChecker.vue'))
