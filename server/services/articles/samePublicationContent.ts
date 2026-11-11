import type { WriterArticle } from '../../../shared/types/articles'

export function samePublicationContent(left: WriterArticle['draft'], right: WriterArticle['draft']): boolean {
  if (left.title !== right.title || left.body !== right.body) return false
  const leftTags = new Set(left.tags)
  const rightTags = new Set(right.tags)
  return leftTags.size === rightTags.size && [...leftTags].every(tag => rightTags.has(tag))
}
