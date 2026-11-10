# Tasks: Version Diff

**Input**: Design artifacts in `specs/002-version-diff/`.
**Created**: 2026-11-09.
**Status**: Phases 1–2 (T001–T010) complete. The human approved the revised single-scroll design on 2026-11-10. T011–T027 remain unstarted; no editor comparison mode is integrated.
**Prerequisites**: [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contract](contracts/comparison.md), [validation guide](quickstart.md).
**Architecture**: Option A selected: existing writer GETs, browser Worker with exact `diff@9.0.0`, local comparison state, unified inline panel, complete continuous output.
**Tests**: Included because the specification defines independent test/acceptance scenarios and Constitution IV requires meaningful automated and real-database evidence.

## Format and execution rules

Each task uses `- [ ] Tnnn [P?] [USn?] description with paths`. IDs are local to 002.
[P] identifies different-file work that can overlap only after stated prerequisites; it does not authorize automatic multi-agent execution.
Paths are relative to the repository root. No schema, new comparison endpoint, publication behavior, or feature 003 implementation belongs here.

Keep tasks small and reviewable. Inspect comparable code and tests before editing; preserve existing coverage and update affected docs within each task. Do not create commits: the human owns the spec-first checkpoint, commits, and review. Architecture selection does not waive the required-work prerequisite, UI review, or verification gates.

Each implementation task includes only the focused tests and behavior it delivers. Within that task, write the relevant test, observe the expected failure when applicable, implement the behavior, and return the complete suite to green before marking the task complete. Do not introduce failing tests for behavior assigned to a later task or defer current test failures to a dependent task. For each application-code task run meaningful focused checks, Nuxt typecheck, production build, and the existing complete automated suite before claiming completion under Constitution IV. Report failures or unavailable checks honestly. Documentation-only work validates its artifacts and does not imply application verification.

## Phase 1: Setup

**Purpose**: Verify prerequisites and establish the selected dependency without re-scaffolding the existing app.

- [X] T001 Verify the required-work prerequisite against `specs/001-docs-studio/handoff.md`, `specs/001-docs-studio/tasks.md` (Windows T028), and `.specify/memory/constitution.md`; record actual completion evidence or an explicit human-approved governance-compatible disposition in `specs/002-version-diff/plan.md`. Do not infer Windows success or silently waive a constitutional requirement.

  **Evidence (2026-11-09)**: Reviewed the handoff, open T028, and constitution. The human
  approved the proposed governance amendment with "approve and move on". Constitution 2.0.0
  permits 002 implementation while Windows acceptance remains explicitly pending; the
  disposition and existing evidence are recorded in plan.md. Documentation validation only;
  application tests/build were not rerun. No application files, dependencies, or commits changed.
- [X] T002 Review the spec/plan/task consistency with speckit-analyze, resolve material findings in `specs/002-version-diff/spec.md`, `plan.md`, and `tasks.md`, and verify that the human has recorded the feature spec-first git checkpoint before dependency or application edits. Record checkpoint evidence in `specs/002-version-diff/quickstart.md`; do not create a commit.

  **Evidence (2026-11-10)**: speckit-analyze found no blocking consistency/coverage findings;
  all 18 requirements/outcomes map to tasks. Verified human checkpoint
  `68bc18aaf97972336bddc9551169402c432265e7` before dependency edits. See quickstart.md
  for the coverage map and history evidence. No commit was created.
- [X] T003 After T001–T002, add exact `diff@9.0.0` to `package.json` and update `pnpm-lock.yaml` with the pinned toolchain; verify existing application checks and document the selected installed version in `specs/002-version-diff/research.md`. Add no unrelated package upgrades or new browser-testing framework.

  **Evidence (2026-11-10)**: Installed exact diff@9.0.0 with Node 24.22.2/pnpm 12.18.0;
  verified manifest and line/word ESM exports. Only the direct dependency/importer entry
  changed; no unrelated upgrades. `pnpm test` passed 99 unit + 143 real-PostgreSQL/HTTP
  tests (242 total); Nuxt typecheck and production build passed. Integration cleanup
  completed. Research and quickstart record installation and actual checks. No application
  source/test changes or commits; Worker/full-limit/UI evidence remains future work.

**Checkpoint**: Required-work disposition and human checkpoint recorded; selected dependency is installed and baseline checks pass.

**Phase 1 status (2026-11-10)**: Complete under the user's request to complete Phase 1.
Changes were left uncommitted for review at that checkpoint. Phase 2 was pending; no visual
approval or full-limit feasibility was inferred from setup verification.

