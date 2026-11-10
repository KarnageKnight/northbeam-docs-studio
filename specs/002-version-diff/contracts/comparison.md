# Version Diff: Interface Contracts

**Date**: 2026-11-09 | **Status**: Both-mode orchestration, production/development Worker behavior, full-size output and final acceptance verified within recorded Chrome/macOS coverage through T028 (unused type aliases removed; runtime contract unchanged). See [validation](../quickstart.md).
Authority: [spec](../spec.md), [plan](../plan.md), [model](../data-model.md).

## Existing HTTP interfaces

No new endpoint. Retain [baseline HTTP contract](../../001-docs-studio/contracts/http-api.md).

- GET /api/writer/articles/by-slug/:slug: existing editor load obtains saved WriterArticle/revision. Comparison does not silently reload the editor.
- GET /api/writer/articles/:articleId/versions: existing selection list.
- GET /api/writer/articles/:articleId/versions/:versionId: fetch selected snapshots anew per attempt with retry:0 and abort signal. Same-version pairing may reuse a single read within that attempt.

Use existing 400 malformed-ID, 404 missing/wrong-owner, generic unexpected-error behavior. Never use lifecycle POST/PUT/DELETE for comparison. Clear superseded output before displaying a current attempt's failure. No public response or route change.

## UI/controller interface

Editor page supplies read-only saved article plus dirty/pending/conflict flags. A local useArticleComparison composable owns mode, selected UUIDs, request generation, fetching/computation status, error, captured result and cancellation.

Inline unified panel below history offers mode/source selectors, Compare/Refresh, Reverse for version/version, Close/Cancel. It shows source roles and version numbers/draft revision. A draft with local edits says Save your draft before comparing; it does not call Save. Existing conflict recovery remains separate. Version/version permits unrelated dirty fields.

No versions: explanatory state. One version: draft comparison available; explain a second distinct version is needed for historical changes, while same-version identity comparison remains valid. Current/last-published versions and unpublished articles are eligible. Display No differences explicitly.

Captured results do not change with later typing; explain save and refresh/reopen for draft changes. All operations preserve local fields. Missing source invalidates the attempt without fallback to another version or displaying another article.

Render escaped source strings using Vue text interpolation, never v-html, MarkdownContent, library HTML, or active links. Preserve whitespace with preformatted wrapping and explicit otherwise-invisible newline indicators. Show line labels/symbols, semantic insertion/deletion word cues, and unchanged content without relying on color.

Use native labeled controls, visible focus, 44px targets, focus return on close, and concise announced status. Show title and body in one continuous GitHub-style unified diff with every line visible in one scroll, without pagination or collapsed unchanged sections (human selection, 2026-11-10). Keep tag membership changes as a summary; do not announce every token. Review the concrete screen design before UI implementation.

## Worker messages (selected design)

T004 declares these messages in `shared/types/article-comparison.ts`. Requests use a
`type: 'compare'` discriminator with `mode: 'draft-version' | 'version-version'` and
readonly captures. Responses discriminate on `type: 'result' | 'error'`. Result messages
wrap an `ArticleComparisonResult`; both wrapper and result include requestId/articleId.
Errors use code `comparison-failed` with a safe message. Startup/runtime transport failures
are handled by the controller; the Worker protocol is implemented in T009 and both-mode controller handling in T011–T019.

Instantiate lazily after client interaction using Vite's static new Worker(new URL(..., import.meta.url), {type:'module'}) pattern.

| Message | Fields |
|---|---|
| compare | requestId, articleId, captured baseline/target identity and title/body/tags |
| result | requestId, articleId, complete typed result with exact text changes and tag delta |
| error | requestId, articleId, safe error code/message; no partial-success claim |

Worker receives cloned values, never Vue state or database credentials. It runs the pure engine. Terminate/recreate on cancellation, supersession, route change, or unmount. A cancel message alone cannot interrupt synchronous execution. Handle startup/runtime/message errors; preserve input; allow explicit retry. Request generation guards apply even after abort/termination.

