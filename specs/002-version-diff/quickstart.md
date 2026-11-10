# Version Diff: Validation Guide

**Date**: 2026-11-09 | **Status**: Phases 1–3 complete on 2026-11-10. Saved-draft comparison MVP verified within recorded browser coverage; US2 and final acceptance remain pending.
Option A architecture was selected on 2026-11-09; see [plan](plan.md). Saved-draft controls are implemented; historical pair/reversal controls remain pending.
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

## T004 evidence — 2026-11-10

Added `shared/types/article-comparison.ts` with readonly captures, discriminated source
roles and messages, exact text/inline changes, normalized tag membership output, request
generations, and output ranges. The original source limits are preserved verbatim.
Contracts and data-model documentation describe the implemented types and their limits.

With Node 24.22.2/pnpm 12.18.0, the temporary strict compile probe
`/private/tmp/northbeam-002-t004-typecheck.ts` passed via `pnpm exec tsc --ignoreConfig
--strict --noEmit --skipLibCheck --target es2022 --module esnext --moduleResolution bundler
/private/tmp/northbeam-002-t004-typecheck.ts`. Positive fixtures cover both request modes,
exact removed-line text, and an error response. Expected compile errors cover invalid
source roles, saved-draft versionId, invalid line numbering, missing message articleId,
and mutation of captured text/tags. No permanent runtime tests were added for type-only work.

`pnpm test` passed 99 unit + 143 real PostgreSQL/HTTP tests (242 total, no skips);
`pnpm exec nuxt typecheck`, `pnpm run build`, and `git diff --check` passed.
Integration resources were cleaned up. Logs are `/private/tmp/northbeam-002-t004-tests.log`,
`/private/tmp/northbeam-002-t004-typecheck.log`, and `/private/tmp/northbeam-002-t004-build.log`.
No extension hooks are registered. Changes remain uncommitted. Runtime copies, size checks,
stale-result handling, Worker loading, and UI/full-limit acceptance remain later work;
readonly types alone do not verify them. Next is T005 concrete UI design/review.

## Prerequisites and startup

Use existing [README](../../README.md) and [baseline guide](../001-docs-studio/quickstart.md).
Docker/Compose are needed for isolated integration tests. Host checks use pinned Node/pnpm
and locked dependencies. The selected diff@9.0.0 dependency was installed and locked in T003;
use `pnpm install --frozen-lockfile` with the pinned toolchain for a fresh checkout.

```sh
docker compose up --build
```

Open http://127.0.0.1:3000, choose Writer, and prepare two distinct retained versions plus a different saved draft. The saved-draft steps are implemented and verified as recorded below; version/version steps remain planned.

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

Exercise both modes with maximum title/tags and two 100,000-code-point bodies: identical, sparse edits, fully different token-dense text, repeated lines, many short lines, long single lines, large unequal replacement blocks, Unicode, and whitespace. Reconstruct each source exactly and verify required word detail. The entire article must remain reachable in one continuous scroll, with every line visible.

Apply this matrix in stages: T010 proves shared engine/Worker computation; T016 must verify the full rendered draft/version mode before the US1 MVP checkpoint; T022 must verify the full rendered version/version mode (including reversed roles) before the US2 checkpoint. T024 is final cross-mode regression and evidence review, not the first size-validation gate. Reuse unchanged-source story evidence and rerun cases affected by subsequent changes.

Record hardware/CPU/RAM, operating system, browser/version, build/source identity, fixture identity, compute/render timings, and available memory observations. Use the same recorded environment and fixtures for repeat checks. No fixed completion or cancellation time limit is approved; measured timings are observations, not service guarantees.

### Observable responsiveness acceptance

For each full-size case, run a completion attempt and a separate interaction/cancellation attempt where computation is still pending:

