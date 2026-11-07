# Data Model: Northbeam Docs Studio

**Date**: 2026-11-07
**Status**: Phase 2 schema and two migrations implemented; database protections verified
against PostgreSQL 18.6. Draft creation/read/default/normalization and Phase 5 revision-checked
saves are implemented and verified. Saves lock the article, replace draft fields, advance
revision/update time, and preserve publication/history/slug/allocation state; rollback and
stale/no-op behavior are tested. Phase 6 publication now atomically creates a saved-content
snapshot and advances reference/status/counter/revision, preserving the original publication
date and prior snapshots. Forced post-insert failure and app-crash rollback/recovery are
verified against real PostgreSQL; writer Publish controls are implemented;
Phase 7 public listing uses one statement joining published articles to their owned current
snapshot, projecting only slug/live title/live tags/original date. Phase 8 detail uses
the same one-statement ownership/publication filter plus slug, adding only live Markdown
body. API isolation, unchanged read audits, and unavailable-state 404 are verified.
Remaining lifecycle rules are targets for later phases.

Authority: [spec.md](spec.md), [plan.md](plan.md) P006–P075, and approved
[assumptions](assumptions.md). API projections are defined in [the HTTP contract](contracts/http-api.md).

## Articles

One row combines stable article metadata and the editable draft. All columns are NOT NULL
except the publication reference and publication date.

