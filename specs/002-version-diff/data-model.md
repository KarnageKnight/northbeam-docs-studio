# Version Diff: Proposed Data Model

**Date**: 2026-11-09 | **Status**: Design selected through option A on 2026-11-09; T004 shared types implemented on 2026-11-10. Exact text/tag computation and Worker result projection are implemented in T006–T009; US1 editor capture/state transitions are implemented and verified in T011–T016; historical capture/reversal are implemented and verified in T018–T022. See [plan](plan.md).

## Shared type contract (T004)

`shared/types/article-comparison.ts` defines readonly source selections and captures,
exact line/inline changes, tag deltas, mode-specific requests/results, Worker messages,
request generations and comparison status. Existing article/version
identity and revision types are reused. Version selections use the version UUID; their
version number and label are display metadata. Saved draft sources carry the literal label
`Saved draft` and captured revision, with no versionId.

Mode literals are `draft-version` (version baseline, saved draft target) and
`version-version` (both sources are versions). Request IDs are monotonically increasing
numbers local to an editor; every Worker response also includes articleId. Line numbers
are one-based, with null on a side where the line does not exist. Exact text retains its
original line ending; inline segments describe portions of that text. The human-selected continuous diff has no paged presentation range.

Readonly typing prevents direct mutation through the contract; it does not copy or freeze
runtime values. Later tasks must copy captures, enforce same-article UUID ownership and
content limits and reject obsolete generations. These types
alone do not establish those runtime guarantees or full-limit feasibility.

## Persistence

Reuse Article, WriterArticle, VersionSummary, and VersionDetail from shared/types/articles.ts. No schema, migration, revision, publication, or version-format change. Comparison results are transient and never become snapshots.

## Transient entities

| Entity | Fields / invariant |
|---|---|
| Source selection | articleId, kind (saved-draft/version), versionId where applicable; UUID is identity, versionNumber is display label. |
| Captured draft | articleId, revision, copied saved title/body/tags, label Saved draft. Copy WriterArticle.draft, never editable draft or tagsText. |
| Captured version | articleId plus fetched VersionDetail; existing endpoint enforces ownership. |
| Comparison request | requestId, articleId, mode, baseline and target. Draft mode uses version baseline/draft target; version mode permits reversal. |
| Text change | kind (unchanged/removed/added), exact text, applicable baseline/target line numbers. |
| Inline segment | kind and exact text for word/whitespace changes within replacement blocks; no HTML. |
| Tag delta | added/removed/unchanged normalized memberships, ignoring order. |
| Result | requestId, source identities/labels, title/body changes, tag delta, identical flag. |

Captures are not real-time views. Draft source is the editor's most recent successful fetched/saved response; show captured revision. Existing explicit reload loads remote changes without comparison replacing local input. Snapshot sources are freshly read per attempt; deletion after a successful GET need not be observed until the next attempt.

## Exactness

Concatenating unchanged+removed text reconstructs baseline exactly; unchanged+added reconstructs target. Preserve spaces, CR/LF, blank lines, final newline, Unicode, and Markdown syntax. Replacement blocks preserve original newline boundaries even with unequal line counts. No normalization or rendered-Markdown equivalence.

## State transitions

closed → selecting → fetching → computing → ready; failures → error; retry → fresh fetching.
Close/cancel/unmount abort pending GETs, terminate worker, invalidate generation, and release captured output. Selection/mode changes invalidate output before a new attempt.

Draft comparison checks dirty=false, pending=false, conflict=false before and after fetching. Typing during reads invalidates pending draft capture without discarding text. A successful save is not sufficient if newer edits remain dirty. Displayed comparisons remain labeled captures when editing resumes.

Version/version comparison permits unrelated unsaved/conflicted draft state. An in-progress lifecycle mutation may temporarily disable new capture; comparison itself never changes lifecycle pending/conflict flags. Reject late results unless generation, article, and selected sources match.

## Validation and failure

Each source supports title 200 and body 100,000 Unicode code points, 10 tags of 30 code points. UTF-16 length is not code-point length. Missing/wrong-owner/deleted source invalidates the whole attempted comparison; no substitution or stale prior output labeled as current. No stored state changes on reads, computation, failure, refresh, reversal, or close.

## Presentation amendment — 2026-11-10

The human replaced paged output with a single continuous article diff showing every line.
The now-unused ComparisonPresentationRange type was removed. T004's earlier range evidence
is historical; no pagination or collapsed unchanged context is required by the current model.

## US1 runtime contract — 2026-11-10

useArticleComparison now copies saved draft content/revision, reads owned versions anew,
and owns fetching/computing/ready/error state independently of editor lifecycle state.
Synchronous dirty/pending/conflict/revision/article watches invalidate pending captures;
selection/close/unmount abort reads, terminate the Worker, clear output, and invalidate
generations. Ready output retains its original saved label/revision during later typing.
Worker output is held in a shallow ref and checked against generation/article/source IDs.
The panel appends all body rows automatically, yielding between 1,000-row batches, and
cancels queued batches on source change/Cancel/Close/unmount. No presentation range,
pagination, hidden context, or persisted comparison record is introduced. US2 is pending.


## Phase 4 implementation evidence — 2026-11-10

T018–T023 implement arbitrary retained-version pairs, same-source identity, fresh reads,
and role reversal. Historical capture permits unrelated dirty/conflicted draft fields;
active lifecycle writes block attempts. Selection/mode/reversal invalidate obsolete reads,
Workers, and output. Saved-draft guards remain strict. No comparison writes or backend
changes were introduced. The inline, complete single-scroll design remains in place.

[Historical evidence](historical-comparison-evidence.json) records nine maximum-size
fixtures in both directions (18 completed comparisons), exact DOM/source and word-detail
checks, preserved fields, SQL/public immutability, pending-work cancellation, and keyboard
final-row access. Five additional controls interrupted real 100,000-row rendering without
late rows. The largest output took about 49–50s to append in this run; timings are observations,
not guarantees. Current-source saved-draft regression also reconstructed all 100,000 rows.
315 tests (171 unit + 144 PostgreSQL/HTTP), Nuxt typecheck, and production build passed.
Normal native popup-picker keyboard coverage, final T024–T027, and Windows T028 remain
pending. Earlier sections and US1 evidence retain their original checkpoint provenance.