- **Interaction**: While computing, use the panel source selectors and Cancel/Close by keyboard or pointer. The intended control action must be handled before the original computation finishes; a UI that queues the action until completion fails. Switching sources must supersede the old attempt without losing editor fields.
- **Cancellation**: Cancel/Close must abort pending reads, terminate the current Worker, clear the pending comparison state, and permit another attempt. The cancelled attempt must never display a late result or remain computing. Verify Worker/request cleanup using browser tooling or controlled test observations.
- **Complete output**: In the non-cancelled attempt, computation must finish and all required line/word output must be accessible. Scroll by keyboard through the single unified diff to its final line without missing content, corrupted source reconstruction, or lost draft fields.
- **Result**: Record observed actions and their order relative to completion alongside timings. Mark failure if interaction waits for the computation, cleanup fails, a stale result appears, the complete continuous result cannot be reached, or a non-cancelled valid case produces no complete result. User-cancelled attempts are lifecycle checks, not successful full comparisons and not evidence of unsupported content size.

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

## Phase 2 execution — 2026-11-10

T005: concrete UI design and interactive preview prepared; human visual review remains pending.

T006: line changes and order-independent normalized tag membership implemented. Inspected
existing Markdown and article validation tests first. The focused test initially failed
because the engine did not exist, then all 7 cases passed. An unsupported explicit
ignoreCase option was caught by typecheck and removed (line comparison remains exact).
After correction, Nuxt typecheck, production build, and the complete suite passed:
106 unit + 143 real PostgreSQL/HTTP tests (249 total). Logs:
`/private/tmp/northbeam-002-t006-{red,typecheck,build,tests}.log`.
This increment did not yet implement word highlighting.

T007: whole-block whitespace-preserving word alignment implemented and projected back to
each source's original line boundaries; unequal line counts are not zipped. Two new word
assertions failed before implementation, then all 10 focused cases passed. Complete suite:
109 unit + 143 real PostgreSQL/HTTP (252 total); Nuxt typecheck/build passed. Logs:
`/private/tmp/northbeam-002-t007-{red,typecheck,build,tests}.log`.

T005 preview checks: headless Chrome exercised eight states at 320/390/1440px without
page overflow (24 layout cases), historical role reversal, native Enter activation of
range navigation, heading focus, and close focus return; no runtime exceptions.
Screenshots: `/private/tmp/northbeam-002-design-{320,390,1440}.png`; observations:
`/private/tmp/northbeam-002-design-results.json`. Native key input was corrected in the
probe after its initial assertion failed; the corrected run passed. These are preview
checks, not production comparison acceptance or human visual approval.

T008: 25 focused cases now cover spaces/tabs, CRLF versus LF, blank/final newlines,
lone CR, case changes, Unicode/emoji/combining sequences, repeated-line ambiguity,
unequal line boundaries, reverse direction, and 150 deterministic mixed-text pairs.
Both sources and every row's inline text reconstruct exactly; edge cases passed without
an additional engine defect. Nuxt typecheck/build and complete suite passed:
124 unit + 143 real PostgreSQL/HTTP (267 total). Logs:
`/private/tmp/northbeam-002-t008-{typecheck,build,tests}.log`.

T009: pure aggregate result creation and typed Worker implemented. The protocol test
failed for the missing Worker, then passed for complete results in both modes and safe
article-scoped errors; frozen inputs were unchanged. Complete suite: 125 unit + 143
real PostgreSQL/HTTP (268 total); Nuxt typecheck and build passed. Logs:
`/private/tmp/northbeam-002-t009-{red,typecheck,build,tests}.log`.
A temporary client-only Nuxt plugin used the actual static module Worker constructor.
The production Nuxt build succeeded without SSR accessing Worker, and Chrome loaded
`/_nuxt/articleDiff.worker-vRSe9O3l.js` and received a scoped, non-identical result.
No browser runtime exceptions; `/private/tmp/northbeam-002-worker-smoke.json` records
browser identity, asset URL, and result. The probe uses the new-article page, performs
no lifecycle requests, and is removed before handoff. Controller integration is still pending.

## T010 feasibility resolution and final Phase 2 checks — 2026-11-10

Environment: Apple M2 Pro, 16 GiB RAM, macOS 27.0.1, headless Chrome 157.0.0.0
(browser reports 12 hardware threads), Node 24.22.2, pnpm 12.18.0, Nuxt 4.6.4,
Vite 8.3.5, diff 9.0.0. [worker-feasibility.json](worker-feasibility.json) preserves
fixture hashes, source hashes, observed timings, cancellation, metadata checks, and both
initial/optimized attempts. No Worker heap or peak-memory measurement was taken.

