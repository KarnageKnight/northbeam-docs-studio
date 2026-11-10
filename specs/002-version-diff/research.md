# Version Diff: Research

**Date**: 2026-11-09 | **Status**: Research completed; option A selected by the user on 2026-11-09. Implementation and full-limit verification pending.

## R1 — Computation boundary and engine

**Selected design (option A, 2026-11-09)**: Browser-only dedicated Worker with exact selected pin `diff@9.0.0`, subject to feasibility validation. No install performed.

**Rationale**: Existing APIs provide complete sources; comparison does not need server persistence or mutation. Worker computation keeps the diff algorithm off the UI thread. The upstream tagged manifest confirms version, ESM exports, TypeScript declarations, and BSD-3-Clause license. This is a verified candidate, not a claim of latest registry release.

**Alternatives**: Main-thread jsdiff is simpler but may block interaction. Server computation adds API and resource coordination without removing worst-case algorithm cost. A custom engine adds a large correctness burden. Character-oriented diff-match-patch is a less direct fit for line/word output and has archived upstream.

**Sources**: [Tagged package manifest](https://github.com/kpdecker/jsdiff/blob/v9.0.0/package.json), [jsdiff API](https://github.com/kpdecker/jsdiff), [diff-match-patch API](https://github.com/google/diff-match-patch/wiki/API).

## R2 — Exact line and word comparison

**Selected design (option A, 2026-11-09)**: jsdiff line changes followed by `diffWordsWithSpace` within adjacent replacement blocks. Preserve original newline boundaries and exact source text when mapping results to rows. Handle unequal line counts; do not arbitrarily zip changed lines and lose alignment.

**Rationale**: Plain word comparison that ignores whitespace conflicts with FR-009. Keep ignoreWhitespace, ignoreNewlineAtEof, stripTrailingCr, and other normalizations disabled. Pure insertion/deletion blocks mark their entire content; replacements additionally distinguish unchanged and changed words. Tags compare as sets of existing normalized saved strings.

**Alternatives**: Character-only output does not meet word-highlighting intent. Custom Unicode segmentation plus diffArrays is possible but needs separate design/tests. Default library word tokenization does not promise dictionary-quality segmentation for every language; exact Unicode reconstruction remains required.

**Evidence required**: Reconstruct both sources exactly, including Unicode sequences, CRLF/LF, empty text, repeated lines, blank lines, and final newline. Test reverse direction and within-line word replacements. No input normalization.

**Source**: [jsdiff API and options](https://github.com/kpdecker/jsdiff).

## R3 — Full-limit feasibility and presentation

**Selected design (option A, 2026-11-09)**: Make maximum-size compute and browser rendering checks an early implementation gate before committing to integration. Retain complete result data and expose bounded/progressive portions with explicit access to all output.

**Rationale**: A Worker does not remove potentially expensive worst-case sequence alignment. Two 100,000-code-point token-dense dissimilar sources or repeated-line patterns can be costly. Rendering every row/span also threatens interaction even when computation is off-thread.

**Alternatives**: Time/edit-distance limits can produce no result; silent truncation, line-only degradation, and smaller comparison caps contradict FR-012/SC-006. They are failures requiring resolution, not acceptable successful fallbacks. Virtualization is another presentation option but adds keyboard/accessibility complexity.

No numeric latency target was selected and no benchmark run. Report hardware/browser, completion timings, cancellation, and complete accessibility of results. If the engine cannot satisfy full-limit checks, resolve a different design or return for explicit scope clarification; do not claim support.

**Sources**: [jsdiff limits](https://github.com/kpdecker/jsdiff), [Vue large-list performance](https://vuejs.org/guide/best-practices/performance.html#virtualize-large-lists).

## R4 — Worker lifecycle and SSR

**Selected design (option A, 2026-11-09)**: Lazy module Worker using Vite's static constructor form; terminate/recreate on supersession, close, and unmount. Pair requests/results with generation and article IDs.

**Rationale**: SSR cannot access Worker. A queued cancel message cannot interrupt synchronous worker compute; termination can. Abort HTTP reads and independently reject stale completions. Browser verification must exercise development and production worker bundling.

**Sources**: [Vite Workers](https://vite.dev/guide/features.html#web-workers), [Worker termination standard](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate).

## R5 — Existing source reads and editor preservation

**Selected design (option A, 2026-11-09)**: Reuse existing writer snapshot GETs with retry disabled; clone the editor's saved WriterArticle.draft, not editable draft/tagsText. New local comparison composable manages only read state.

**Rationale**: Existing ownership/missing checks already exist. Refetch selected snapshots on each attempt to observe deletion rather than trusting inspection cache. Guard dirty/pending/conflict before and after asynchronous draft capture; a successful Save can leave newer typed edits dirty. Version/version comparison permits unrelated dirty or conflicted draft input. Another tab must not silently replace local fields.

Snapshot deletion after successful GET may be observed next attempt, as the spec permits; no cross-request atomic snapshot claim. Captured saved editor content is labeled by revision and is not a promise of latest database state. Existing explicit reload loads newer remote state.

**Alternatives**: New comparison endpoint or database entity unnecessary. Reusing mutable inspection state risks stale/missing sources and interference with Restore/Delete UI.

**Inspected sources**: app/composables/useArticleEditor.ts, app/components/ArticleHistory.vue, app/pages/writer/articles/[slug]/edit.vue, shared/types/articles.ts, server/services/articles/queries.ts, existing snapshot handlers.

## R6 — Verification approach

**Selected design (option A, 2026-11-09)**: Existing Vitest Node tests for pure algorithm/state rules, existing real-PostgreSQL HTTP group for owned source reads, actual browser acceptance for Worker and UI. No new browser framework dependency.

**Rationale**: Existing tests/integration/articles.test.ts already checks newest-first owned history, missing/wrong-owner sources, unpublished access, and unchanged stored/public state. Extend only meaningful missing evidence such as deleted-source reread or max-size source retrieval. Existing unit suites cover validation/Markdown, not a diff engine; focused new files have distinct purpose.

**Alternatives**: A new browser automation stack would add setup/dependencies; mocks alone cannot establish production worker bundling, accessible complete output, or database behavior.

## Review gates

The user selected option A in plan.md on 2026-11-09, satisfying Constitution VI for the documented architecture. Windows T028 remains an original delivery prerequisite gap, not resolved by research. Algorithm full-limit feasibility is deliberately unverified. No unresolved technical question is disguised as an approved choice.
