# Idempotent Publish: Proposed Data Model

**Date**: 2026-11-09 | **Status**: Option B selected on 2026-11-09; US1/US2 implemented on 2026-11-11; extended failure/concurrency acceptance remains planned. No schema changes.

## Entities

Reuse articles and article_versions exactly as stored. No content hash, deduplication record, idempotency key, outcome history table, or new column.

- Saved draft: persisted title/body/normalized tags. Arrays keep original saved order.
- Referenced snapshot: owned currentPublishedVersionId, retained after Unpublish.
- Equality: exact title/body plus equal tag memberships independent of order. No trimming, Unicode normalization, Markdown rendering, or browser dirty flag.
- Publication outcome: derived UI interpretation (created/unchanged/reactivated), not a stored value or response field. Capture prior status/reference before sending Publish and compare with the successful returned article.
- Article revision: existing integer stale-write token; unchanged publication preserves it.

## Field-change matrix

| State and comparison | Outcome | Snapshot/reference | Article revision/time | Counter/date |
|---|---|---|---|---|
| Never published, valid saved content | created | Insert snapshot; reference it; status published | +1 / update once | Counter +1; first date set |
| Published, different content | created | Insert new snapshot/reference | +1 / update once | Counter +1; first date preserved |
| Published, equal content | unchanged | Preserve snapshot/reference/status | Unchanged / unchanged | Unchanged |
| Unpublished, different content | created | Insert new snapshot/reference; status published | +1 / update once | Counter +1; first date preserved |
| Unpublished, equal content | reactivated | Preserve snapshot/reference; status published | +1 / update once | Counter/date unchanged |
| Invalid, stale, integrity failure, transaction failure | Error | No committed changes | Unchanged | Unchanged |

All successes preserve saved draft and article createdAt. Existing history is unchanged except for the one new immutable row in created outcomes. New snapshots copy saved tag order; reuse leaves published tag order and draft tag order independently intact. Snapshot deletion never resets the allocation counter.

No-op means application fields/rows remain unchanged, not that PostgreSQL performs no locking or transaction metadata work.

## Identity and integrity

Lookup referenced snapshot by article ID and snapshot ID; missing/wrong-owner is an unexpected integrity failure, not unchanged success. Published/unpublished state requires retained reference and first date. Never-published draft should have neither. Preserve existing status/reference invariants; do not silently repair corrupt state through duplicate prevention.

Only the referenced snapshot is eligible. Matching an older history row still creates a new version if current referenced content differs. Another article's content never influences the result.

## Transaction and transitions

Validation order: parse request → lock/lookup article → expected revision → publish content eligibility → owned-reference integrity/equality → branch → commit → response. State-changing branches keep all changes atomic. No-op locks and reads but writes no fields.

Same-revision created/reactivated competitors yield at most one state change; subsequent caller conflicts. Unchanged competitors can all succeed. No-op preceding another successful mutation does not consume revision, so both may succeed. Intervening revision change before Publish's locked read produces stale conflict.

## Bounds

Reuse existing content limits with no reduced maximum. Set comparison handles at most 10 normalized tags. Title/body comparisons operate directly on the bounded strings; no global/history scan or performance promise.