The initial production Worker completed identical, sparse, long-single-line, and repeated
line inputs, but five dense shapes did not produce results in the 45-second observation
window. The window was an experiment bound, not a new latency requirement. No full-limit
success was claimed for that implementation. The human selected exact jsdiff optimization;
research/plan record the token-pruning/subsequence design before dependent engine edits.
All source characters and required word detail are retained. Raw initial results remain
in the evidence artifact; they are not overwritten by successful reruns.

The optimized actual production Worker completed all nine fixtures. Each source has a
100,000-code-point body, 200-code-point title, and ten 30-code-point tags. Baseline and
target reconstruction plus every inline row's exact reconstruction passed.

| Fixture | Observed completion (ms) | Output rows | Result |
|---|---:|---:|---|
| identical | 23.5 | 7693 | Exact complete result |
| sparse | 41.1 | 7695 | Exact complete result |
| long-single-line | 6.8 | 2 | Exact complete result |
| repeated-lines | 75.8 | 16669 | Exact complete result |
| many-short-lines | 517.3 | 100000 | Exact complete result |
| unequal-replacements | 14042.4 | 16234 | Exact complete result |
| unicode | 315.5 | 22500 | Exact complete result |
| whitespace | 338.1 | 66666 | Exact complete result |
| different-token-dense | 211.3 | 2 | Exact complete result |

Timings include Worker startup, computation, transfer, and reconstruction checks on the
probe page; they are not isolated engine CPU times or final DOM-rendering measurements.
The slowest fixture took about 14 seconds. These observations are not latency guarantees
or proof for every possible input/browser. No engine timeouts, smaller caps, truncation,
or line-only fallback were introduced.

Each fixture had a separate native-keyboard Cancel attempt. All nine actions occurred
before a response, terminated/released the actual Worker, preserved the probe's input
field, and produced zero late messages during the subsequent 150ms observation. Observed
action times were 1.1–8.2ms. Additional native-keyboard Close and source-change probes
terminated pending work (2.3ms and 6.7ms), with zero messages in the subsequent 200ms.
A fresh Worker then completed a new attempt. Both request modes also reconstructed
maximum changed emoji titles, bodies, and ten added/ten removed maximum-size tags exactly.
No runtime exceptions were observed. These are temporary Worker harness controls, not
implementation/acceptance of the future comparison composable or editor panel. The
probe's input-field check is not evidence for all reactive editor fields or HTTP guards.

The temporary client-only Nuxt plugin used the actual static module Worker constructor;
production asset `/_nuxt/articleDiff.worker-DBsBIcJa.js` loaded successfully. The plugin
was removed and its local production server stopped before final checks. No permanent
public route, plugin, browser-testing framework, or lifecycle mutation was added.

Final source checks passed: `pnpm test` (136 unit + 143 real PostgreSQL/HTTP tests,
279 total, no skips), strict focused test-source TypeScript compilation, Nuxt typecheck,
and production build. The 37 engine/Worker/fixture cases include all nine full-body
reconstruction fixtures and 200 differential line-alignment pairs in addition to exact
text/word/tag/Worker cases. The unequal-replacement fixture exceeded Vitest's default
5-second per-test budget during optimization; its exact reconstruction finished, and
the boundary group now has a local 30-second test budget. This changes only test-runner
budget, not production engine limits or product latency requirements. Final suite passed.
Logs: `/private/tmp/northbeam-002-phase2-{typecheck,build,tests}.log`.
Integration test resources were cleaned up; no extension hooks are registered.

### Revised UI design and remaining gates

The human rejected the paged preview and selected one GitHub-style article diff with
every line visible in one scroll. Spec/plan/contract/tasks/model now reflect that choice;
the obsolete presentation-range type was removed. The revised preview passed 27 layout
cases (nine states at 320/390/1440px), native-keyboard continuous scrolling, reversal,
and close focus return with no runtime exceptions. The updated mobile screenshot was
visually inspected. `/private/tmp/northbeam-002-design-revised-results.json` records the
checks. The human subsequently approved the revised rendered preview on 2026-11-10 with “Approve revised design”; T005 is complete.

