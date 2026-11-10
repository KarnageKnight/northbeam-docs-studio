# Implementation Plan: Version Diff

**Branch**: `002-version-diff` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Status**: Phases 1–3 complete on 2026-11-10. US1 saved-draft/version comparison is integrated and browser-verified; MVP presented for review. US2 and final cross-mode/accessibility checks remain pending. See [tasks](tasks.md), [validation](quickstart.md), and [US1 evidence](draft-comparison-evidence.json).

## Summary

Add writer-only saved-draft/version and version/version comparisons to the existing editor. Require explicit successful Save before draft comparison when local edits exist. Show line differences and word-level highlighting in title/body, plus order-independent tag membership changes. Support both bodies at 100,000 Unicode code points without truncation.

Selected option A: reuse existing writer GETs and captured saved editor state, compute differences in a browser-only Web Worker using jsdiff, and display an inline unified comparison panel with the complete article in one continuous scroll (human revision, 2026-11-10). No new database schema or comparison endpoint.

## Technical Context

**Language/Version**: Existing TypeScript 6.0.3, Vue 3.5.45, Nuxt 4.6.4, Node 24.22.2.
**Primary Dependencies**: Existing stack plus exact `diff@9.0.0` (jsdiff, upstream includes TypeScript declarations), installed and locked in T003 on 2026-11-10. Native Worker and AbortController; no worker framework.
**Storage**: Existing PostgreSQL 18.6, read only. Comparison state is per-editor and transient.
**Testing**: Existing Vitest unit and real PostgreSQL/HTTP integration suites; pure engine/controller unit cases and actual-browser Worker/DOM/keyboard checks. No new browser testing dependency proposed.
**Target Platform**: Existing Compose and host workflows. Worker starts in browser interaction only, never during SSR. Chrome is the existing acceptance baseline; other browsers require actual checks.
**Project Type**: Extend existing Nuxt monolith.
**Performance Goals**: The user selected observable responsiveness checks on 2026-11-09, with no fixed timing threshold. Record hardware/OS/browser/build/fixture and measured compute/render timings. Pass requires Cancel/Close and source selection to take effect while compute is pending, cancelled requests/Workers to stop without late output, and keyboard access to the entire continuous diff after successful completion; follow the repeatable procedure in quickstart.md. Worker execution does not prove worst-case completion. Full-limit feasibility is a blocking implementation acceptance gate; timeout, truncation, or line-only fallback cannot count as success. Shared compute feasibility precedes UI integration; full-size rendered acceptance then gates each story completion (T016 for US1, T022 for US2), followed by final cross-mode regression/evidence review (T024).
**Constraints**: Preserve edits; no lifecycle mutations; escaped text; stale-response protection; cancellation; no comparison-specific size reduction. Architecture selection is recorded; tasks and the human spec-first git checkpoint still precede code.
**Scale/Scope**: One active comparison/editor, two same-article sources. Per source: title 200, body 100,000 Unicode code points; 10 tags of 30 code points. No new system capacity claim.

## Constitution Check

Option A was selected by the user on 2026-11-09. Constitution 2.0.0 records the approved
Windows verification deferral for this feature; no lifecycle invariant exception is requested.

| Principle | Design response / gate |
|---|---|
| I. Spec first | Clarified spec and these artifacts precede tasks, human checkpoint, and implementation. |
| II. Draft/history isolation | Owned snapshot reads and copied saved content; no writes. |
| III. Lifecycle/concurrency | Preserve existing transactions and revision semantics; feature 003 is independent. |
| IV. Database-backed evidence | Reuse existing real-DB source ownership/read-only coverage; extend only missing cases. Full tests/typechecks/build gate implementation completion. |
| V. Small changes/stretch | T001 satisfied by the human-approved Constitution 2.0.0 exception on 2026-11-09. Windows T028 remains open and unverified; other implementation/review gates remain applicable. |
| VI. Human architecture | SATISFIED for option A: user selected existing GETs, browser Worker/diff@9.0.0, inline panel/local state, and the documented verification approach on 2026-11-09. |
| VII. Consistent patterns | Native fetching, local Vue state, existing GET/error patterns/styles/tests; Worker extension selected as option A. |

**Pre-research result**: no research blocker. **Post-design result**: architecture selection gate satisfied by user selection of option A on 2026-11-09. Required-work disposition is recorded below. T002 analysis/checkpoint and T003 dependency/baseline checks passed on 2026-11-10; Revised UI review is approved and engine/Worker full-limit computation is verified on the recorded fixtures; final DOM/controller acceptance remains pending.

## Implementation prerequisite audit — 2026-11-09

Implementation was requested on 2026-11-09. The prerequisite script selects this feature,
and the requirements checklist passes (16 checked, 0 unchecked). No extension hooks are
registered (`.specify/extensions.yml` is absent).

At the initial audit, T001 was pending: the feature 001 handoff records the required implementation and
242 passing automated tests, typechecks, build, and exercised startup/persistence flows,
but its Windows PowerShell acceptance T028 remains unchecked. The prior authorization
covered independent feature 001 audit/delivery work; it did not verify Windows or resolve
this feature's required-work gate. Constitution V requires required local setup and tests
before stretch work, and this plan explicitly requires a governance-compatible disposition.
The initial request to start implementation was not treated as a waiver. In response to the
explicit proposal to amend governance and defer the check, the human approved on 2026-11-09:
"approve and move on". Constitution 2.0.0 now permits feature 002 to proceed while Windows
T028 remains unchecked and required platform acceptance remains incomplete. This approved
order-of-work exception completes T001; it does not establish Windows success or waive any
other review/verification gate. No application checks were rerun for this documentation-only task.

