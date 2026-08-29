import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'id-generator',
  name: 'ID / UUID генератор',
  description: 'Генерация UUID v4',
  category: 'Идентификаторы',
  order: 1,
}

export const component = defineAsyncComponent(() => import('./IdGenerator.vue'))
