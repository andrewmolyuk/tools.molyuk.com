import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'rdap',
  nameKey: 'tools.rdap.name',
  descriptionKey: 'tools.rdap.description',
  categoryId: 'network',
  order: 25,
  compute: 'edge',
}

export const component = defineAsyncComponent(() => import('./RdapLookup.vue'))
