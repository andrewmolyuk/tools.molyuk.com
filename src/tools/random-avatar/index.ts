import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'random-avatar',
  nameKey: 'tools.randomAvatar.name',
  descriptionKey: 'tools.randomAvatar.description',
  categoryId: 'data',
  order: 30,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./RandomAvatarGenerator.vue'))
