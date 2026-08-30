export type CategoryId = 'identifiers' | 'encoding' | 'text' | 'network' | 'converters' | 'data'
export type ComputeLocation = 'client' | 'edge'

export interface ToolMeta {
  slug: string
  nameKey: string
  descriptionKey: string
  categoryId: CategoryId
  order: number
  compute: ComputeLocation
}
