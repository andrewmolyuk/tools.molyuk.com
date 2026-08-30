import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'yaml',
  nameKey: 'tools.yaml.name',
  descriptionKey: 'tools.yaml.description',
  categoryId: 'encoding',
  order: 9,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./YamlConverter.vue'))
