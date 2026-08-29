import type { Component } from 'vue'
import type { ToolMeta } from './types'

interface ToolModule {
  meta: ToolMeta
  component: Component
}

// Every tool lives in its own folder with an `index.ts` exporting
// `meta` (ToolMeta) and `component` (async Vue component). Adding a new
// tool folder here registers it automatically — no router/nav edits needed.
const modules = import.meta.glob<ToolModule>('./*/index.ts', { eager: true })

export const tools: ToolModule[] = Object.values(modules).sort((a, b) => a.meta.order - b.meta.order)

export const CATEGORY_ORDER = ['Идентификаторы', 'Кодирование', 'Сеть']

export interface ToolGroup {
  category: string
  tools: ToolModule[]
}

export const toolGroups: ToolGroup[] = CATEGORY_ORDER.map((category) => ({
  category,
  tools: tools.filter((tool) => tool.meta.category === category),
})).filter((group) => group.tools.length > 0)
