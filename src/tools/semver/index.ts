import { defineAsyncComponent } from 'vue'
import type { ToolMeta } from '../types'

export const meta: ToolMeta = {
  slug: 'semver',
  nameKey: 'tools.semver.name',
  descriptionKey: 'tools.semver.description',
  categoryId: 'converters',
  order: 33,
  compute: 'client',
}

export const component = defineAsyncComponent(() => import('./SemverChecker.vue'))