## Phase 2: Foundational work

**Purpose**: Establish shared contracts, exact computation, and full-limit feasibility before integrating either story.

- [X] T004 [P] Define source selections, copied saved/version captures, line/inline changes, tag sets, request/result/error messages, generation IDs, in `shared/types/article-comparison.ts` (the original presentation-range type was later retired by the human single-scroll revision) according to `specs/002-version-diff/data-model.md`. Preserve constraints verbatim: “Each source supports title 200 and body 100,000 Unicode code points, 10 tags of 30 code points.” Preserve source “kind (saved-draft/version)” and text “kind (unchanged/removed/added)”; versionId applies to version selections only. Use UUID as source identity and version number as label; results contain exact text, never HTML or stored comparison records.

  **Evidence (2026-11-10)**: Added readonly discriminated source/capture, line/inline,
  tag, mode/request/result/error, generation/status, and presentation-range types after
  inspecting existing shared article types and the approved model/contract. A temporary
  strict TypeScript probe accepted valid mode requests and rejected invalid roles,
  saved-draft versionId, removed-line target numbering, missing response article identity,
  and capture mutations. Nuxt typecheck, production build, and `pnpm test` passed
  (99 unit + 143 real PostgreSQL/HTTP tests, 242 total). Updated model/contract/plan and
  quickstart evidence. No runtime behavior or full-limit feasibility is claimed.
- [X] T005 [P] Prepare the concrete unified panel design in `specs/002-version-diff/ui-design.md`, covering both modes, source roles, saved revision, dirty-save guard, loading/error/identity states, word cues, complete continuous output, keyboard/focus, and 320/390/1440px layouts using existing styles. Record human visual review before T014/T020 screen implementation; do not treat the architecture selection as rendered-design approval.
- [X] T006 After T004, implement pure line changes and normalized tag membership differences in `app/utils/articleDiff.ts` together with passing focused cases in `tests/unit/article-diff.test.ts`. Inspect `tests/unit/markdown.test.ts` and `articles-validation.test.ts` first; cover line additions/removals, simple exact reconstruction, empty/identical sources, tag changes/order independence, and non-mutation without duplicating validation/rendering tests. Disable ignore/normalization options; add no failing word-highlighting cases until T007. Finish with the complete suite green.
- [X] T007 Extend `app/utils/articleDiff.ts` with whitespace-preserving word highlighting inside replacement blocks and add its passing cases to `tests/unit/article-diff.test.ts` in the same task. Verify changed versus unchanged words, unequal multiline replacements, original newline boundaries, and reverse direction. Do not zip unrelated lines arbitrarily or use a line-only fallback. Keep T006 cases and the complete suite green; do not leave word tests waiting for T008.
- [X] T008 Complete exact-text edge handling in `app/utils/articleDiff.ts` and `tests/unit/article-diff.test.ts` together: spaces/tabs, CRLF versus LF, blank lines, final newline, Unicode/emoji/combining sequences, and repeated-line ambiguity. Assert unchanged+removed reconstructs baseline and unchanged+added reconstructs target without normalization or splitting away source characters; fix any uncovered mapping defects in this task and finish with the complete suite green.
- [X] T009 Add `app/workers/articleDiff.worker.ts` with the typed compare/result/error protocol from `shared/types/article-comparison.ts`; send requestId/articleId through every response, execute only pure comparison, and report safe failures without partial-success output. Verify the Vite module Worker can be instantiated client-side from the production build without SSR accessing Worker.
- [X] T010 Prove early engine/Worker feasibility using `app/utils/articleDiff.ts`, `app/workers/articleDiff.worker.ts`, and boundary fixtures in `tests/unit/article-diff.test.ts`; record hardware/browser/build, timings, reconstruction and cancellation observations in `specs/002-version-diff/quickstart.md`. Exercise two 100,000-code-point bodies (identical, sparse changes, fully different token-dense text, repeated/many-short lines, long single lines, unequal replacements, Unicode), 200-code-point titles, and 10 tags of 30 code points. Browser probes must use the actual Worker; temporary local probes add no permanent public route. Timeouts, truncation, missing words, or smaller caps fail this gate; seek a reviewed design/requirement resolution instead of proceeding as if support passed. Apply the observable responsiveness acceptance procedure in `specs/002-version-diff/quickstart.md`: record environment/fixture/timings, actions processed during pending computation, cancellation/late-result cleanup, and complete keyboard-reachable continuous output, without a fixed timing threshold; report unexecuted checks as pending.