Selected engine: diff@9.0.0 exact line tokenization, followed by whitespace-preserving word tokenization over replacement blocks. The human-selected T010 optimization prunes unmatchable tokens from alignment search, uses a linear subsequence fast path, and otherwise uses jsdiff diffArrays; original-index projection retains every source token. Normalization/ignore options stay disabled. Preserve original line breaks and unequal block lengths; no arbitrary row pairing that loses words. Tags compare memberships. Exact reconstruction is mandatory.

Do not represent timeouts, dropped words, truncation, or reduced maximum size as successful output. Full-limit algorithm and DOM feasibility must be demonstrated before acceptance. Validate observable responsiveness using quickstart.md: Cancel/Close and source selection must take effect during pending computation, cancelled work must not produce late output, and the entire continuous output must be keyboard reachable. Record environment and timings without a fixed latency threshold.

## Read-only guarantees

Comparison changes no saved draft, revision, audit field, history, allocation counter, publication state/reference/date, or public data. Explicit Save before comparison is a separate existing writer operation. Source reads are independent captures; no multi-request transactional view or background deletion detection is promised.

## Implemented US1 boundary — 2026-11-10

The editor supplies saved article plus read-only dirty/pending/conflict refs. Current
controller mode is fixed to saved draft/version; the version/version mode and reversal
remain planned for T018–T020. All reads set retry:0 and AbortSignal; snapshots and saved
draft tags are copied. Guard watches run synchronously while pending and recheck before
Worker startup. Result acceptance validates request/article IDs, source UUID, and saved
revision. Close/cancel/supersession/unmount abort/terminate and clear retained state.

ArticleComparison renders escaped title/body in one table and complete automatic body
batches with no output cap, paging, or collapsed context. Batch scheduling is presentation
work only and is cancelled when output changes or the component unmounts. The 9 full-size
US1 production-editor fixtures passed complete DOM reconstruction, preserved fields,
SQL/public immutability, and pending-compute/render controls. Native collapsed-picker
keyboard coverage remains pending T025/manual review; boundary selection tests used a
temporary native listbox presentation. See draft-comparison-evidence.json and quickstart.


## Phase 4 implementation evidence — 2026-11-10

T018–T023 implement arbitrary retained-version pairs, same-source identity, fresh reads,
and role reversal. Historical capture permits unrelated dirty/conflicted draft fields;
active lifecycle writes block attempts. Selection/mode/reversal invalidate obsolete reads,
Workers, and output. Saved-draft guards remain strict. No comparison writes or backend
changes were introduced. The inline, complete single-scroll design remains in place.

[Historical evidence](../historical-comparison-evidence.json) records nine maximum-size
fixtures in both directions (18 completed comparisons), exact DOM/source and word-detail
checks, preserved fields, SQL/public immutability, pending-work cancellation, and keyboard
final-row access. Five additional controls interrupted real 100,000-row rendering without
late rows. The largest output took about 49–50s to append in this run; timings are observations,
not guarantees. Current-source saved-draft regression also reconstructed all 100,000 rows.
315 tests (171 unit + 144 PostgreSQL/HTTP), Nuxt typecheck, and production build passed.
Normal native popup-picker keyboard coverage, final T024–T027, and Windows T028 remain
pending. Earlier sections and US1 evidence retain their original checkpoint provenance.


## Final acceptance — 2026-11-10

Both-mode capture/result validation and cancellation are implemented. Native keyboard
selection/reversal/exit, escaped inert source rendering, symbolic and word cues, live status,
focus return and responsive targets passed in recorded Chrome/macOS coverage. Dev and prod
Workers complete both modes; real pending Workers terminate on cancellation, mode switch,
Close/reopen and route unmount. Existing owned GET/read-only contracts remain unchanged.
See [final acceptance](../quickstart.md) and [evidence](../historical-comparison-evidence.json).
