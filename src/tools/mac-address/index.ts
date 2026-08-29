import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'mac-address',
  name: 'MAC-адрес генератор',
  description: 'Случайные MAC-адреса, unicast, с настраиваемым разделителем',
  icon: '🖧',
}

export const component = defineAsyncComponent(() => import('./MacAddressGenerator.vue'))
