export type ArticleStatus = 'draft' | 'published' | 'unpublished'

export interface WriterArticle {
  id: string
  slug: string
  status: ArticleStatus
  revision: number
  draft: { title: string; body: string; tags: string[] }
  publishedAt: string | null
  currentPublishedVersionId: string | null
}

export interface WriterSummary {
  id: string
  slug: string
  title: string
  status: ArticleStatus
}

export interface PublicSummary {
  slug: string
  title: string
  tags: string[]
  publishedAt: string
}

export interface PublicDetail extends PublicSummary {
  body: string
}

export interface VersionSummary {
  id: string
  versionNumber: number
}

export interface VersionDetail extends VersionSummary {
  title: string
  body: string
  tags: string[]
}
