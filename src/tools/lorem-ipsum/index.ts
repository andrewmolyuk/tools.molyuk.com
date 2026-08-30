import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'lorem-ipsum',
  nameKey: 'tools.loremIpsum.name',
  descriptionKey: 'tools.loremIpsum.description',
  categoryId: 'data',
  order: 30,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./LoremIpsumGenerator.vue'))