T010's shared engine/Worker feasibility is verified; the entire final article UI and
its maximum-size DOM/keyboard responsiveness are not implemented or verified. T016/T022
must test the real single-scroll panel, including its 100,000-row worst observed output,
before either story is complete. No controller, source GET orchestration, actual comparison
controls, or lifecycle-write behavior was implemented by these foundation tasks. The subsequent human approval of the revised design completes Phase 2; Phase 3 remains pending.
Windows T028 remains unverified under its approved deferral. All agent changes remain
uncommitted; no commit or external write was performed.

### Phase 2 visual approval — 2026-11-10

The human selected “Approve revised design” for the rendered single-scroll preview.
T005 and Phase 2 are complete; T011–T027 remain pending. This record changes documentation
only: artifact/diff validation was performed, and application tests/build were not rerun.
The previous 279-test/typecheck/build and Worker evidence applies to unchanged runtime
source. No commit was created.

## Phase 3 execution — 2026-11-10

T011: copied saved-draft capture/guards implemented after reviewing useArticleEditor and
existing unit tests. Initial focused import failed before the composable existed; all 5
capture/guard cases then passed. Capture retains Saved draft/revision and copies tags;
dirty/pending/conflict/missing sources are blocked, including newer dirty input after Save.
Full suite: 141 unit + 143 real PostgreSQL/HTTP (284 total); Nuxt typecheck/build passed.
Logs: `/private/tmp/northbeam-002-t011-{red,typecheck,build,tests}.log`.
No source fetching, Worker/controller lifecycle, or panel integration is claimed by T011.

T012: fresh owned version GETs implemented with retry:0/AbortSignal and copied saved-draft
as fixed target. Seven new tests failed before implementation, then all 12 controller
cases passed. Reads recheck article/revision/dirty/pending/conflict, clear stale captures
on failure, copy fetched tags, and never call lifecycle writes or editor reload.
Full suite: 148 unit + 143 real PostgreSQL/HTTP (291 total); Nuxt typecheck/build passed.
Logs: `/private/tmp/northbeam-002-t012-{red,typecheck,build,tests}.log`.

T013: lazy static module Worker and comparison lifecycle implemented. Nine new cases
failed before implementation, then all 21 controller cases passed. Guard watches run
synchronously during fetch/compute; stale generations/articles/sources are rejected.
Close/cancel/source changes/unmount abort reads, terminate Workers, and release captures.
Startup/runtime/message failures are safe and retry creates a fresh Worker. Later editing
keeps a ready saved-revision capture. Full suite: 157 unit + 143 real PostgreSQL/HTTP
(300 total); Nuxt typecheck/build passed. Node boundary tests do not replace browser evidence.
Logs: `/private/tmp/northbeam-002-t013-{red,typecheck,build,tests}.log`.

T014: escaped unified comparison panel and scoped styles implemented from the approved
preview. Title/body share one table; word cues, original line-ending annotations, source
labels/revision, tags, identity/errors/loading, and native controls are present. All body
rows append automatically in yielded batches; no pagination, collapsed context, or caps.
Nuxt typecheck and the 300-test suite passed. The first host build encountered a generated
.output ENOTEMPTY cleanup error; an unchanged-source retry passed. Logs:
`/private/tmp/northbeam-002-t014-{typecheck,build,build-retry,tests}.log`.
Panel/browser/full-size acceptance remains T015–T016; compile checks alone do not prove it.

T015: history Compare entry and read-only editor wiring implemented; Close returns focus
through the original entry. Existing Write/Preview and lifecycle handlers were preserved.
Corrected the Compare button's optional aria-describedby reference. Full 300-test suite,
Nuxt typecheck, and build passed. Logs: `/private/tmp/northbeam-002-t015-{typecheck,build,tests}.log`.
The separate northbeam002-browser Compose project starts the built app on loopback 3314
with its own PostgreSQL volume for T016; this does not modify the normal application data.
Actual browser and full-size renderer acceptance remains pending until recorded below.

## T016 saved-draft browser acceptance — 2026-11-10