**Checkpoint**: Types and engine are established; concrete UI reviewed; actual Worker full-limit computation is demonstrated. This is not yet proof that final DOM rendering meets full-limit acceptance.

**Phase 2 status (2026-11-10)**: Complete (T004–T010). Following the human's GitHub-style
single-scroll request, the revised preview was approved with “Approve revised design”. Initial 4/9 full-size computation results failed to establish feasibility; the
human selected exact optimizations within jsdiff. All 9 fixtures then completed exactly
in the actual production Worker, with keyboard cancellation/close/source-change/retry
evidence. Final suite: 136 unit + 143 real PostgreSQL/HTTP (279 total); strict focused
test-source compilation, Nuxt typecheck, and build passed. See quickstart.md and
worker-feasibility.json for full environment/source/timing evidence and limitations.
No editor comparison integration or full-size DOM acceptance is claimed. Phase 3 has
not started; the temporary probe plugin/server were removed/stopped.


## Phase 3: User Story 1 — Compare saved draft with a retained version (P1 / MVP)

**Goal**: Writers can review saved content against any retained snapshot without changing stored state or losing local work.

**Independent test**: Publish a version, edit without saving and confirm comparison is blocked without autosave; explicitly save and compare changed title/body/tags. Confirm line/word detail, identity state, current/last-published eligibility, unpublished access, captured revision, and preserved inputs through errors/close/refresh.

### Tests and implementation

- [ ] T011 [US1] Establish copied saved-draft capture and synchronous guard behavior in `app/composables/useArticleComparison.ts` together with passing focused cases in `tests/unit/article-comparison.test.ts`: use `WriterArticle.draft` rather than editable fields, preserve saved revision/label, require dirty=false/pending=false/conflict=false, and remain blocked when successful Save leaves newer input dirty. Stub only established external boundaries and never call lifecycle writes. Introduce no failing asynchronous or cancellation cases before their implementation tasks; finish with the complete suite green.
- [ ] T012 [US1] Implement draft-mode snapshot fetching in `app/composables/useArticleComparison.ts` and its passing cases in `tests/unit/article-comparison.test.ts` together: fixed version baseline/saved-draft target, fresh owned GET with retry:0/abort signal, dirty/pending/conflict/article rechecks after reads, and missing/deleted/wrong-owner failure with preserved fields and no stale prior output or substitution. Never call Save/Reload; retain the exact label “Saved draft” and explicit Save/Refresh behavior. Keep the complete suite green.
- [ ] T013 [US1] Implement fetching/computing/ready/error transitions and the lazy client-only Worker adapter in `app/composables/useArticleComparison.ts`, with passing transport/Worker-boundary cases in `tests/unit/article-comparison.test.ts` in the same task. Cover generation/article/source isolation, startup/runtime errors and retry, termination/recreation on supersession/cancel/close/unmount, aborted reads, released captures, and close availability during computation. Node stubs do not replace real-browser Worker evidence; finish with the complete suite green.
- [ ] T014 [P] [US1] After T005 review and T011 saved-source contract, implement escaped unified result presentation in `app/components/ArticleComparison.vue` and scoped additions in `app/assets/css/main.css`: exact source text, title/body line numbers, word insertion/deletion cues, tag changes, explicit no-differences state, saved revision, loading/errors, and the complete article in one continuous unified diff, with every line visible and keyboard reachable without pagination or collapsed sections. Never use v-html/MarkdownContent or active source links; preserve whitespace and visibly identify final-newline changes. May overlap T012–T013 using T004 interfaces.
- [ ] T015 [US1] Wire read-only saved state and dirty/pending/conflict flags from `app/pages/writer/articles/[slug]/edit.vue` to the comparison composable/panel; add the reviewed entry point in `app/components/ArticleHistory.vue`. Keep existing inspect/restore/delete and Write/Preview behavior intact; comparison never calls lifecycle actions or changes their conflict state.
- [ ] T016 [US1] Exercise draft-mode browser acceptance against the built application using `app/components/ArticleComparison.vue` and the editor page: failed Save, typing during delayed Save/GET, stale draft state, unsaved edits after opening, close/cancel/reopen, missing source, current/last-published restore history, and unpublished article. Before T017 MVP review, also run the full maximum-input matrix from `specs/002-version-diff/quickstart.md` in draft/version mode against the production Worker and rendered panel: both bodies at 100,000 code points, maximum titles/tags, long and repeated lines, complete word detail, the entire article reachable by keyboard in one scroll, responsiveness, and cancellation. Record actual network/Worker behavior, preserved fields, no comparison writes, source labels, hardware/build/timings, and rendering outcomes in that guide. A failed or missing full-size rendering check blocks MVP completion. Apply the observable responsiveness acceptance procedure in `specs/002-version-diff/quickstart.md`: record environment/fixture/timings, actions processed during pending computation, cancellation/late-result cleanup, and complete keyboard-reachable continuous output, without a fixed timing threshold; report unexecuted checks as pending.
- [ ] T017 [US1] Update `README.md` with the verified saved-draft comparison demo and any real tradeoff/limitation; synchronize implemented/verified US1 status and evidence in `specs/002-version-diff/spec.md`, `plan.md`, `quickstart.md`, and `tasks.md`. Mark only verified behavior complete; identify US2 as pending and present the MVP for review before extending it.

