import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'hash-generator',
  name: 'Hash генератор',
  description: 'SHA-1, SHA-256, SHA-384, SHA-512',
  icon: '#️⃣',
}

export const component = defineAsyncComponent(() => import('./HashGenerator.vue'))
