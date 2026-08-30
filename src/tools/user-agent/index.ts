import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'user-agent',
  nameKey: 'tools.userAgent.name',
  descriptionKey: 'tools.userAgent.description',
  categoryId: 'network',
  order: 19,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./UserAgentParser.vue'))