**Checkpoint**: US1 is independently usable and verified only after T016 passes full-size computation and rendered-output acceptance in draft/version mode. MVP includes word detail and the full existing input limits; required behavior is not deferred to final polish.

## Phase 4: User Story 2 — Compare two retained versions (P2)

**Goal**: Writers can compare any retained same-article pair, reverse roles, and inspect historical changes while keeping unrelated draft edits intact.

**Independent test**: Publish two genuinely different contents, select any pair (not merely adjacent versions), reverse baseline/target, and verify reversed line/word/tag changes. Compare the same snapshot twice and identical-content distinct snapshots; preserve unrelated dirty/conflicted draft state and stored/public data.

### Tests and implementation

- [ ] T018 [US2] Add version/version source capture to `app/composables/useArticleComparison.ts` together with passing cases in `tests/unit/article-comparison.test.ts`: arbitrary selected same-article UUIDs, fresh owned reads on every attempt, one read for a same-source pair, current/last-published and unpublished eligibility, unrelated dirty/conflicted drafts, and unavailable source without substitution. Bypass only draft-specific guards, preserve local input, and finish with the complete suite green; do not pre-add failing reversal cases reserved for T019.
- [ ] T019 [US2] Add role reversal and historical-mode supersession behavior to `app/composables/useArticleComparison.ts` together with passing cases in `tests/unit/article-comparison.test.ts`: swapped source roles, new attempts after mode/source changes, obsolete HTTP/Worker completion rejection, and article navigation cleanup. Reuse engine reversal/identity cases in `tests/unit/article-diff.test.ts`, extending only missing evidence. Preserve the existing draft-mode behavior and finish with the complete suite green.
- [ ] T020 [P] [US2] After T018 and reviewed T005 design, add mode/source selectors and Reverse behavior to `app/components/ArticleComparison.vue`; provide no-history/one-version explanations, permit same-version identity checks, label baseline/target by version number, and preserve complete line/word/tag output. May overlap T019 because controller interfaces were established in T004.
- [ ] T021 [US2] Inspect the existing read-only history group in `tests/integration/articles.test.ts` and extend only missing deleted-source reread or maximum-size source retrieval evidence, reusing `readState()` and `tests/integration/helpers.ts`. Assert exact owned GET projections and zero committed draft/revision/audit/history/counter/publication/public-data changes for source reads; retain existing missing/wrong-owner, unpublished, protection, and lifecycle tests. Do not add an endpoint or duplicate already-proven cases.
- [ ] T022 [US2] Integrate both modes through `app/pages/writer/articles/[slug]/edit.vue` and verify in-browser arbitrary/same/identical version pairs, reversal, unrelated unsaved/conflicted input, mode switching during fetch/compute, source deletion in another tab, and unpublished access. Before T023 story review, also run the full maximum-input matrix from `specs/002-version-diff/quickstart.md` in version/version mode, including reversed source roles, against the production Worker and rendered panel: both bodies at 100,000 code points, maximum titles/tags, long and repeated lines, complete word detail, keyboard access to the entire continuous diff, responsiveness, and cancellation. Record actual results, hardware/build/timings, and preserved input/state evidence in that guide; recognize deletion on next attempt without promising background detection. A failed or missing full-size rendering check blocks US2 completion. Apply the observable responsiveness acceptance procedure in `specs/002-version-diff/quickstart.md`: record environment/fixture/timings, actions processed during pending computation, cancellation/late-result cleanup, and complete keyboard-reachable continuous output, without a fixed timing threshold; report unexecuted checks as pending.
- [ ] T023 [US2] Update `README.md` with the verified historical-pair/reversal demo and synchronize US2 status/evidence in `specs/002-version-diff/spec.md`, `plan.md`, `quickstart.md`, and `tasks.md`. Keep snapshots immutable and do not introduce feature 003 publication semantics or rewrite previous test evidence.