| Column | PostgreSQL type | Default / meaning |
| --- | --- | --- |
| `id` | `uuid` | Primary key; server-generated UUIDv4 |
| `slug` | `text` | Unique normalized slug; fixed after creation |
| `status` | `text` | `draft`; allowed values: draft, published, unpublished |
| `draft_title` | `text` | Required supplied title |
| `draft_body` | `text` | Empty string |
| `draft_tags` | `text[]` | Empty array |
| `revision` | `integer` | `0`; stale-write token |
| `next_version_number` | `integer` | `1`; next publication allocation |
| `current_published_version_id` | `uuid` | Nullable; initially NULL |
| `published_at` | `timestamptz` | Nullable; initially NULL |
| `created_at` | `timestamptz` | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamptz` | `CURRENT_TIMESTAMP` |

## Article versions

Each successful publication inserts an immutable snapshot. All columns are NOT NULL.

| Column | PostgreSQL type | Default / meaning |
| --- | --- | --- |
| `id` | `uuid` | Primary key; server-generated UUIDv4 |
| `article_id` | `uuid` | Owning article |
| `version_number` | `integer` | Allocated from the locked article counter |
| `title` | `text` | Copy of saved draft title |
| `body` | `text` | Copy of saved draft Markdown |
| `tags` | `text[]` | Copy of saved normalized tags |
| `created_at` | `timestamptz` | `CURRENT_TIMESTAMP` |

Snapshot content fields have no empty defaults: publication supplies the saved values.
Version numbers are per article, distinct from UUIDs and the article revision.

## Constraints and enforcement

| Protection | Enforcement |
| --- | --- |
| Stable identity | UUID primary keys; no identity sequence or UUID database extension |
| Slug collision | `UNIQUE(slug)` on articles; application normalization precedes insertion |
| Snapshot ownership | Snapshot `article_id` references article `id` with restrictive deletion |
| Version uniqueness | `UNIQUE(article_id, version_number)` |
| Reference target | Supporting `UNIQUE(article_id, id)` on snapshots |
| Owned current reference | Article `(id, current_published_version_id)` references snapshot `(article_id, id)` with `ON DELETE RESTRICT` |
| Allowed status | Database CHECK permitting draft, published, unpublished |
| Immutable snapshot | BEFORE UPDATE row trigger rejects every snapshot update, including audit fields |
| Required values | NOT NULL declarations as shown above |

Use primary/unique constraint indexes initially. Give constraints stable names in the
Drizzle declaration so expected slug/reference violations can be distinguished from
unrelated database failures. SQL trigger definitions belong in versioned migrations.

Application logic enforces the following previously selected rules:

- Draft state has null publication reference/date; published and unpublished states retain both.
- Revisions are nonnegative; counters and snapshot numbers are positive. No additional
  database range or publication-state CHECK is selected.
- Lifecycle writes to an existing article lock it first. Snapshot deletion also locks it, without
  requiring an expected revision.
- Version allocation advances transactionally and never decreases or resets after deletion.
- Slugs remain fixed and title/body/tag validation applies before persistence.

## Validation and normalization

Zod schemas in `server/validation/articles.ts` own request-shape rules and inferred input
types. Preserve title/body text; trimming is used only to test whether it is nonblank.

| Field | Rule |
| --- | --- |
| Title | Nonblank; at most 200 Unicode code points |
| Slug | Trim/lowercase; 1–100 characters; lowercase ASCII alphanumeric groups separated by single hyphens |
| Body | At most 100,000 Unicode code points; empty allowed for draft creation/save |
| Publish eligibility | Saved title and body must be nonblank |
| Tags | Array of strings; trim/lowercase, drop empty values, deduplicate in first-occurrence order |
| Normalized tags | At most 10; each at most 30 code points; same character/hyphen format as slugs |
| Expected revision | Nonnegative safe integer JSON number; no coercion |
| Writer URL identifiers | Valid UUID syntax; not restricted to UUIDv4 input |

Creation accepts omitted or null body/tags, normalizing them to an empty string/array.
Save requires complete string/array fields. Unknown body fields are invalid. The API
validation range for expected revisions is not narrowed to the storage integer range;
compare with the locked stored revision before any mutation.

## Lifecycle transitions

Every revision-checked operation uses: begin transaction → lock article → compare revision
→ check operation rules → perform writes → commit. Exceptions roll back all writes.

| Operation | Article effects | Snapshot effects |
| --- | --- | --- |
| Create | Draft, revision 0, next number 1, null publication fields; creation audit defaults | None |
| Save | Replace draft fields; revision +1; update audit time | None |
| Publish | Published; allocate/advance counter; set new reference; first date only; revision +1; update audit time | Insert new numbered saved-content snapshot |
| Unpublish | Unpublished; preserve reference/date; revision +1; update audit time | None |
| Restore | Copy owned snapshot content into draft; revision +1; update audit time; preserve publication state/reference/date and counter | None |
| Delete snapshot | Lock/check owner/reference; article fields/revision/audit unchanged | Delete eligible owned snapshot |

Save/restore succeed and advance revision even for identical content. Every publication
creates a new snapshot even when content is unchanged. Unpublish rejects draft-only and
already-unpublished state. Restore permits any retained owned version, including the
current/last-published one. Deletion protects the retained reference after unpublishing.

For well-formed requests, the revision comparison precedes publish-body, unpublish-state,
and restore-target eligibility. A stale request cannot act on a newer article state.

## Audit and read consistency

Use database transaction time. Creation defaults populate audit columns; successful
save/restore/publish/unpublish explicitly update article `updated_at` in their transaction.
Preserve article `created_at`. Reads, failed writes, and snapshot deletion leave article
audit values unchanged. Snapshot `created_at` is protected by the immutable-row trigger.
Timestamps need not provide unique ordering; history orders by descending version number.

First publish sets `published_at` with `CURRENT_TIMESTAMP`; later publishes and unpublish
preserve it. Audit columns are internal tracking fields, not additions to API projections.

Public list/detail select published articles joined to their current owned snapshot in
one statement. Title/body/tags come from snapshots; publication date comes from the article.
Default Read Committed statement snapshots and immutable content suffice for these reads;
public reads do not take lifecycle write locks.

Phase 2 verification proves schema defaults/nullability, unique/status/ownership/reference
constraints, update-rejecting triggers, migration application/idempotence, and reset/journal
isolation against PostgreSQL 18.6. Lifecycle atomicity, rollback, races, and complete
application restart persistence remain requirements for their feature tasks. See
[quickstart.md](quickstart.md) for the current evidence and platform limits.
