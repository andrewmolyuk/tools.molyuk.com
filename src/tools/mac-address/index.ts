import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'mac-address',
  nameKey: 'tools.macAddress.name',
  descriptionKey: 'tools.macAddress.description',
  categoryId: 'network',
  order: 6,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./MacAddressGenerator.vue'))
