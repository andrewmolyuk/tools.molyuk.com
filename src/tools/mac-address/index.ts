import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'mac-address',
  nameKey: 'tools.macAddress.name',
  descriptionKey: 'tools.macAddress.description',
  categoryId: 'identifiers',
  order: 2,
}

export const component = defineAsyncComponent(() => import('./MacAddressGenerator.vue'))
