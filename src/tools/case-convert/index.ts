import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'case-convert',
  nameKey: 'tools.caseConvert.name',
  descriptionKey: 'tools.caseConvert.description',
  categoryId: 'text',
  order: 11,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./CaseConverter.vue'))
