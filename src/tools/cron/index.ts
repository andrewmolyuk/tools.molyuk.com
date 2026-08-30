import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'cron',
  nameKey: 'tools.cron.name',
  descriptionKey: 'tools.cron.description',
  categoryId: 'converters',
  order: 21,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./CronParser.vue'))
