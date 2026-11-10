# Idempotent Publish: Research

**Date**: 2026-11-09 | **Status**: Option B selected by the user on 2026-11-09. No code/test changes; governance amendment approved and applied as 3.0.0 on 2026-11-10; baseline reconciliation remains pending.

## R1 — Keep the current transaction boundary

**Selected design (option B)**: Extend publishArticle inside existing withArticleTransaction; do not change the generic helper.

**Rationale**: The helper locks the article before checking revision and invoking publication logic. Save/restore/unpublish/delete already use article-first coordination. A referenced immutable snapshot can be read after acquiring that lock; eligible deletion also takes it. Keep all equality and state changes in the same transaction.

**Alternatives**: Checking equality outside the lock risks outdated decisions. An application-memory mutex fails across instances. Higher isolation alone adds retry complexity without replacing the caller revision requirement.

**Primary sources**: [PostgreSQL row locks](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-ROWS), [Read Committed](https://www.postgresql.org/docs/18/transaction-iso.html#XACT-READ-COMMITTED). Row locks coordinate conflicting writers until transaction end; a waiting locking read can obtain the newly committed row. These support the existing design, not a new measured concurrency guarantee.

**Inspected**: server/services/articles/withArticleTransaction.ts, publishArticle.ts, deleteSnapshot.ts, unpublishArticle.ts.

## R2 — Exact fields, set-based tags, reference-only reuse

**Selected design (option B)**: Exact stored title/body equality plus normalized tag Set membership. Compare one owned referenced snapshot; do not search older history. Preserve draft and snapshot tag order independently when reused.

**Rationale**: Implements the three confirmed clarifications with no new persistence. A changed title/body/tag membership creates a new snapshot copying saved order. Unicode/whitespace/rendered equivalence must not be normalized.

**Alternatives**: Ordered tag equality contradicts clarification. JSON.stringify of the full content would wrongly count ordering. Hash columns add migration/canonicalization/collision considerations; full-history dedup contradicts FR-005.

**Validation**: Equality/symmetry, empty tags, tag reordering, membership differences, exact whitespace/newline/Unicode changes, and maximum accepted inputs. Native Sets do not mutate arrays.

## R3 — Publish outcome representation

**Selected decision (option B, 2026-11-09)**: Keep the exact WriterArticle response. Capture publication status and currentPublishedVersionId before the request. On success, compare the returned reference to infer created; otherwise prior unpublished status implies reactivated, and prior published status implies unchanged. Add no publicationOutcome or PublishResult type.

**Rationale**: Existing response and pre-request state contain enough information; avoid redundant response data and a second representation clients must keep consistent. Revision validation ensures the successful request acted on the captured article revision. Capture state before acceptSaved replaces it; no extra content-fetch/comparison is needed in the browser. The server still owns content equality and transaction decisions.

**Alternatives considered**: Option A adds an explicit server outcome but was not selected because it is derivable. A wrapper {article,outcome} adds a larger response-shape change. No result is inferred on errors, and no automatic retry bypasses revision checks.

## R4 — No-op and races

**Selected design (option B)**: Already-published equality issues no INSERT/UPDATE; reactivation changes only status/revision/updatedAt; changed/first Publish preserves existing atomic creation.

**Rationale**: Existing helper has no unconditional revision increment, so branches can retain exact no-op behavior. Serial locking still applies even though a no-op advances nothing. Multiple no-ops can succeed; a no-op followed by Save can also both succeed. A stale caller must conflict before equality success. No-op concurrency does not satisfy old universal one-success assumptions because that rule concerned competing state changes.

**Alternatives**: Advancing revision on no-op contradicts the confirmed decision. Skipping stale validation on equality contradicts FR-006. Skipping the lock risks a false no-op concurrent with publication changes.

## R5 — Existing evidence and fixture updates

**Selected design (option B)**: Extend existing publish and contention groups in tests/integration/articles.test.ts; reuse readState, failure injection, restart, and independent-connection helpers. Add a focused equality unit file because current validation/Markdown files cover a different concern.

**Rationale**: Current tests generate historical snapshots with repeated identical publishes in publication, unpublish, restore/delete, rollback, and concurrency setup. Update those setups to make real saved content changes while retaining prior assertions about protection/immutability/rollback. Recalculate revisions from successful responses instead of assuming one increment per Publish. Failure-injection tests targeting snapshot INSERT must first arrange content differences; otherwise no-op correctly bypasses the injected path.

**Alternatives**: Deleting failing history tests or weakening counts would lose coverage. A duplicate feature suite would leave old assumptions failing and obscure behavior.

## R6 — Baseline and governance

**Approved decision (2026-11-10)**: The human approved the replacement text in constitution-alignment.md and constitution 3.0.0, a major increment from 2.2.0 because unconditional Publish snapshot creation is redefined. Baseline reconciliation remains required before code.

**Rationale**: Confirmed product decisions do not justify falsely reporting that the existing constitution already permits them. Preserve baseline approval/evidence history, explicitly mark superseded active rules, and update current contracts/test fixtures.

**Alternatives**: Leaving conflicting MUST statements is not acceptable. Rewriting old evidence as if tests previously verified this feature is also invalid.

## Review status

Option B was selected on 2026-11-09. The constitution amendment was approved and applied on 2026-11-10, including a 003-specific Windows deferral. No new dependency required. No application build/tests run for this documentation-only design; future implementation gates remain in quickstart.md. Windows T028 remains unchecked and unverified; its deferral changes work order only.
