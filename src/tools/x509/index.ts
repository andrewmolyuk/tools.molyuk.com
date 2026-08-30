import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'x509',
  nameKey: 'tools.x509.name',
  descriptionKey: 'tools.x509.description',
  categoryId: 'encoding',
  order: 13,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./CertificateDecoder.vue'))
