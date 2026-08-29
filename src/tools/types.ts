export type CategoryId = 'identifiers' | 'encoding' | 'network'
export type ComputeLocation = 'client' | 'edge'

export interface ToolMeta {
  slug: string
  nameKey: string
  descriptionKey: string
  categoryId: CategoryId
  order: number
  compute: ComputeLocation
}
