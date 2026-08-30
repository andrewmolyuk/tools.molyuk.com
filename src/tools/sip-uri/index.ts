import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'sip-uri',
  nameKey: 'tools.sipUri.name',
  descriptionKey: 'tools.sipUri.description',
  categoryId: 'network',
  order: 23,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./SipUriGenerator.vue'))
