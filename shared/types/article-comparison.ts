import type { VersionDetail, WriterArticle } from './articles'

// Each source supports title 200 and body 100,000 Unicode code points, 10 tags of 30 code points.
export interface ComparisonContent {
  readonly title: WriterArticle['draft']['title']
  readonly body: WriterArticle['draft']['body']
  readonly tags: readonly string[]
}

export interface SavedDraftSelection {
  readonly kind: 'saved-draft'
  readonly articleId: WriterArticle['id']
}

export interface VersionSelection {
  readonly kind: 'version'
  readonly articleId: WriterArticle['id']
  readonly versionId: VersionDetail['id']
}

export interface SavedDraftSource extends SavedDraftSelection {
  readonly revision: WriterArticle['revision']
  readonly label: 'Saved draft'
}

export interface VersionSource extends VersionSelection {
  readonly versionNumber: VersionDetail['versionNumber']
  readonly label: string
}

export interface CapturedSavedDraft extends SavedDraftSource, ComparisonContent {}

export interface CapturedVersion extends VersionSource, ComparisonContent {}

export type ComparisonMode = 'draft-version' | 'version-version'

export type ComparisonStatus = 'closed' | 'selecting' | 'fetching' | 'computing' | 'ready' | 'error'

// Monotonically increasing within an editor, including cancelled/superseded attempts.
export type ComparisonRequestId = number

export type ComparisonChangeKind = 'unchanged' | 'removed' | 'added'

export interface ComparisonInlineSegment {
  readonly kind: ComparisonChangeKind
  readonly text: string
}

interface ComparisonLineContent {
  // Exact source text, including its original line ending when present.
  readonly text: string
  readonly segments: readonly ComparisonInlineSegment[]
}

// Line numbers are one-based; null identifies a line absent from that source.
export type ComparisonLineChange = ComparisonLineContent & (
  | { readonly kind: 'unchanged'; readonly baselineLine: number; readonly targetLine: number }
  | { readonly kind: 'removed'; readonly baselineLine: number; readonly targetLine: null }
  | { readonly kind: 'added'; readonly baselineLine: null; readonly targetLine: number }
)

export interface ComparisonTagDelta {
  readonly added: readonly string[]
  readonly removed: readonly string[]
  readonly unchanged: readonly string[]
}

export type ComparisonCaptures =
  | { readonly mode: 'draft-version'; readonly baseline: CapturedVersion; readonly target: CapturedSavedDraft }
  | { readonly mode: 'version-version'; readonly baseline: CapturedVersion; readonly target: CapturedVersion }

interface ComparisonMessageIdentity {
  readonly requestId: ComparisonRequestId
  readonly articleId: WriterArticle['id']
}

export type ArticleComparisonRequest = ComparisonMessageIdentity & ComparisonCaptures & {
  readonly type: 'compare'
}

export type ArticleComparisonResult = ComparisonMessageIdentity & {
  readonly title: readonly ComparisonLineChange[]
  readonly body: readonly ComparisonLineChange[]
  readonly tags: ComparisonTagDelta
  readonly identical: boolean
} & (
  | { readonly mode: 'draft-version'; readonly baseline: VersionSource; readonly target: SavedDraftSource }
  | { readonly mode: 'version-version'; readonly baseline: VersionSource; readonly target: VersionSource }
)

export interface ArticleComparisonResultMessage extends ComparisonMessageIdentity {
  readonly type: 'result'
  readonly result: ArticleComparisonResult
}

export interface ArticleComparisonErrorMessage extends ComparisonMessageIdentity {
  readonly type: 'error'
  readonly code: 'comparison-failed'
  readonly message: string
}

export type ArticleComparisonResponse = ArticleComparisonResultMessage | ArticleComparisonErrorMessage