**Checkpoint**: Both modes work independently only after their per-story full-size computation/rendering gates pass (T016 and T022). US2 neither requires saving unrelated draft edits nor changes persisted data.

## Phase 5: Cross-cutting acceptance and handoff

**Purpose**: Verify the final integrated feature, including rendering limits and existing lifecycle behavior.

- [ ] T024 Perform the final integrated cross-mode regression against `app/components/ArticleComparison.vue` and the production Worker, following `specs/002-version-diff/quickstart.md`: review T016/T022 full-size evidence against the final source, switch modes/roles, cancel and reopen, and check preserved edits and complete output. Reuse unchanged-source story evidence; rerun affected full-size fixtures when later engine, Worker, controller, renderer, or build changes invalidate it. Record final source/build and evidence applicability; do not defer a missing story-level size check until this task or claim success with unapproved caps, omitted words, truncation, or fabricated timing guarantees. Apply the observable responsiveness acceptance procedure in `specs/002-version-diff/quickstart.md`: record environment/fixture/timings, actions processed during pending computation, cancellation/late-result cleanup, and complete keyboard-reachable continuous output, without a fixed timing threshold; report unexecuted checks as pending.
- [ ] T025 Verify escaped HTML/script/unsafe-link source text, non-color change identification, labeled controls, visible focus, 44px targets, announcements, close focus return, and no page overflow at 320/390/1440px in `app/components/ArticleComparison.vue` and `app/assets/css/main.css`; regress existing editor/history/public flows and record actual browser coverage in `specs/002-version-diff/quickstart.md`. Do not claim formal WCAG certification or untested browser support.
- [ ] T026 Run `pnpm test`, `pnpm exec nuxt typecheck`, and `pnpm run build` against the final source; verify development and production Worker loading, cleanup, and existing Compose startup using `package.json`, `vitest.config.ts`, and `compose.yaml` without unrelated configuration changes. Record actual commands, suite counts/results, runtime/hydration issues, and remaining platform gaps in `specs/002-version-diff/quickstart.md`.
- [ ] T027 Complete requirement/evidence reconciliation and handoff in `specs/002-version-diff/spec.md`, `plan.md`, `contracts/comparison.md`, `research.md`, `quickstart.md`, `tasks.md`, and `README.md`; preserve historical evidence, confirm all FR-001–FR-012/SC-001–SC-006 outcomes, review the full change set, and leave changes uncommitted for human review. Record unresolved issues explicitly rather than declaring them verified.

## Dependencies and execution order

```text
T001 required-work disposition
  → T002 analysis + human checkpoint
  → T003 selected dependency
  → T004 types ─→ T006 lines/tags + tests → T007 words + tests → T008 exact-text edges + tests → T009 Worker → T010 feasibility
  → T005 reviewed UI design (may overlap foundation engine work)
  → US1: T011 saved capture + tests → T012 source reads + tests → T013 lifecycle + tests
                    → T014 presentation (parallel after interfaces/design) → T015 integration
                    → T016 browser + full-size draft rendering → T017 MVP review
  → US2: T018 version capture + tests → T019 reversal/lifecycle + tests ─┐
                    → T020 controls ──┤ → T022 browser + full-size historical rendering → T023 story review
                    → T021 real-DB ───┘
  → T024 final cross-mode regression/evidence review → T025 accessible/security regressions
  → T026 final suites/build → T027 documentation/handoff
```

Foundation completion requires T004–T010 and approval of the concrete UI. Both stories depend on the shared engine/Worker; US2 intentionally reuses the delivered US1 controller/panel. Independent testability means each mode has its own acceptance, not that shared-file development can safely overlap. T017 depends on T016 full-size rendering evidence, and T023 depends on T022 full-size rendering evidence; T024 is not their first size-validation gate. T021 runs after prior story's source-read behavior is established and must not overlap another integration-suite owner. Run final validation after all source edits.

Phase checkpoints are review boundaries, not automatic permission to implement the next phase. Follow existing human review requirements; do not create a commit or infer that generating this task list authorizes implementation.

## Parallel examples

