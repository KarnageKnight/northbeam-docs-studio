# Version Diff: Validation Guide

**Date**: 2026-11-09 | **Status**: Phase 1 setup verified on 2026-11-10; comparison acceptance below remains planned.
Option A architecture was selected on 2026-11-09; see [plan](plan.md). Feature controls are not implemented.
Original Windows acceptance T028 remains unverified.

## Phase 1 evidence — 2026-11-10

### T002: consistency review and spec-first checkpoint

The speckit-analyze review covered the spec, plan, all 27 tasks, supporting data model,
contract, research, and Constitution 2.0.0. All 12 functional requirements and 6 success
criteria have implementation/acceptance task coverage (100%). No blocking findings,
unmapped tasks, material ambiguity, duplication, or constitutional conflict were found.
Setup and final handoff tasks support the governance and evidence gates. Previously
recorded analysis remediations remain consistent with the artifacts. UI review and
full-limit feasibility remain future gates, not verified behavior. No extension hooks
are registered. The requirements checklist has 16 checked and 0 unchecked items.

| Requirements | Task coverage |
|---|---|
| FR-001, FR-004, SC-001 | T011–T017; T018–T023 for historical-mode independence |
| FR-002 | T018–T023 |
| FR-003, FR-005, FR-009, SC-002 | T004, T006–T008, T014, T018–T020 |
| FR-006, FR-007, SC-003 | T011–T013, T015–T016, T019, T021–T022, T026 |
| FR-008, SC-004 | T011–T013, T018–T019, T021–T022 |
| FR-010, FR-011, SC-005 | T005, T014, T020, T025 |
| FR-012, SC-006 | T004, T006–T010, T014, T016, T021–T022, T024 |

Before dependency edits, HEAD was `68bc18aaf97972336bddc9551169402c432265e7`
(`updating tasks`). Git history records the feature specification in `21d2ee3`, its
clarification in `7275a9c`, planning in `22f562e`, and the current task breakdown in
`68bc18a`. HEAD contains spec.md, plan.md, and tasks.md, with no comparison implementation
files or diff dependency. No application/dependency changes existed in the working tree.
This verifies the human-created spec-first checkpoint. The approved T001 governance
disposition remains uncommitted alongside this evidence; no commit was created by the agent.

The user requested completion of Phase 1 on 2026-11-10. This authorizes the remaining
setup tasks, not Phase 2 implementation or rendered UI approval.

### T003: installed dependency and baseline verification

Used the existing temporary Node executable at
`/private/tmp/northbeam-phase1-toolchain/node_modules/node/bin/node` (24.22.2), placed
first on PATH for every install/check, with pnpm 12.18.0. The shell default Node 24.14.0
was not used for these commands. `pnpm add --save-exact diff@9.0.0` succeeded; installed
manifest and ESM line/word exports were checked. Only package.json's direct dependency
and pnpm-lock.yaml's importer entry changed; existing package resolutions were preserved.

| Check | Actual result |
|---|---|
| `pnpm test` | Passed: 99 unit + 143 real PostgreSQL/HTTP tests, 242 total; no skips |
| `pnpm exec nuxt typecheck` | Passed |
| `pnpm run build` | Passed; production output generated |
| `git diff --check` | Passed |

The integration suite used the existing isolated Compose project and completed owned
container/network/volume cleanup. Tests and application source were unchanged. Existing
git/Docker ignore files cover the actual Nuxt/Node output, dependencies, local database,
and environment files; no ignore/configuration changes or browser-testing dependency
were needed. No extension hooks are registered.

Local command logs are `/private/tmp/northbeam-002-phase1-tests.log`,
`/private/tmp/northbeam-002-phase1-typecheck.log`, and
`/private/tmp/northbeam-002-phase1-build.log`. This verifies setup and the existing app,
not comparison computation, Worker loading, full-size rendering, or new UI behavior.
Those checks remain assigned to later tasks. Windows T028 remains unverified under the
approved deferral. Changes remain uncommitted for human review.

## Prerequisites and startup

Use existing [README](../../README.md) and [baseline guide](../001-docs-studio/quickstart.md).
Docker/Compose are needed for isolated integration tests. Host checks use pinned Node/pnpm
and locked dependencies. The selected diff@9.0.0 dependency was installed and locked in T003;
use `pnpm install --frozen-lockfile` with the pinned toolchain for a fresh checkout.

```sh
docker compose up --build
```

Open http://127.0.0.1:3000, choose Writer, and prepare two distinct retained versions plus a different saved draft. Do not treat future comparison steps below as currently working controls.

## Completion commands after implementation

```sh
pnpm run test:unit
pnpm run test:integration
pnpm exec nuxt typecheck
pnpm run build
```

pnpm test remains the one-command complete suite. Inspect/reuse existing tests before adding cases. Node tests cover pure algorithm/state; actual browser acceptance must exercise dev and production Worker bundles, DOM safety, cancellation, accessibility, and complete output. Extend the existing real-DB history-read tests only for missing evidence.

