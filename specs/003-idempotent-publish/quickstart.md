# Idempotent Publish: Validation Guide

**Date**: 2026-11-09 | **Status**: Planned validation only; feature not implemented or verified.

## Prerequisites

Option B was selected on 2026-11-09. Constitution 3.0.0 and the Windows deferral for 003 were approved on 2026-11-10; see [governance alignment](constitution-alignment.md). Tasks are generated; baseline reconciliation and the human spec-first checkpoint remain required before code. Original Windows T028 remains unchecked and unverified.

Use existing [README](../../README.md) and [baseline guide](../001-docs-studio/quickstart.md) for pinned tools, Docker prerequisites, isolated tests, and cleanup.

```sh
docker compose up --build
```

After implementation, use Writer on http://127.0.0.1:3000. Keep Public open separately. Current code still creates a version for every successful Publish; the following are future expected outcomes.

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
