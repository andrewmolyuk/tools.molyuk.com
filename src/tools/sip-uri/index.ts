import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'sip-uri',
  name: 'SIP URI генератор',
  description: 'Список sip:user@host[:port] с последовательными или случайными номерами',
  icon: '📞',
}

export const component = defineAsyncComponent(() => import('./SipUriGenerator.vue'))
