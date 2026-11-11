# Tasks: Idempotent Publish

**Input**: `specs/003-idempotent-publish/{spec.md,plan.md,research.md,data-model.md,contracts/publish.md,quickstart.md}`.
**Status**: Generated 2026-11-10. T001–T015 completed after explicit human governance decisions and baseline alignment; T016 onward remain pending. US1 and US2 are implemented and verified; Phase 5 extended conflict/failure acceptance remains pending.
**Design**: Human-selected option B: existing locked transaction, exact saved-content equality, unchanged WriterArticle response, client-inferred feedback. No schema, endpoint, dependency, hash, or whole-history deduplication changes.
**Tests**: Required by the feature acceptance scenarios and Constitution IV. Extend existing real-PostgreSQL/HTTP coverage; inspect existing tests before adding cases.

## Format and execution rules

- Tasks use `- [ ] Tnnn [P?] [USn?] description with paths`. `[P]` means independent files/work after stated prerequisites, not permission to skip gates.
- Follow the current constitution: one reviewable task at a time unless a task set is explicitly requested; humans create all commits. Review affected code for obsolete paths and explain removal or why none is needed at every task boundary.
- Before marking an implementation task complete, run relevant checks, `pnpm test`, `pnpm exec nuxt typecheck`, and `pnpm run build` using documented prerequisites. Record actual results and unavailable checks. Test-first changes may remain pending until their implementation passes; do not claim a failing test task complete.
- Update owning documentation before dependent code; distinguish proposed, implemented, and verified behavior. Explain every added file, its definitions and consumers, tests, and limitations in the review response. No additional review document or evidence JSON is required merely by this task list.

## Phase 1: Setup and governance

**Goal**: Resolve the existing governance conflicts without treating architecture selection as amendment approval.

- [x] T001 Refresh the amendment proposal in `specs/003-idempotent-publish/plan.md` and the matching R6 note in `specs/003-idempotent-publish/research.md`: the current constitution is 2.2.0, so its proposed incompatible change must advance to 3.0.0 (or the next major of the actual current version), not regress to 2.0.0; retain proposal status and the approved option B design.
- [x] T002 Resolve the required-work prerequisite in `.specify/memory/constitution.md`, `specs/001-docs-studio/tasks.md`, and `specs/001-docs-studio/quickstart.md`: execute Windows T028 with actual evidence, or obtain and record an explicit human-approved disposition applicable to 003; the existing 002-only deferral does not authorize 003. Keep Windows acceptance unchecked if unexecuted.
- [x] T003 Obtain human review of the concrete conditional-Publish amendment in `specs/003-idempotent-publish/plan.md`, then apply the approved text/version/date/sync report to `.specify/memory/constitution.md`; preserve revision-before-equality, rollback, snapshot ownership, and all other principles. Record the decision in `specs/003-idempotent-publish/plan.md`; do not infer approval from task generation.
- [x] T004 Reconcile active baseline rules using the artifact map in `specs/003-idempotent-publish/plan.md`: update `specs/001-docs-studio/spec.md`, `assumptions.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/http-api.md`, `contracts/ui-and-services.md`, and `decision-inventory.md`; add dated extension references to its `quickstart.md` and `tasks.md` and to `README.md`. Mark changed behavior as planned until implemented, preserve old evidence, and reconcile 003 spec/plan gate status.

**Checkpoint**: Governance and required-work disposition are recorded; no application changes yet.