[Persistent evidence](draft-comparison-evidence.json) records the production image/source
checksums, 14 walkthrough groups, four supplemental groups, and all nine complete maximum
input comparisons through the actual editor/controller/panel. Source files in the Linux
Compose image matched the workspace byte-for-byte. Browser: headless Chrome 157.0.0.0 on
the recorded M2 Pro/16 GiB/macOS 27.0.1 host; Node 24.22.2/pnpm 12.18.0, Nuxt 4.6.4,
Vue 3.5.45, Vite 8.3.5, diff 9.0.0. The separate northbeam002-browser app/database used
loopback 3314 and its own volume; its containers/network/volume were removed afterward.

Actual flows passed: dirty opening without writes/Worker; failed Save; newer typing during
an explicitly delayed Save; successful explicit Save and comparison; later dirty edits
leaving the captured result intact; close/focus-return/reopen; typing/source changes/close
while a GET response was deliberately delayed; Worker startup/runtime failure injection
and retry; controlled delayed Worker cancellation; stale saved editor response labeled
by its captured revision; deleted source without substitution/old output; unpublished
last-published access and public 404; empty body/tags; explicit identity; existing UI
inspect/restore followed by comparison refresh; stale Save conflict retaining all local
fields; and explicit Cancel/Confirm reload recovery. No comparison calls Save or Reload.

Raw HTML/script/unsafe links stayed inactive exact source text. The real panel had no
page overflow at 320/390/1440px, had semantic word cues, and preserved Write/Preview.
The mobile screenshot was visually inspected. Runtime exceptions and hydration warnings
were zero in completed runs. Expected controlled runtime-error injection is recorded
separately from ordinary application failures. Initial probe issues (escaped URL regex,
textarea newline expectation, DELETE 204 parsing, hydration readiness, document-end key,
and native picker driving) were corrected in the probes; no application fix or changed
source was needed after the T015 passing checks.

Each maximum-input attempt uses 200-code-point titles, ten 30-code-point tags per source,
and two 100,000-code-point bodies. Titles/tags also differ. Every DOM source character,
full row count, saved-editor field, and baseline/target reconstruction passed. SQL rows
(including revisions/audit/counters/history/publication metadata) and public projections
were unchanged around completed comparisons; browser comparison requests had no writes.
No result was paginated, collapsed, truncated, or stripped of word detail.

| Body fixture | Worker + transfer (ms) | Observed render completion (ms) | Rendered body rows |
|---|---:|---:|---:|
| identical | 19.2 | 525.7 | 7693 |
| sparse | 34.5 | 422.6 | 7695 |
| long-single-line | 6.8 | 83.8 | 2 |
| repeated-lines | 66.0 | 1675.1 | 16669 |
| many-short-lines | 493.8 | 40475.1 | 100000 |
| unequal-replacements | 11297.9 | 1620.2 | 16234 |
| unicode | 333.8 | 3330.1 | 22500 |
| whitespace | 337.3 | 17936.4 | 66666 |
| different-token-dense | 213.3 | 77.1 | 2 |

Render timing is main-thread observed completion, including polling/queued work; it is
not an isolated paint benchmark. The largest 100,000-row result needed about 40.5 seconds
to render. Timing and main-heap hints are observations, not guarantees or peak/Worker
memory measurements. The complete output was reached with native End-key document
scrolling; maximum long-single-line output also stayed within 320/390px page widths.

All nine fixtures separately exercised Cancel/Close/source supersession while computing:
local fields survived, actual Workers terminated, and no obsolete output appeared. Fast
cases that completed before interaction used explicitly flagged 700ms transport delays;
these artificial delays are excluded from completion timings. Source selection was driven
by native keyboard with the real select temporarily shown as a listbox because this macOS
headless CDP session did not commit the native popup menu. The normal collapsed picker
keyboard check remains a T025/manual coverage gap; no blanket keyboard/WCAG certification
or other-browser support is claimed. Native entry/Compare/Cancel/Close and continuous
output scrolling were tested without changing their presentation.

Additional real rendering attempts (no artificial delay) interrupted the 100,000-row
result after 4,000–5,000 rows. Cancel, Close, and source changes processed in observed
419–587ms, stopped subsequent batches, and preserved fields; zero rendered rows reappeared
during the following 300ms. Compute cancellation late-message observation windows were
200ms, or 800ms for controlled delays. These checks prove controls act before pending
work completes, without adopting a numerical responsiveness requirement.

