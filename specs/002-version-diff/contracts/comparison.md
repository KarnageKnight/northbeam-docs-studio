# Version Diff: Interface Contracts

**Date**: 2026-11-09 | **Status**: Design selected through option A on 2026-11-09; not implemented or verified.
Authority: [spec](../spec.md), [plan](../plan.md), [model](../data-model.md).

## Existing HTTP interfaces

No new endpoint. Retain [baseline HTTP contract](../../001-docs-studio/contracts/http-api.md).

- GET /api/writer/articles/by-slug/:slug: existing editor load obtains saved WriterArticle/revision. Comparison does not silently reload the editor.
- GET /api/writer/articles/:articleId/versions: existing selection list.
- GET /api/writer/articles/:articleId/versions/:versionId: fetch selected snapshots anew per attempt with retry:0 and abort signal. Same-version pairing may reuse a single read within that attempt.

Use existing 400 malformed-ID, 404 missing/wrong-owner, generic unexpected-error behavior. Never use lifecycle POST/PUT/DELETE for comparison. Clear superseded output before displaying a current attempt's failure. No public response or route change.

## UI/controller interface

Editor page supplies read-only saved article plus dirty/pending/conflict flags. A local useArticleComparison composable owns mode, selected UUIDs, request generation, fetching/computation status, error, captured result, cancellation, and presentation range.

Inline unified panel below history offers mode/source selectors, Compare/Refresh, Reverse for version/version, Close/Cancel. It shows source roles and version numbers/draft revision. A draft with local edits says Save your draft before comparing; it does not call Save. Existing conflict recovery remains separate. Version/version permits unrelated dirty fields.

No versions: explanatory state. One version: draft comparison available; explain a second distinct version is needed for historical changes, while same-version identity comparison remains valid. Current/last-published versions and unpublished articles are eligible. Display No differences explicitly.

Captured results do not change with later typing; explain save and refresh/reopen for draft changes. All operations preserve local fields. Missing source invalidates the attempt without fallback to another version or displaying another article.

Render escaped source strings using Vue text interpolation, never v-html, MarkdownContent, library HTML, or active links. Preserve whitespace with preformatted wrapping and explicit otherwise-invisible newline indicators. Show line labels/symbols, semantic insertion/deletion word cues, and unchanged content without relying on color.

Use native labeled controls, visible focus, 44px targets, focus return on close, and concise announced status. Progressively reveal complete output with keyboard-operable controls and ranges; do not announce every token or silently omit hidden content. Review the concrete screen design before UI implementation.

## Worker messages (selected design)

Instantiate lazily after client interaction using Vite's static new Worker(new URL(..., import.meta.url), {type:'module'}) pattern.

| Message | Fields |
|---|---|
| compare | requestId, articleId, captured baseline/target identity and title/body/tags |
| result | requestId, articleId, complete typed result with exact text changes and tag delta |
| error | requestId, articleId, safe error code/message; no partial-success claim |

Worker receives cloned values, never Vue state or database credentials. It runs the pure engine. Terminate/recreate on cancellation, supersession, route change, or unmount. A cancel message alone cannot interrupt synchronous execution. Handle startup/runtime/message errors; preserve input; allow explicit retry. Request generation guards apply even after abort/termination.

Selected engine: diff@9.0.0 line diff with normalization/ignore options disabled, then diffWordsWithSpace over replacement blocks. Preserve original line breaks and unequal block lengths; no arbitrary row pairing that loses words. Tags compare memberships. Exact reconstruction is mandatory.

Do not represent timeouts, dropped words, truncation, or reduced maximum size as successful output. Full-limit algorithm and DOM feasibility must be demonstrated before acceptance. Validate observable responsiveness using quickstart.md: Cancel/Close and source selection must take effect during pending computation, cancelled work must not produce late output, and all completed ranges must be keyboard reachable. Record environment and timings without a fixed latency threshold.

## Read-only guarantees

Comparison changes no saved draft, revision, audit field, history, allocation counter, publication state/reference/date, or public data. Explicit Save before comparison is a separate existing writer operation. Source reads are independent captures; no multi-request transactional view or background deletion detection is promised.
