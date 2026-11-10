# Idempotent Publish: Governance Alignment

**Date**: 2026-11-10 | **Status**: Human-approved constitution amendment applied as 3.0.0. Baseline reconciliation (T004) remains pending; no application implementation or verification.

## Why alignment is required

Before amendment, Constitution III required every Publish to create a numbered snapshot. Baseline A006, P008/P029/P075, publication contracts, and tests also describe unconditional creation/revision updates. Feature 003's three confirmed clarifications change those rules.

The human separately approved the amendment, version 3.0.0, and a Windows T028 deferral for 003 on 2026-11-10. T028 remains unchecked and unverified. Before dependent implementation, synchronize baseline behavior statements and preserve the human spec-first git checkpoint and dated verification history.

## Approved replacement for Constitution III's first paragraph

> Publish MUST validate the saved draft and caller's expected revision while holding the article's transactional write lock. First publication or content differing from the article's referenced snapshot MUST create a numbered immutable snapshot and update the live reference, publication status, first-publish timestamp when absent, revision, and allocation counter in one transaction. Equivalent already-published content MUST succeed without creating a snapshot or changing persisted fields. Equivalent unpublished content MUST become published using its retained snapshot, advancing revision and modification time once without allocating a version or changing the original publication date. Equivalence means exact saved title and Markdown body and equal normalized tag membership regardless of order. Every failure MUST roll back the attempted state change. A published article MUST reference an existing owned snapshot, and constraints and transactional checks MUST protect that reference and publication consistency under races.

Retain the following existing paragraph requiring expected-revision validation for Save/Restore/Publish/Unpublish and rejecting stale actions with preserved local text. It already requires revision advancement for actual content/publication-state changes; no-op Publish changes neither.

## Approved version treatment

Constitution **3.0.0** replaces 2.2.0, preserving the original ratification date and recording 2026-11-10 as the amendment date. The human approved this major increment because unconditional snapshot creation is redefined. The sync-impact report records the approved changes.

## Affected-artifact reconciliation

| Artifact | Required targeted alignment |
|---|---|
| .specify/memory/constitution.md | Approved conditional Publish paragraph/version/sync report |
| specs/001-docs-studio/spec.md | US3/FR-003 and concurrency outcomes conditional on actual state change; preserve first-date and immutable-history rules |
| specs/001-docs-studio/assumptions.md | Mark A006 superseded by 003; qualify P008/P029/P075 no-op revision/audit behavior; preserve historical approvals |
| specs/001-docs-studio/plan.md and research.md | Identify conditional publication and selected response design without rewriting prior evidence |
| specs/001-docs-studio/data-model.md | Publish transition/revision/counter/audit matrix |
| specs/001-docs-studio/contracts/http-api.md | Selected publish response and outcome-specific semantics; other endpoints unchanged |
| specs/001-docs-studio/contracts/ui-and-services.md | Publication service outcome and UI feedback/acceptance responsibilities |
| specs/001-docs-studio/decision-inventory.md | Current behavior distinguished from original baseline decisions |
| specs/001-docs-studio/quickstart.md, handoff.md, tasks.md | Dated feature extension/status references; do not relabel old test evidence or original Windows status |
| README.md | Current Publish behavior, clear demo showing unchanged vs changed publication, accurate test/verification status |
| Existing automated tests | Make history-creation fixtures publish real saved changes; retain lifecycle/rollback/ownership assertions |

002 does not need schema/API changes for this feature. Its history fixtures must not assume repeated identical Publish creates versions once 003 is implemented. Treat any integration adjustment as necessary dependency work, not implementation of 002 within 003.