T016 passed the US1 full-size computation/rendering gate. Actual evidence and source
identities are in draft-comparison-evidence.json. Temporary probe sources/logs/screenshots
are in `/private/tmp/northbeam-002-phase3-*`; startup/cleanup logs are
`/private/tmp/northbeam-002-t016-{startup,cleanup}.log`. No temporary probe plugin or route
was added to the app. US2 and final cross-mode/accessibility checks remain future work.

## T017 saved-draft MVP handoff — 2026-11-10

US1 is implemented and browser-verified within the recorded coverage. README now gives
the actual saved-draft demo, preserved-edit behavior, and the observed full-DOM tradeoff.
Final runtime source is unchanged from the T015 checks: `pnpm test` passed 157 unit +
143 real PostgreSQL/HTTP cases (300 total), Nuxt typecheck and production build passed.
Focused controller test sources also compiled strictly using the generated Nuxt type
context. Documentation/artifact diff checks passed; no redundant runtime rerun is claimed
for this documentation-only handoff. The prior transient generated-output build cleanup
failure and successful retry remain recorded in T014 evidence.

Phase 3 (T011–T017) is complete and presented for MVP review. Phase 4 (US2 two versions/
reversal, T018–T023) and final T024–T027 checks remain pending. Native collapsed-picker
keyboard coverage and Windows T028 remain explicitly unverified; neither was silently
marked passed. No commits, merge, submission, or external application write was performed.

## Phase 4 execution — 2026-11-10

T018: added mode-aware historical capture and Worker result validation. Six new capture
cases failed before implementation; all 27 controller cases then passed. Arbitrary pairs
use fresh owned GETs with retry:0/one abort signal; a same-UUID pair uses one read. Copied
version tags and source numbers/UUIDs are retained. Historical mode permits unrelated
revision/dirty/conflict state and unpublished sources while blocking active lifecycle writes.
The original saved-draft guards remain intact. Full suite: 163 unit + 143 PostgreSQL/HTTP
(306 total), Nuxt typecheck/build passed. Logs: `/private/tmp/northbeam-002-t018-{red,typecheck,build,tests}.log`.

T019: added role reversal and verified mode/baseline/target supersession, same-UUID fresh
reversal, obsolete HTTP after switching away/back, and historical navigation/unmount cleanup.
The two reversal cases failed before reverse() existed; all 35 controller cases then passed.
Existing engine reversal/identity cases were reused. Full suite: 171 unit + 143 PostgreSQL/HTTP
(314 total), Nuxt typecheck/build passed. Logs: `/private/tmp/northbeam-002-t019-{red,typecheck,build,tests}.log`.

T020: added reviewed native mode/target selectors, Reverse action, mode-appropriate labels/
help, and no-history/one-version explanation with same-source identity still allowed.
Necessary new props/events were wired in the editor in this task so the component remains
usable and type-correct; T022 owns browser acceptance. The full diff renderer is unchanged.
Full 314-test suite, Nuxt typecheck/build passed. Logs: `/private/tmp/northbeam-002-t020-{typecheck,build,tests}.log`.

T021: extended only the existing read-only version-history group with one missing case:
two maximum-size owned source projections (200-code-point titles, 100,000-code-point
bodies with CRLF/blank/tab suffixes, ten 30-code-point tags), plus an actual deleted-source
reread. readState() proves every read leaves article/audit/revision/counter/history/public
state unchanged; explicit test setup/deletion occurs outside the read-only assertion.
Existing ownership/missing/unpublished/lifecycle cases were retained. Backend behavior
already satisfied this evidence, so no endpoint or application implementation was added.
Full suite: 171 unit + 144 PostgreSQL/HTTP (315 total), Nuxt typecheck/build passed.
Logs: `/private/tmp/northbeam-002-t021-{typecheck,build,tests}.log`.


### T022 — historical-pair browser acceptance