The working tree was clean at audit start. HEAD
`68bc18aaf97972336bddc9551169402c432265e7` contains the feature spec, plan, and tasks;
their history includes `21d2ee3`, `7275a9c`, `22f562e`, and `68bc18a`. No comparison
implementation files are present in HEAD. This is preliminary checkpoint evidence, not
completion of T002's cross-artifact analysis at that initial audit. T002 subsequently verified
the same human checkpoint and found full task coverage with no blocking findings on
2026-11-10; T003 installed the selected pin and passed the 242-test suite, Nuxt typecheck,
and production build. See quickstart.md for the complete Phase 1 evidence. No commit was created.

## Architecture selection

| Option | Approach | Tradeoff |
|---|---|---|
| A — selected 2026-11-09 | Existing GETs + browser Worker with diff@9.0.0; inline unified panel; local comparison composable; complete single-scroll rendering (revised 2026-11-10) | No backend/DB changes; browser compute and worker bundling require boundary validation. |
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
├── ui-design.md
├── design-preview/index.html
├── contracts/comparison.md
└── checklists/requirements.md
```

The generated [tasks.md](tasks.md) follows selected option A. Phase 1 analysis,
checkpoint verification, prerequisite disposition, and dependency setup are complete.
Phase 2 began with T004 under the user's "next step" request on 2026-11-10.

### Source Code (US1 types/engine/Worker/controller/panel/tests implemented; US2 remains planned)

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

Phase 2 is complete: the human approved T005's revised design on 2026-11-10;
T006–T009 engine correctness and Worker protocol/production loading are verified. T010
maximum-input shared engine/Worker feasibility passed after the approved exact optimization. No editor comparison controls or
controller are integrated; later story-level browser/rendering checks remain required.
Do not introduce feature 003 publish behavior or amend its baseline in this work.

## Complexity Tracking

The sole approved constitution exception defers Windows T028 as a prerequisite to 002;
it leaves platform verification pending. Worker execution keeps computation off-thread. The human selected a continuous full-article
diff on 2026-11-10; final large-DOM responsiveness still requires explicit verification. No worker pool, comparison
persistence, global store, or new service.

## Presentation revision — 2026-11-10

The human requested a GitHub-style single diff and selected “Show every line in one
scroll.” This supersedes paged/progressive output: title and Markdown body share one
continuous diff surface, all unchanged context is visible, and tags remain a membership
summary. No pagination or collapsed content. Worker/jsdiff, read-only semantics, exact
word detail, and full source limits remain unchanged. The human approved the revised concrete preview on 2026-11-10. An unused presentation-range type was retired; this does not change
the Worker protocol. Full-size single-scroll rendering remains a later acceptance gate.

## Engine feasibility resolution — 2026-11-10

After five dense maximum-size experiments did not complete within the observation window,
the human selected exact optimizations within jsdiff. Research records exact token pruning,
linear subsequence matching, and jsdiff diffArrays for remaining alignment, followed by
projection to original source positions. The Worker boundary and package pin are unchanged.
This selection authorizes the T010 optimization experiment; acceptance still requires
exact reconstruction, complete word detail, passing regression checks, and actual Worker
full-limit results. No smaller content limit or fixed latency target is adopted.

## Foundation handoff — 2026-11-10

T006–T010 implemented exact line/word/tag computation and the typed Worker. All 9
maximum-body production Worker fixtures reconstruct completely after the human-selected
optimization, with responsive native-keyboard probe cancellation/close/source switching.
Observed completion ranged from 6.8ms to 14,042.4ms. Final 279-test suite, strict focused
test-source compilation, Nuxt typecheck, and production build passed. The temporary
probe was removed; no comparison panel/controller is integrated. T005's revised
single-scroll visual review was approved on 2026-11-10, completing Phase 2.
[Evidence](worker-feasibility.json) records source/fixture hashes and actual environment.
Single-scroll full-size DOM acceptance remains required in T016/T022.

Phase 2 closure records the human response “Approve revised design”. Next is T011 saved-draft
capture/guard behavior in Phase 3; Phase 3 has not started. No runtime changes or new test
results are implied by this documentation-only approval record.

## Saved-draft MVP handoff — 2026-11-10

T011–T017 implemented copied saved capture, synchronous guards, fresh owned GETs with
abort/retry:0, generation/source/article isolation, lazy client-only Worker lifecycle,
actual single-scroll panel, and editor/history entry integration. All lines append
automatically in yielded batches; source text is escaped and every row stays present.
No lifecycle handler is called by comparison, and existing inspect/restore/Write/Preview
behavior remains usable. Normal popup-picker keyboard driving is an explicit coverage
gap for T025/manual review; boundary source-keyboard probes used native listbox presentation.

All 9 full-size draft-mode fixtures passed actual Worker and DOM reconstruction, source
labels, saved fields, SQL/public immutability, keyboard end-of-output access, and pending
compute/render cleanup. Fourteen walkthrough groups and four supplemental groups passed.
Final 300-case suite, strict controller-test source check, Nuxt typecheck, and build pass.
The 100,000-row result took about 40.5s to finish rendering; no fixed latency guarantee,
size reduction, pagination, collapsed context, or lost word detail is introduced.
The disposable browser app/database was removed. Phase 3 MVP is ready for review before
Phase 4; version/version capture/selectors/reversal and T024–T027 remain pending.
