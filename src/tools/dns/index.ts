import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'dns',
  nameKey: 'tools.dns.name',
  descriptionKey: 'tools.dns.description',
  categoryId: 'network',
  order: 21,
  compute: 'edge',
}

export const component = defineAsyncComponent(() => import('./DnsLookup.vue'))
