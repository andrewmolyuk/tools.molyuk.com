export type CategoryId = 'identifiers' | 'encoding' | 'network'

export interface ToolMeta {
  slug: string
  nameKey: string
  descriptionKey: string
  categoryId: CategoryId
  order: number
}
