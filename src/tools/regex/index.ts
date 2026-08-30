import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'regex',
  nameKey: 'tools.regex.name',
  descriptionKey: 'tools.regex.description',
  categoryId: 'text',
  order: 14,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./RegexTester.vue'))
