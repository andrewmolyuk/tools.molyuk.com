import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'base64',
  name: 'Base64',
  description: 'Кодирование и декодирование Base64',
  icon: '🔤',
}

export const component = defineAsyncComponent(() => import('./Base64Tool.vue'))