- **Foundation**: After T003, T004 (`shared/types/article-comparison.ts`) and T005 (`specs/002-version-diff/ui-design.md`) can proceed independently. T006 onward waits for the types; UI implementation waits for design review.
- **US1**: After T011 and reviewed design/interfaces, T014 (`ArticleComparison.vue`/CSS) may overlap T012–T013 (`useArticleComparison.ts`). T015 waits for both. T012 and T013 share a file and remain sequential.
- **US2**: After T018, T019 (composable) and T020 (component) may overlap. T021 edits a separate existing integration-test file but must respect the fixed disposable integration-run ownership; T022 waits for controller/controls/source evidence. Do not overlap T020 with other component/CSS edits.

These are scheduling opportunities only; no additional agents are requested or launched by this document.

## Implementation strategy

1. Resolve required-work/checkpoint prerequisites; install only the selected dependency.
2. Establish exact computation and prove full-input Worker feasibility early. If infeasible, stop dependent UI integration and obtain a reviewed design or scope resolution.
3. Deliver **US1 as MVP**: saved-draft comparison, explicit-save guard, word detail, safe complete output, errors, and input preservation.
4. Add **US2** through the same verified engine/panel, retaining version-only independence from unsaved draft input.
5. Prove the final full-limit DOM, accessibility/safety, lifecycle regression, and production checks before handoff.
6. Keep feature 003 separate; its constitution alignment and idempotent publishing are not dependencies of 002.

## Requirement coverage

| Requirements | Tasks |
|---|---|
| FR-001, FR-004, SC-001 | T011–T017; draft capture/Save guard |
| FR-002, SC-001 | T018–T023; arbitrary retained pairs/reversal |
| FR-003, FR-005, FR-009, SC-002 | T004, T006–T008, T014, T018–T020 |
| FR-006, FR-007, SC-003 | T011–T013, T015–T016, T019, T021–T022, T026 |
| FR-008, SC-004 | T011–T013, T018–T019, T021–T022 |
| FR-010, FR-011, SC-005 | T005, T014, T020, T025 |
| FR-012, SC-006 | T004, T006–T010, T014, T016, T021–T022, T024 |

## Generation summary

27 tasks: setup 3, foundation 7, US1 7, US2 6, final acceptance 4.
T001–T010 are complete; T011–T027 are pending. Story labels: US1 T011–T017; US2 T018–T023.
Parallel markers: T004, T005, T014, T020, subject to the dependency explanations above.

## Analysis remediation decisions

- **C1 — resolved in task design, 2026-11-09**: The user selected smaller complete increments (option A). T006–T008, T011–T013, and T018–T019 each own their relevant tests and implementation, with a green complete suite at every completed task boundary. No test-only predecessor depends on later implementation to become completable. This records a task-design correction, not executed application checks.

- **I1 — resolved in task design, 2026-11-09**: The user selected per-mode full-size rendering validation (option A). T016 gates the US1 MVP review, T022 gates US2 review, and T024 checks final integration/evidence applicability rather than providing the first rendering-limit evidence. No browser checks are claimed executed by this correction.

- **A1 — resolved in acceptance design, 2026-11-09**: The user selected observable responsiveness checks (option A), not fixed timing targets. The spec, plan, contract, and quickstart now define environment recording, action ordering during pending computation, cancellation cleanup, and complete continuous output access. T010/T016/T022/T024 reference that procedure. No runtime results are claimed.

- **I2 — resolved in checklist documentation, 2026-11-09**: The user selected updating the checklist summary (option A). `specs/002-version-diff/checklists/requirements.md` now states saved-draft comparison with an explicit successful Save for local changes, while historical comparison preserves unrelated unsaved input. No checklist checkbox or implementation task is marked newly complete.

## Human presentation revision — 2026-11-10

The human rejected the initial paged design, requested one GitHub-style article diff,
and selected every line visible in one scroll. Current T005/T014/T020/T025 design and
acceptance follow that choice, with no pagination or collapsed unchanged context. The
original presentation-range type from T004 was removed as superseded. The human approved the revised preview on 2026-11-10 with “Approve revised design”. This does not waive maximum-size computation/rendering checks.

## Phase 2 closure — 2026-11-10

The human approved the revised rendered design with “Approve revised design”, completing
T005 and Phase 2. The approved layout shows the entire article in one continuous unified
diff with every line visible, title changes in the same surface, and tag changes as a
summary. No pagination or collapsed unchanged context. This approval resolves the visual
design gate for later T014/T020; it does not verify the unimplemented panel/controller or
start Phase 3. Existing final engine tests/build evidence remains applicable; this closure
changes documentation only and creates no commit.