## Acceptance walkthrough

1. Edit without saving; draft comparison requires an explicit successful Save and sends no mutation itself. A failed/stale Save or typing during Save that leaves dirty input keeps comparison blocked and edits intact.
2. Compare saved draft with any retained version. Check source labels/revision, line changes, word changes, tag memberships, no-differences state, and saved capture semantics. Later editing does not silently change displayed output.
3. Compare any two retained versions, reverse roles, and select the same version twice. Keep unrelated unsaved edits intact. Unpublish and repeat both modes.
4. Compare empty bodies/tags, reordered tags, Unicode/emoji, whitespace, blank lines, CRLF/LF, final-newline changes, Markdown/raw HTML/unsafe links. All source remains escaped inactive text.
5. Delete a selected eligible version in another tab; next attempt reports unavailable, without substitution or partial/stale output. Wrong-owner UUID gets existing 404. No local fields disappear.
6. Delay GETs/compute; change sources/mode, close, reopen, or navigate to another article. Old results cannot overwrite current selection. Cancel/Worker error/retry preserve editor text.
7. Keyboard-only checks at 320/390/1440px: source selection, compare, reversal, all output portions, close/focus return; identify changes without color.
8. Reuse SQL/public-state capture helpers before/after comparison source reads: zero draft, revision, history, audit, counter, publication state/reference/date changes. Explicit setup Save is outside this assertion.

## Maximum-input feasibility gate

Exercise both modes with maximum title/tags and two 100,000-code-point bodies: identical, sparse edits, fully different token-dense text, repeated lines, many short lines, long single lines, large unequal replacement blocks, Unicode, and whitespace. Reconstruct each source exactly and verify required word detail. Every result chunk must remain reachable.

Apply this matrix in stages: T010 proves shared engine/Worker computation; T016 must verify the full rendered draft/version mode before the US1 MVP checkpoint; T022 must verify the full rendered version/version mode (including reversed roles) before the US2 checkpoint. T024 is final cross-mode regression and evidence review, not the first size-validation gate. Reuse unchanged-source story evidence and rerun cases affected by subsequent changes.

Record hardware/CPU/RAM, operating system, browser/version, build/source identity, fixture identity, compute/render timings, and available memory observations. Use the same recorded environment and fixtures for repeat checks. No fixed completion or cancellation time limit is approved; measured timings are observations, not service guarantees.

### Observable responsiveness acceptance

For each full-size case, run a completion attempt and a separate interaction/cancellation attempt where computation is still pending:

- **Interaction**: While computing, use the panel source selectors and Cancel/Close by keyboard or pointer. The intended control action must be handled before the original computation finishes; a UI that queues the action until completion fails. Switching sources must supersede the old attempt without losing editor fields.
- **Cancellation**: Cancel/Close must abort pending reads, terminate the current Worker, clear the pending comparison state, and permit another attempt. The cancelled attempt must never display a late result or remain computing. Verify Worker/request cleanup using browser tooling or controlled test observations.
- **Complete output**: In the non-cancelled attempt, computation must finish and all required line/word output must be accessible. Operate the progressive range controls by keyboard and reach the last range without missing content, corrupted source reconstruction, or lost draft fields.
- **Result**: Record observed actions and their order relative to completion alongside timings. Mark failure if interaction waits for the computation, cleanup fails, a stale result appears, the complete result cannot be reached, or a non-cancelled valid case produces no complete result. User-cancelled attempts are lifecycle checks, not successful full comparisons and not evidence of unsupported content size.

If a fixture finishes before pending interaction can be exercised, record that observation and cover the lifecycle ordering with a clearly labeled controlled delayed-boundary test. Do not report synthetic delays as production completion timings. Worker computation alone is insufficient if DOM rendering blocks the output controls.

Timeout/no-result, lost highlighting, truncation, smaller caps, or inaccessible omitted output fail FR-012/SC-006. Investigate another engine/design or request explicit requirement revision; do not report these cases passed. No maximum-input experiment was executed during planning.

## Evidence map

| Requirements | Evidence |
|---|---|
| FR-001, FR-002, FR-004, SC-001 | Both modes; save guard; saved capture/source labels |
| FR-003, FR-005, FR-009, SC-002 | Exact line/word reconstruction; empty/Unicode/whitespace/tag sets |
| FR-006, FR-007, SC-003 | Real-DB/public state unchanged; browser edits preserved |
| FR-008, SC-004 | Existing GET ownership/errors; deleted sources; stale response isolation |
| FR-010, FR-011, SC-005 | Actual browser escaped text/keyboard/mobile/non-color checks |
| FR-012, SC-006 | Full-limit engine and production-browser matrix |

Record only actual commands/results as execution evidence. This guide establishes no capacity, latency, WCAG certification, or untested browser guarantee.