The production image was tested in a disposable Compose project, `northbeam002-browser`,
using Chrome 157 on macOS 27.0.1 / Apple M2 Pro / 16 GiB. Node 24.22.2, pnpm 12.18.0,
Nuxt 4.6.4, Vue 3.5.45, Vite 8.3.5, diff 9.0.0 were unchanged. Nine source/test SHA256s
match between the image and workspace. Persistent measurements and fixture identities:
[historical-comparison-evidence.json](historical-comparison-evidence.json).

Ten walkthrough groups passed: arbitrary nonadjacent pairs; reversal with fresh reads and
swapped labels/text/tags; same UUID versus distinct identical snapshots; unrelated dirty
and real stale-save-conflicted fields; mode switching during reads; obsolete Worker/source/
reverse/cancel results; deletion recognized on the next attempt; unpublished access;
320/390/1440px layouts and Close focus return; one-version/no-history states. Comparison
preserved fields and database/public state with no lifecycle writes. No runtime exceptions
or hydration warnings were observed.

Each of the nine existing boundary fixtures ran forward and reverse with two 100,000-code-
point bodies, 200-code-point titles, and ten 30-code-point tags per source. All 18 completed
with exact title/body reconstruction, complete Worker inline-word projection, correct source
UUIDs/labels and tag directions, keyboard final-row reachability, and unchanged local fields,
SQL and public projections. No truncation, cap, collapsed lines, or pagination was added.
The 100,000-row fixture took 49.1s forward / 50.4s reverse to append; whitespace's 66,666
rows took 17.9s / 20.3s; unequal replacements took about 11s Worker/transfer plus 1.7s
rendering. These are observations including polling/queued work, not compute/paint SLAs.
Memory values are completion-time main-thread hints, not peak or Worker heap measurements.

Each fixture exercised Cancel/Close/source/mode while work was pending. Fast fixtures used
explicitly flagged 700ms transport delays, excluded from completion timings. Five supplemental
controls interrupted actual 100,000-row rendering with no artificial delay: Cancel, Close,
source, mode, Reverse at 4,000–6,000 rows, observed in 161–320ms. No later rows appeared in
the 300ms observation window; pending-message windows were 200ms or 800ms for controlled
delays. A current-source saved-draft regression also completed all 100,000 rows exactly.

Native collapsed select popup keyboard driving did not commit in this headless macOS CDP
session. Pending source/mode probes temporarily presented the same select as a native
listbox; ordinary popup coverage remains T025/manual. This is not formal accessibility or
other-browser certification. Native End reached completed output. An initial reversed-
whitespace final-row assertion stopped after successful reconstruction; without application
changes, the affected fixture was rerun after inspecting settled scroll geometry and passed
with no additional scroll keys. Seven already-passing unchanged-source fixtures were reused;
whitespace and dense replacements supplied the remaining accepted results.

Temporary probe scripts/logs/screenshots live under `/private/tmp/northbeam-002-phase4-*`;
they are not runtime routes or dependencies. The durable evidence preserves results even
when those temporary files disappear. Regenerate measurements after relevant source/build
changes; do not manually invent timings. The separate US1 artifact is preserved as historical
evidence rather than relabeled as current-source verification.

### T023 — story review checkpoint

README now describes historical pairing/reversal and preserved unsaved/conflicted input.
Both-mode status and evidence are synchronized across the feature artifacts. The final
T021 checks passed 171 unit + 144 integration cases (315), Nuxt typecheck and build; no
runtime source changed afterward. Controller tests also compile strictly with the generated
Nuxt context. Integration tests compile under their existing strict baseline. An optional
extra check using the app's noUncheckedIndexedAccess flag reported unchanged legacy
response-array indexing errors; no compiler settings or existing tests were weakened.
Logs: `/private/tmp/northbeam-002-phase4-{controller-test-types,test-types-baseline}.log`.

Phase 4 (T018–T023) is complete for review. Final T024–T027 evidence reconciliation,
accessibility/security regressions, development-Worker checks and final validation remain
pending. Original Windows T028 is unverified. Changes remain uncommitted.

Cleanup: the dedicated `northbeam002-browser` containers, network, and test volume were
removed successfully after acceptance. Log: `/private/tmp/northbeam-002-t022-cleanup.log`.
Final artifact validation confirmed nine source hashes, nine fixtures/eighteen directions,
five real-render controls, task markers, and clean whitespace. No extension hooks registered.
