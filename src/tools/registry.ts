import type { Component } from 'vue'
import type { CategoryId, ToolMeta } from './types'

interface ToolModule {
  meta: ToolMeta
  component: Component
}

// Every tool lives in its own folder with an `index.ts` exporting
// `meta` (ToolMeta) and `component` (async Vue component). Adding a new
// tool folder here registers it automatically — no router/nav edits needed.
const modules = import.meta.glob<ToolModule>('./*/index.ts', { eager: true })

export const tools: ToolModule[] = Object.values(modules).sort((a, b) => a.meta.order - b.meta.order)

export const CATEGORY_ORDER: CategoryId[] = ['identifiers', 'encoding', 'network']

export interface ToolGroup {
  categoryId: CategoryId
  tools: ToolModule[]
}

export const toolGroups: ToolGroup[] = CATEGORY_ORDER.map((categoryId) => ({
  categoryId,
  tools: tools.filter((tool) => tool.meta.categoryId === categoryId),
})).filter((group) => group.tools.length > 0)
