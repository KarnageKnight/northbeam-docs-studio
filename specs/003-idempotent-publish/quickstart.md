# Idempotent Publish: Validation Guide

**Date**: 2026-11-09 | **Status**: Phases 3–5 verified on 2026-11-11; Phase 6 final acceptance remains pending.

## Prerequisites

Option B was selected on 2026-11-09. Constitution 3.0.0 and the Windows deferral for 003 were approved on 2026-11-10; see [governance alignment](plan.md#governance-alignment). T001–T020 are complete; see the [recorded checkpoint](plan.md#spec-first-checkpoint). Original Windows T028 remains unchecked and unverified.

Use existing [README](../../README.md) and [baseline guide](../001-docs-studio/quickstart.md) for pinned tools, Docker prerequisites, isolated tests, and cleanup.

```sh
docker compose up --build
```

After implementation, use Writer on http://127.0.0.1:3000. Keep Public open separately. Published equal-content Publish returns unchanged and unpublished equality reactivates its retained snapshot. Extended contention/failure scenarios are verified below; Phase 6 restart/final acceptance remains pending.

## Completion checks after implementation

```sh
pnpm run test:unit
pnpm run test:integration
pnpm exec nuxt typecheck
pnpm run build
```

pnpm test remains the complete one-command suite. No suite/build was executed merely to record this design.

Extend existing publication/concurrency groups and helpers. Existing tests that create multiple history entries by identical Publish must Save actual differences first and use returned revisions. Preserve the original immutability/protection/rollback assertions. Failpoint tests for new snapshots must arrange differing content so they enter the intended branch.

## Acceptance scenarios

1. Publish valid saved content once, then Publish ten times with current revision. Expect unchanged feedback, same snapshot/revision/counter/date/audit fields and byte-equivalent stored application state.
2. Save identical content and Publish using its new revision. The Save advancement remains; Publish adds none. Revert saved content to current snapshot and repeat.
3. Save reordered tags only. Published Publish creates no version; public tag order remains the snapshot's and saved order remains independent. Unpublish and repeat: reuse retained snapshot, restore visibility, advance revision/time once, preserve counter/date/order.
4. Change title, body, or tag membership. Each valid Publish creates one new version copying saved order, advancing revision/counter once and preserving first date. Matching an older nonreferenced version still creates a new snapshot.
5. Test exact whitespace, trailing newline, Unicode sequence, Markdown syntax, empty tags, and maximum existing fields. No rendered equivalence or lower content cap.
6. Stale revision with matching content still gets 409; stale+invalid stored content follows existing revision-before-eligibility ordering. Blank-body current-revision Publish gets validation error with zero changes.
7. Compete changed publishes: one creation and one stale conflict. Compete reactivations: one reuse/revision update and one stale conflict. Compete no-ops: both succeed unchanged. Observe real overlapping connections, not just sequential requests.
8. Exercise both serialized orders of no-op with Save/Unpublish. No-op first may permit both successes; mutation first makes Publish stale. Retain referenced delete protection and existing deletion-lock race coverage.
9. Inject failures in snapshot insertion/article update for created outcome and in article update for reactivation. Before/after SQL and public state must match. Missing/wrong-owner reference corruption, where deliberately arranged in isolated tests, produces generic failure, never an unchanged success.
10. Restart and verify first date, reused snapshot, counter/history, and no-op behavior persist. After a lost state-changing response, retry with old revision conflicts; explicit reload then retry does not duplicate content.
11. Verify the Publish response has exactly the existing WriterArticle fields with no outcome property. Browser checks infer a new version from a changed reference, reactivation from an unchanged reference plus prior unpublished status, and unchanged publication from an unchanged reference plus prior published status. Capture prior values before accepting the response. Check all three feedback messages, explicit-save guard, preserved text on conflicts/failures and typing during delayed responses, history/public updates, keyboard/status accessibility. No new publish mode or autosave.

## Evidence map

| Requirements | Evidence |
|---|---|
| FR-001, FR-005, SC-002 | Exact fields, tag-set equality, reference-only reuse, older-match creation |
| FR-002, SC-001 | Ten no-ops and concurrent no-ops; exact SQL/application state unchanged |
| FR-003 | First and changed publication transaction/rollback tests |
| FR-004, SC-003 | Unchanged reactivation field matrix, counter/date/order, public access |
| FR-006, FR-007, SC-004 | Stale/validation ordering, observed independent-connection races, both rollback branches |
| FR-008, SC-005 | Unchanged exact response shape and all three inferred browser feedback paths |
| FR-009 | Save-before-publish; delayed typing/conflict/failure preservation |
| FR-010 | Existing protection/immutability/first-date/restart/public-isolation evidence retained |

Record actual command results and branch state when implemented. Original baseline test counts are historical evidence, not proof of these new semantics. No backup, availability, latency, or platform guarantee is introduced.

## Phase 2 verification — 2026-11-10

T006 updates existing fixtures in `tests/integration/articles.test.ts`. Publication/history,
post-insert rollback, changed-content republish after Unpublish, eligible deletion/non-reuse,
and deletion rollback now Save differing body text before each intended new snapshot.
Affected sequences use returned revisions independently of version numbers. Existing
immutability, exact stored-state, counter/date, public-state, restart, and failure assertions
remain. Contention, Restore, and maximum-size 002 source-read fixtures already supplied
differing content and needed no edits. No new test cases, files, helpers, or dependencies
were added; the obsolete identical-publish fixture setup was replaced in place.

Validation on the existing application behavior:

- `pnpm run test:unit`: 171 passed.
- `pnpm run test:integration`: 144 passed against isolated PostgreSQL through Docker;
  disposable test container, volume, and network removed successfully.
- `pnpm exec nuxt typecheck`: passed.
- `pnpm exec tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ESNext --module ESNext --moduleResolution bundler --types node tests/integration/articles.test.ts`: passed.
- `pnpm run build` and `git diff --check`: passed.

Node 24.22.2 and pnpm 12.18.0 were used. Application source and publication semantics are
unchanged; these results do not verify future no-op/reactivation behavior. No new browser
acceptance was needed for fixture-only changes. Windows T028 remains unverified. Phase 2
is complete; stop for review before Phase 3 (US1).

## Phase 3 verification — 2026-11-11

T007–T011 implement US1: exact saved-content equality inside the existing locked transaction,
owned-reference integrity checks, a write-free already-published result, and created/unchanged
editor messages with the unchanged WriterArticle response. Unpublished equality still takes
the creation path until Phase 4.

Test-first evidence: the new equality suite initially failed to import its unimplemented
helper; all four new database cases failed against old Publish behavior while the existing
144 cases passed. After implementation, 181 unit and 148 real PostgreSQL/HTTP tests pass
(329 total). Tests cover ten repeated no-ops, identical saves, reverted edits, reordered tags,
exact full SQL/public state and response preservation, text distinctions, symmetry, empty tags,
nonmutation, and maximum accepted title/body/tags.

`pnpm run test:unit`, `pnpm run test:integration`, `pnpm exec nuxt typecheck`,
`pnpm run build`, strict tsc checks of the changed tests, and `git diff --check` passed.
Headless Chrome against the isolated production Docker app verified new/unchanged messages,
role=status, unchanged writer response, dirty Publish guard, newer typing during a delayed
real Publish response, and retained success with a failed history refresh. No browser runtime
exceptions. The first browser attempt clicked before client hydration and timed out; the
accepted run waited for hydration before interaction. This is not cross-browser or Windows
acceptance. Disposable browser/test resources were cleaned up.

No new dependencies, schema, response types, or redundant comparison paths. The old
unconditional Publish success message was replaced. Two new files have current consumers:
`samePublicationContent.ts` is called by the publication service;
`publication-equality.test.ts` directly tests that pure helper. Concurrency and extended
failure acceptance remain Phase 5 work; no claim of full feature completion is made.

## Phase 4 verification — 2026-11-11

T012–T015 complete US2. Equivalent unpublished content now updates only status, revision
(+1), and updatedAt within the existing locked transaction, reusing its snapshot. The
editor reports “Article republished using its last-published version.” from captured
unpublished status and the unchanged returned reference. No response/schema change.

Seven additional parameterized integration cases extend the existing publication group:
independent title/body/tag-membership differences, older nonreferenced snapshot matches,
other-article content matches, and reactivation with original/reordered draft tags. They
assert immutable prior rows, saved tag order copied to new versions, exact reactivation
field changes, preserved draft/history/counter/first date, restored public visibility and
snapshot tag order, and a subsequent complete no-op. Existing first-publication, changed
unpublished publication, and never-reused numbers after deletion cases continue to pass.

Before implementation, only the two new reactivation cases failed (153 passed). Afterward:

- `pnpm run test:unit`: 181 passed.
- `pnpm run test:integration`: 155 passed against isolated PostgreSQL/HTTP (336 total).
- `pnpm exec nuxt typecheck`, `pnpm run build`, strict tsc on
  `tests/integration/articles.test.ts`, and `git diff --check`: passed.
- Headless Chrome on the isolated production app: Enter activation of Publish/Unpublish/Save,
  all three messages using role=status, history remaining one row on reactivation then
  becoming two on changed Publish, public 404→200, retained reference/date, revision +1,
  and unchanged repeated response all passed. No runtime exceptions. The first CDP keyboard
  attempt did not activate Publish; the accepted run brought the page forward and supplied
  Enter text with the key event. This is not full accessibility or cross-browser certification.

Disposable database/browser services, volumes, and networks were removed. No new files,
helpers, dependencies, migrations, or duplicate equality logic were added. The published-only
equality branch was extended in place and the editor's superseded response guard was updated.
Windows T028 remains unverified. Phase 5 failure/contention scenarios and final acceptance
are still pending; stop here for phase review.

## Phase 5 verification — 2026-11-11

T016–T020 complete US3 verification without application-code changes. Existing publication
and contention groups gained 14 parameterized cases; existing post-insert rollback coverage
now also compares complete public state. Existing blank-body/stale ordering, request
validation, crash rollback, and referenced-deletion race tests remain in place.

- Changed and reactivated concurrent publishes: one success/revision advancement and a
  stale loser. Unchanged concurrent publishes: both succeed with identical SQL/public state.
- Both lock orders for no-op Publish against Save/Unpublish: no-op first permits both;
  mutation first makes Publish stale. All races use the existing observed lock barriers
  and independent connections, not timing-only sleeps.
- Lost-response retry: discard the successful changed/reactivated response body, retry
  the old revision (409), explicitly reload, then Publish with no further mutation. This
  models client response loss; it does not simulate a transport outage.
- Missing/wrong-owner reference and missing date: generic 500 with unchanged state. Only
  the isolated fixture connection temporarily bypasses FK triggers to arrange corrupt
  references; finally restores valid fields and normal trigger mode. App connections
  retain normal constraints.
- Snapshot insertion and reactivation update failures: full SQL/public rollback and
  successful recovery. Existing post-insert article-update and crash rollback tests pass.

Validation: `pnpm run test:unit` 181 passed; `pnpm run test:integration` 169 passed
(350 total); `pnpm exec nuxt typecheck`, strict tsc of the integration file,
`pnpm run build`, and `git diff --check` passed.

Headless Chrome on the isolated production app verified all local title/body/tag fields
survive delayed created/unchanged/reactivated responses, a real stale conflict, and a
simulated HTTP 500. Saved draft content was unchanged by browser typing and dirty Publish
remained blocked. The Phase 3 dirty guard/history-refresh-failure browser check also passed
again, preserving successful Publish feedback. No runtime exceptions. The first conflict
probe used the error CSS class instead of the warning banner; the accepted rerun used
role=alert. Database fault injection separately verifies real server rollback.

No runtime defect, new file, helper, dependency, or obsolete application path was found;
existing tests/helpers were extended instead of adding a duplicate suite. Disposable test
and browser containers, volumes, and networks were removed. Windows remains unverified.
Stop at this phase boundary; Phase 6 restart, cleanup review, final acceptance, and handoff
remain pending.
