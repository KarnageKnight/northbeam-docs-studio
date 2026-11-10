# Implementation Plan: Version Diff

**Branch**: `002-version-diff` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Status**: Option A selected by the user on 2026-11-09; task breakdown generated on 2026-11-09 in [tasks.md](tasks.md). Implementation, dependency installation, full-limit feasibility, and runtime verification remain pending.

## Summary

Add writer-only saved-draft/version and version/version comparisons to the existing editor. Require explicit successful Save before draft comparison when local edits exist. Show line differences and word-level highlighting in title/body, plus order-independent tag membership changes. Support both bodies at 100,000 Unicode code points without truncation.

Selected option A: reuse existing writer GETs and captured saved editor state, compute differences in a browser-only Web Worker using jsdiff, and display an inline unified comparison panel with progressively accessible complete output. No new database schema or comparison endpoint.

## Technical Context

**Language/Version**: Existing TypeScript 6.0.3, Vue 3.5.45, Nuxt 4.6.4, Node 24.22.2.
**Primary Dependencies**: Existing stack plus selected exact `diff@9.0.0` (jsdiff, upstream includes TypeScript declarations). Native Worker and AbortController; no worker framework. Install and lock this dependency during its implementation task, not this documentation update.
**Storage**: Existing PostgreSQL 18.6, read only. Comparison state is per-editor and transient.
**Testing**: Existing Vitest unit and real PostgreSQL/HTTP integration suites; pure engine/controller unit cases and actual-browser Worker/DOM/keyboard checks. No new browser testing dependency proposed.
**Target Platform**: Existing Compose and host workflows. Worker starts in browser interaction only, never during SSR. Chrome is the existing acceptance baseline; other browsers require actual checks.
**Project Type**: Extend existing Nuxt monolith.
**Performance Goals**: The user selected observable responsiveness checks on 2026-11-09, with no fixed timing threshold. Record hardware/OS/browser/build/fixture and measured compute/render timings. Pass requires Cancel/Close and source selection to take effect while compute is pending, cancelled requests/Workers to stop without late output, and keyboard access to every result range after successful completion; follow the repeatable procedure in quickstart.md. Worker execution does not prove worst-case completion. Full-limit feasibility is a blocking implementation acceptance gate; timeout, truncation, or line-only fallback cannot count as success. Shared compute feasibility precedes UI integration; full-size rendered acceptance then gates each story completion (T016 for US1, T022 for US2), followed by final cross-mode regression/evidence review (T024).
**Constraints**: Preserve edits; no lifecycle mutations; escaped text; stale-response protection; cancellation; no comparison-specific size reduction. Architecture selection is recorded; tasks and the human spec-first git checkpoint still precede code.
**Scale/Scope**: One active comparison/editor, two same-article sources. Per source: title 200, body 100,000 Unicode code points; 10 tags of 30 code points. No new system capacity claim.

## Constitution Check

Option A was selected by the user on 2026-11-09. No invariant exception is requested.

| Principle | Design response / gate |
|---|---|
| I. Spec first | Clarified spec and these artifacts precede tasks, human checkpoint, and implementation. |
| II. Draft/history isolation | Owned snapshot reads and copied saved content; no writes. |
| III. Lifecycle/concurrency | Preserve existing transactions and revision semantics; feature 003 is independent. |
| IV. Database-backed evidence | Reuse existing real-DB source ownership/read-only coverage; extend only missing cases. Full tests/typechecks/build gate implementation completion. |
| V. Small changes/stretch | Planning only. Required-work Windows T028 remains open; resolve prerequisite or obtain an explicit governance-compatible disposition before stretch implementation. |
| VI. Human architecture | SATISFIED for option A: user selected existing GETs, browser Worker/diff@9.0.0, inline panel/local state, and the documented verification approach on 2026-11-09. |
| VII. Consistent patterns | Native fetching, local Vue state, existing GET/error patterns/styles/tests; Worker extension selected as option A. |

**Pre-research result**: no research blocker. **Post-design result**: architecture selection gate satisfied by user selection of option A on 2026-11-09. Task generation may proceed. Required-work disposition, human checkpoint, UI review, and full-limit verification remain pending; no implementation or benchmark success is claimed.

## Architecture selection

| Option | Approach | Tradeoff |
|---|---|---|
| A — selected 2026-11-09 | Existing GETs + browser Worker with diff@9.0.0; inline unified panel; local comparison composable; complete progressive rendering | No backend/DB changes; browser compute and worker bundling require boundary validation. |
| B | New server comparison endpoint and diff engine, same UI | Adds API/resource/cancellation complexity and server load; large DOM still needs bounding. |
| C | Browser Worker with custom exact engine | Avoids dependency but adds substantial algorithm/tokenization maintenance and correctness work. |

Option A includes a panel below history, native mode/source selectors, Compare/Refresh, version-role reversal, Close/Cancel, read-only saved-state inputs, existing Vitest plus browser acceptance. Review rendered UI before screen implementation as in the baseline workflow. The user selected this option on 2026-11-09. Options B and C remain unselected.

## Project Structure

### Documentation (this feature)

```text
specs/002-version-diff/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── contracts/comparison.md
└── checklists/requirements.md
```

The generated [tasks.md](tasks.md) follows selected option A. Next run speckit-analyze and review the spec-first checkpoint and required-work prerequisites before implementation.

### Source Code (selected design; not implemented)

```text
app/components/ArticleComparison.vue
app/composables/useArticleComparison.ts
app/utils/articleDiff.ts
app/workers/articleDiff.worker.ts
shared/types/article-comparison.ts
app/components/ArticleHistory.vue                 # entry integration
app/pages/writer/articles/[slug]/edit.vue         # saved-state wiring
app/assets/css/main.css                          # existing visual system
tests/unit/article-diff.test.ts
tests/unit/article-comparison.test.ts
tests/integration/articles.test.ts               # only missing source-read evidence
```

**Structure Decision (option A selected)**: Keep comparison separate from lifecycle state/actions. The editor page supplies saved WriterArticle and dirty/pending/conflict flags. No comparison logic calls Save, Reload, Restore, Publish, Unpublish, or Delete.

## Phase 0: Research

[research.md](research.md) records the selected option A design, primary sources, alternatives, and the unverified full-limit feasibility risk. User selection on 2026-11-09 approves architecture, not implementation results.

## Phase 1: Design and contracts

[data-model.md](data-model.md) defines transient source/result/state models.
[contracts/comparison.md](contracts/comparison.md) defines API reuse, Worker messages, rendering and cancellation.
[quickstart.md](quickstart.md) defines future acceptance scenarios and verification.

Next: speckit-analyze for the generated task breakdown, followed by human review/checkpoint and prerequisite resolution before implementation. Do not introduce feature 003 publish behavior or amend its baseline in this work.

## Complexity Tracking

No constitution exception requested. Worker and bounded rendering address full-limit word-diff computation and potentially large DOM output. No worker pool, comparison persistence, global store, or new service.
