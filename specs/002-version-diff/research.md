# Version Diff: Research

**Date**: 2026-11-09 | **Status**: Research completed; option A selected by the user on 2026-11-09. Selected dependency installed on 2026-11-10; engine/Worker implemented and all 9 full-limit production computation fixtures verified after the human-selected optimization. Revised UI visual review approved on 2026-11-10; story-level DOM/controller acceptance remains pending.

## R1 — Computation boundary and engine

**Selected design (option A, 2026-11-09)**: Browser-only dedicated Worker with exact selected pin `diff@9.0.0`, subject to feasibility validation.

**Installation evidence (T003, 2026-11-10)**: `pnpm add --save-exact diff@9.0.0` ran with
Node 24.22.2 and pnpm 12.18.0. package.json pins `9.0.0`; pnpm-lock.yaml records the same
specifier/version. The package was already resolved transitively, so the lockfile change
only adds its direct importer entry; no unrelated package resolution changed. Reading the
installed manifest confirms 9.0.0, and ESM imports expose both `diffLines` and
`diffWordsWithSpace` as functions. This verifies installation/exports, not full-limit
algorithm feasibility or browser Worker behavior.

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

**Selected design (option A, 2026-11-09)**: Make maximum-size compute and browser rendering checks an early implementation gate before committing to integration. Retain complete result data. The human revised presentation on 2026-11-10 to one continuous unified article diff with every line visible, superseding paged/progressive portions.

**Rationale**: A Worker does not remove potentially expensive worst-case sequence alignment. Two 100,000-code-point token-dense dissimilar sources or repeated-line patterns can be costly. Rendering every row/span also threatens interaction even when computation is off-thread.

**Alternatives**: Time/edit-distance limits can produce no result; silent truncation, line-only degradation, and smaller comparison caps contradict FR-012/SC-006. They are failures requiring resolution, not acceptable successful fallbacks. Virtualization is another presentation option but adds keyboard/accessibility complexity.

No numeric latency target was selected. Initial production-browser measurements are recorded in quickstart.md; they do not establish full-limit feasibility. Report hardware/browser, completion timings, cancellation, and complete accessibility of results. If the engine cannot satisfy full-limit checks, resolve a different design or return for explicit scope clarification; do not claim support.

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

The user selected option A in plan.md on 2026-11-09, satisfying Constitution VI for the
documented architecture. The approved Constitution 2.0.0 disposition permits 002 work
while Windows T028 remains unverified; research does not establish Windows acceptance.
Algorithm full-limit feasibility is deliberately unverified. No unresolved technical
question is disguised as an approved choice.

## T010 exact optimization decision — 2026-11-10

The first production Worker experiment completed 4/9 maximum-size shapes; five dense
replacements produced no result in the 45-second observation window. That window is
an experiment limit, not an adopted latency requirement; full-limit support was not proved.
The human selected “Review exact optimizations within jsdiff (recommended)” over evaluating
alternative engines. Retain Worker/jsdiff and the exact reconstruction/word-detail contracts.

The selected optimization uses public jsdiff APIs to tokenize exact lines/words
(`diffLines`/`diffWordsWithSpace` against empty text with oneChangePerToken). Tokens absent
from the opposite source cannot match and may be excluded from alignment search, but must
be emitted unchanged as removed/added source text. If either retained sequence is a
subsequence of the other, greedy linear matching preserves a maximum-length common
subsequence. Otherwise jsdiff diffArrays aligns the retained exact tokens. Project the
chosen matches back to original token indices and emit every intervening source token;
then preserve original line boundaries as before. No ignore options, approximate equality,
timeouts, size caps, omitted words, or line-only fallback are introduced. The ambiguous
choice among equally valid repeated-token alignments may change; exact reconstruction
and word-level tests, plus the same production Worker matrix, gate adoption.

## T010 result — 2026-11-10

All nine original maximum-size fixtures completed and reconstructed exactly in the
optimized actual production Worker. Observed completion: 6.8ms–14,042.4ms on the recorded
M2 Pro/Chrome 157 environment. Keyboard probe cancellation, Close/source change, fresh
Worker retry, and maximum changed title/body/tags in both modes passed. Final tests,
typechecks, and build passed. See quickstart.md and worker-feasibility.json for initial
failures, measured outcomes, source/fixture identities, and limits. This demonstrates
shared computation feasibility for those fixtures, not final single-scroll DOM capacity,
all possible adversarial input timings, or untested browsers. No comparison-specific
content cap or engine timeout is introduced; final renderer/controller checks remain required.