**Verification (2026-11-10):** Constitution 3.0.0 and the 003 Windows deferral were
explicitly approved; T004 reconciles the baseline specification, decision records, model,
contracts, and delivery references while retaining historical evidence. All changed
relative documentation links resolve; Windows T028 remains unchecked. Unit tests: 171
passed; isolated Docker/PostgreSQL integration tests: 144 passed; Nuxt typecheck and
production build passed. The initial sandboxed integration attempt could not access Docker;
the authorized Docker run passed and removed its disposable container, volume, and network.
These checks verify the unchanged application baseline, not the future 003 behavior.
No new files or obsolete application code were introduced. The subsequent T005 checkpoint is recorded in [plan.md](plan.md#spec-first-checkpoint).


## Phase 2: Foundational prerequisites

**Goal**: Establish the human spec-first checkpoint and safe fixture migration before behavioral changes.

- [x] T005 Check consistency of `specs/003-idempotent-publish/spec.md`, `plan.md`, and `tasks.md` with the amended constitution; resolve findings and verify the human has recorded these artifacts and approval in git before code. Record checkpoint status in `specs/003-idempotent-publish/plan.md`; AI must not create the commit.
- [x] T006 Inspect and adapt history-generating fixtures in `tests/integration/articles.test.ts` to Save genuinely differing content before an intended new snapshot and use returned revisions; retain all immutability, restore/delete, public-isolation, first-date, ownership, and rollback assertions, including 002 source-read coverage. Ensure snapshot-insert failpoints still enter a changed-content branch. Verify these preparatory changes against existing behavior before changing Publish.

**Checkpoint**: Phase 2 completed on 2026-11-10. Existing schema and generic transaction helper remain sufficient. See [Phase 2 verification](quickstart.md#phase-2-verification--2026-11-10). Stop for human review before Phase 3.

## Phase 3: US1 — Publish unchanged content without duplicate history (P1, MVP)

**Goal**: Already-published equivalent saved content succeeds with zero persistent changes and accurate feedback.
**Independent test**: First publish, then ten current-revision publishes plus identical-save, exact-reversion, and tag-reordering cases. Compare complete SQL state, history, counters, timestamps, public content, and saved/public tag orders; show unchanged feedback.

- [x] T007 [P] [US1] Add focused cases in `tests/unit/publication-equality.test.ts` for exact title/body equality, symmetry, whitespace/trailing-newline/Markdown/Unicode differences, empty/reordered/different tags, and input-array nonmutation. Preserve the model constraint “Set comparison handles at most 10 normalized tags.” Exercise existing maxima: title 200/body 100,000 code points and 10 tags of 30 code points; introduce no lower limit.
- [x] T008 [P] [US1] Extend publication coverage in `tests/integration/articles.test.ts` for ten no-ops, identical saves followed by current-revision Publish, saved edits reverted to live content, and reordered tags. Assert exact persisted application-state equality, no history/counter/revision/audit/date changes, independent saved/public tag order, and the exact existing WriterArticle response with no outcome field.
- [x] T009 [US1] Implement `samePublicationContent` in `server/services/articles/samePublicationContent.ts` using exact strings and normalized tag membership without sorting/mutating inputs, rendering, trimming, or Unicode normalization; consume it only from `server/services/articles/publishArticle.ts`. Use existing structural content types where suitable; avoid exported types without consumers.
- [x] T010 [US1] Extend `server/services/articles/publishArticle.ts` inside the existing article-first locked transaction: retain revision and publish-validation precedence, fetch only the owned referenced snapshot, reject missing/wrong-owner references or inconsistent status/reference/first-date state generically, and return the unchanged article for published equality without INSERT/UPDATE. Allocate UUID/version only on creation; preserve first/different-content behavior and unchanged response shape.
- [x] T011 [US1] Update `app/composables/useArticleEditor.ts` to capture immutable prior status/reference alongside the request revision, infer new-version versus unchanged feedback from the successful returned reference before `acceptSaved`, and reject impossible success combinations without labeling them unchanged. Retain explicit-save/pending/conflict guards, retry:0, and delayed-typing preservation; keep history-refresh errors distinct from committed publication success. Validate new and unchanged messages in the browser and record results in `specs/003-idempotent-publish/quickstart.md`.

**Checkpoint**: US1 completed on 2026-11-11; see Phase 3 verification in quickstart.md. US2 subsequently completed Phase 4; US3 remains pending.

## Phase 4: US2 — Changed publication and retained-snapshot reactivation (P2)

**Goal**: First/different content creates one version; equivalent unpublished content restores visibility using its retained snapshot.
**Independent test**: Publish changed content, unpublish, republish unchanged, and Publish again. Verify new versus reused reference, public visibility, one reactivation revision/time update, and then a true no-op.

- [x] T012 [US2] Extend `tests/integration/articles.test.ts` for first publication, independent title/body/tag-membership changes, unpublished changed content, and matches with an older nonreferenced snapshot or another article. Assert exactly one new immutable row, saved tag order copied, unique never-reused version allocation after deletion, and first publication date preserved where present.
- [x] T013 [US2] Extend `tests/integration/articles.test.ts` for unchanged reactivation, including reordered saved tags: status/revision/updatedAt change once, public access returns, and draft/createdAt/reference/history/counter/first-date remain unchanged. A following unchanged Publish changes no fields. Verify public snapshot order and saved draft order remain independent.
- [x] T014 [P] [US2] Add the equivalent-unpublished branch in `server/services/articles/publishArticle.ts`: update only status, revision +1, and updatedAt once, returning after transaction completion. Preserve the referenced snapshot, allocation counter, original publication date, and saved fields; retain the ordinary atomic creation path for first/different content.
- [x] T015 [P] [US2] Complete reactivation feedback in `app/composables/useArticleEditor.ts` using the captured unpublished status plus unchanged returned reference and the exact message from `specs/003-idempotent-publish/contracts/publish.md`; validate all three outcomes, history/public refresh, keyboard access, and existing accessible status/alert patterns in the browser. Record results in `specs/003-idempotent-publish/quickstart.md` after T014 is integrated.

**Checkpoint**: Phase 4 completed on 2026-11-11. US1 and US2 field matrices and feedback pass; no schema or API-shape change. See quickstart.md Phase 4 verification; stop for phase review before US3.

## Phase 5: US3 — Conflict, contention, and failure guarantees (P3)

**Goal**: Reuse never bypasses stale checks or atomicity and never loses unsaved editor content.
**Independent test**: Real overlapping connections exercise all outcome branches; injected failures preserve complete SQL/public state; browser rejection and delayed-response cases preserve local fields.

- [ ] T016 [US3] Extend `tests/integration/articles.test.ts` for stale matching-content Publish, stale plus invalid saved content, current-revision blank-body rejection, missing/wrong-owner reference integrity failures arranged only in isolated fixtures, and lost state-changing response followed by stale retry then explicit reload/retry. Preserve request constraint “expectedRevision: nonnegative safe integer” and existing 400/404/409/generic-500 precedence, with zero mutation on rejected attempts.
- [ ] T017 [US3] Extend independent-connection contention tests in `tests/integration/articles.test.ts` with observed overlap for changed Publish, equivalent reactivation, and unchanged Publish: state-changing contenders yield one success and stale losers; unchanged contenders all succeed without persistent changes. Reuse existing lock barriers rather than timing-only sleeps.
- [ ] T018 [US3] Extend `tests/integration/articles.test.ts` to prove both lock orders for unchanged Publish against Save/Unpublish: no-op first may permit both successes; mutation first makes Publish stale. Retain referenced-snapshot deletion protection and existing article-first deletion race coverage without weakening old state-changing assertions.
- [ ] T019 [US3] Extend existing rollback/failure-injection coverage in `tests/integration/articles.test.ts` for snapshot insertion and creation update failures plus reactivation update failure; compare full SQL/public state, confirm no consumed version or partial revision/reference change, and preserve the existing observed crash/transaction rollback test.
- [ ] T020 [P] [US3] Exercise editor save-before-publish, conflict/failure preservation, typing during delayed successful and rejected responses, and secondary history-refresh failure using `app/composables/useArticleEditor.ts`; record browser cases/results in `specs/003-idempotent-publish/quickstart.md`. Make only necessary fixes to existing guards/acceptSaved/error handling, without autosave or a second client content-equality implementation.

**Checkpoint**: All three outcomes retain lifecycle invariants. Any necessary service correction belongs in `server/services/articles/publishArticle.ts` under its corresponding failing test; re-run prior story coverage.

## Phase 6: Cross-cutting validation and handoff

- [ ] T021 Verify restart persistence through the existing helpers in `tests/integration/articles.test.ts` and the Compose procedure in `specs/003-idempotent-publish/quickstart.md`: reused reference, first date, allocation counter/history, public availability, and subsequent no-op survive restart. Record the actual platform and clean up disposable test resources.
- [ ] T022 Review changed code and directly affected consumers in `server/services/articles/publishArticle.ts`, `server/services/articles/samePublicationContent.ts`, `app/composables/useArticleEditor.ts`, and `tests/integration/articles.test.ts`; remove obsolete unconditional-creation assumptions, unused exports, duplicate paths, or temporary probes after checking usage. Preserve migrations, required evidence, and prior lifecycle coverage; report any justified retained code.
- [ ] T023 Run `pnpm test`, `pnpm exec nuxt typecheck`, and `pnpm run build` using `package.json` and documented pinned prerequisites; complete the eleven acceptance groups in `specs/003-idempotent-publish/quickstart.md`, including maximum inputs and all three UI outcomes. Record real results, limitations, and resource cleanup; do not reuse 001/002 results as new verification.
- [ ] T024 Synchronize implemented/verified status and reviewer instructions in `README.md`, `specs/003-idempotent-publish/spec.md`, `plan.md`, `contracts/publish.md`, `quickstart.md`, and `tasks.md`, and affected baseline references from T004. Provide the Constitution VIII walkthrough of every new file with definitions/consumers and test evidence. Leave changes uncommitted for human review; keep unexecuted Windows acceptance explicitly open.

## Dependencies and execution order

`T001 → T002 → T003 → T004 → T005 → T006 → US1 → US2 → US3 → T021–T024`.

- US1: T007/T008 may be authored concurrently; T009 follows T007; T010 follows T008/T009; T011 follows T010. Complete passing validation before marking test-first tasks done.
- US2 depends on US1's equality/reference infrastructure. T012/T013 share a file and run sequentially. After their test definitions, T014/T015 code work uses separate files and can overlap; T015 browser acceptance waits for T014.
- US3 depends on both implemented state-changing branches. T016–T019 share the integration file and run sequentially. T020 can run alongside them against a stable app; integrate any corrections before final checks.
- Story phases are separately demonstrable, but cannot be implemented concurrently without conflicting edits to the same service/test files. No parallel task may bypass human or governance prerequisites.

## Parallel examples per story

- **US1**: T007 equality-unit cases alongside T008 database no-op cases after T006; neither edits the other's file.
- **US2**: T014 service reactivation alongside T015 editor inference after T012/T013; coordinate the browser check after integration.
- **US3**: T020 browser/editor preservation checks alongside T016–T019 database cases; record browser evidence separately from integration test edits.

These are scheduling opportunities, not instructions to spawn agents or concurrently mutate one database fixture.

## Requirement coverage

| Requirement / success criterion | Tasks |
|---|---|
| FR-001, SC-002: exact content, tag membership and order | T007–T010, T012–T014 |
| FR-002, SC-001: ten no-ops and concurrent no-ops | T008, T010, T017 |
| FR-003: first/different creation | T006, T010, T012, T019 |
| FR-004, SC-003: retained-snapshot reactivation | T013–T015, T021 |
| FR-005: reference-only comparison | T010, T012 |
| FR-006: validation and stale precedence | T010, T016 |
| FR-007, SC-004: concurrency and rollback | T016–T019 |
| FR-008, SC-005: three feedback outcomes, same response | T008, T011, T015, T023 |
| FR-009: saved-only publication and local edit preservation | T011, T020 |
| FR-010: immutable history, allocation, protection, isolation, restart | T006, T012–T013, T018–T019, T021 |

## Implementation strategy

Complete governance and the human git checkpoint first, then deliver US1 as the smallest reviewable MVP. Add US2 reactivation without changing the wire format, then complete US3 concurrency/failure evidence. Preserve existing correctness throughout; US3's phase placement never permits bypassing stale checks in earlier phases. Finish cross-cutting validation and documentation before declaring the full feature complete. Task creation itself changes no runtime behavior and is not implementation evidence.
