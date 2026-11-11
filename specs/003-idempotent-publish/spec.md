# Feature Specification: Idempotent Publish

**Feature Branch**: No new branch requested; feature directory is independent of branch naming.

**Created**: 2026-11-08

**Status**: US1/US2 implemented and verified on 2026-11-11; US3 remains pending.

**Input**: User description: "Idempotent publish (publishing twice with no draft changes doesn't create a redundant identical snapshot). This is also a stretch goal."

## Clarifications

### Session 2026-11-09

- Q: When an unpublished article is published again without content changes, should it reuse its last-published version? → A: Reuse the retained last-published snapshot and restore public access without creating a snapshot or allocating a version number. Advance the article revision and modification time for the publication-state change while preserving the original publication date.
- Q: Should changing only the order of tags create a new version when publishing? → A: No. Compare normalized tag membership without regard to order. If title and body match exactly and tag membership is unchanged, reuse the referenced snapshot and retain its published tag order; preserve the saved draft's tag order.
- Q: When already-published content is unchanged, should Publish leave the article revision and modification time unchanged too? → A: Yes. A valid current-revision Publish leaves all persisted fields unchanged, including article revision, modification time, and the referenced snapshot, and creates no snapshot.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish Unchanged Content Without Duplicating History (Priority: P1)

As a trusted internal writer, I can publish an already-published, unchanged saved draft
again without creating another identical version in its history.

**Why this priority**: This is the requested stretch behavior and keeps history meaningful.
P1 is relative to this feature; required application work remains higher priority.

**Independent Test**: Publish an article, then publish again with its current revision and
no saved content changes. Confirm the same version remains live, history gains no entry,
and the writer receives clear feedback that the content was already published.

**Acceptance Scenarios**:

1. **Given** a published article whose saved title and Markdown body match its live snapshot
   exactly and whose normalized tag membership is identical regardless of order,
   **When** the writer publishes with the current revision,
   **Then** publication succeeds without creating a snapshot or changing the live reference.
2. **Given** that unchanged publish, **When** the result is inspected, **Then** the draft,
   history, revision, next version number, audit timestamps, first publication date, and
   public content remain unchanged, and the writer sees that no new version was needed.
3. **Given** a published article, **When** its draft is saved without a content difference
   and then published using the resulting current revision, **Then** no new snapshot is
   created even though saving advanced the article revision.
4. **Given** a published article, **When** saved edits are reverted exactly to the live
   snapshot content and published, **Then** no new snapshot is created.
5. **Given** unchanged content, **When** publication is repeated several times using the
   current revision, **Then** all attempts leave the same live version and history.
6. **Given** only the saved tag order differs from the live snapshot, **When** published
   with the current revision, **Then** no version is created, the snapshot's public tag
   order remains unchanged, and the saved draft retains its own tag order.

---

### User Story 2 - Publish Changes and Republish Unpublished Content (Priority: P2)

As a writer, I can still publish changed content and explicitly bring an unpublished
article back online while avoiding redundant snapshots.

**Why this priority**: Duplicate prevention must preserve ordinary publication and
unpublish/republish behavior.

**Independent Test**: Publish changed content and confirm one new version. Unpublish,
then republish unchanged content and confirm public availability returns using the retained
snapshot. Repeat Publish and confirm no further state change.

**Acceptance Scenarios**:

1. **Given** a never-published article with a valid saved draft, **When** published,
   **Then** its first snapshot is created, it becomes public, and its first publication
   date and revision follow the existing publication rules.
2. **Given** saved title, Markdown body, or normalized tag membership differing from the referenced
   snapshot, **When** published, **Then** exactly one new numbered snapshot becomes live,
   existing versions remain immutable, and the original publication date is preserved.
3. **Given** an unpublished article whose saved draft matches its retained last-published
   snapshot, **When** explicitly published, **Then** that snapshot becomes public again
   without a new history entry or version-number allocation. Publication state changes
   advance the revision and update the article's modification time once.
4. **Given** an unpublished article with a changed saved draft, **When** published,
   **Then** a new snapshot is created and the article becomes public.
5. **Given** a draft matching an older historical version but differing from the currently
   referenced snapshot, **When** published, **Then** a new version is created; historical
   matches do not silently redirect the live reference to an older version.

---

### User Story 3 - Preserve Conflict and Failure Guarantees (Priority: P3)

As a writer, I can rely on duplicate prevention without weakening stale-write protection
or losing unsaved edits when an attempt conflicts or fails.

**Why this priority**: Existing lifecycle correctness must continue to hold for both
unchanged and changed publication attempts.

**Independent Test**: Exercise stale and concurrent publication attempts, then a failed
publication. Verify no extra snapshots or partial changes and preserved local edits.

**Acceptance Scenarios**:

1. **Given** a stale caller revision, **When** Publish is requested even with content
   matching the live snapshot, **Then** it fails with the existing conflict outcome and
   leaves all persisted state unchanged.
2. **Given** concurrent requests to publish the same changed saved draft, **When** completed,
   **Then** at most one new snapshot is created; stale contenders conflict rather than
   bypassing revision checks.
3. **Given** an already-published unchanged draft and concurrent current-revision requests,
   **When** completed without intervening changes, **Then** they create no snapshots and
   make no persistent changes.
4. **Given** a failure during a state-changing publish, **When** the attempt ends,
   **Then** no partial snapshot, reference, publication, revision, or counter change remains.
5. **Given** unsaved local edits, **When** publication is blocked, conflicts, or fails,
   **Then** those edits remain intact and are not implicitly saved or published.

### Edge Cases

- Equality uses saved content rather than elapsed time, draft revision, or editor dirty
  flags. Saving identical content does not require another publication version.
- Body whitespace, trailing newlines, Unicode sequences, Markdown syntax, and title
  whitespace are compared exactly as stored; visually equivalent rendering is insufficient.
- Tags use the existing saved normalization rules and compare by membership, ignoring order.
  Reusing a snapshot preserves its public tag order and leaves saved draft order intact,
  including when republishing after Unpublish. If another content change creates a new
  snapshot, that snapshot copies the current saved draft tag order.
- Draft-only articles always require a first snapshot; identical content belonging to
  another article never affects publication.
- Blank-body and other existing publication validation still reject invalid drafts.
- Deleting an unrelated historical version does not affect equality with the retained
  reference. A missing or wrong-owner referenced snapshot is an integrity failure, not
  permission to report an unchanged success.
- After a lost response, retrying with an old revision still conflicts if the first attempt
  changed state. Reloading current state and publishing unchanged content creates no duplicate.
- Protected referenced-version deletion, never-reused version numbers, restart persistence,
  and the first publication date remain governed by the existing lifecycle guarantees.

## Requirements *(mandatory)*

### Scope and Dependencies

This is an optional expansion of [001-docs-studio](../001-docs-studio/spec.md), which
deferred idempotent publishing. It is independent of [002-version-diff](../002-version-diff/spec.md).
The request authorizes specification of this stretch feature, with behavioral defaults
documented below for review.

The original [verification guide](../001-docs-studio/quickstart.md) records Windows acceptance T028 as
unverified. Assess required-work prerequisites before stretch implementation; this spec
does not close that acceptance item.

**Required alignment before implementation**: The original User Story 3, FR-003, data model,
publish contracts, decision records, and tests describe a new snapshot on every publish.
Constitution 3.0.0 now permits the three outcomes following human approval on 2026-11-10.
The human also extended the Windows T028 deferral to 003; the check remains unverified.
Reconcile the original baseline artifacts before dependent implementation and preserve the
human spec-first git checkpoint. These approvals do not claim implementation or verification.

In scope: content-based duplicate prevention against the same article's referenced
live/last-published snapshot, writer feedback, and preserved lifecycle guarantees.

Out of scope: request idempotency keys, replaying stale responses as successes, global or
whole-history deduplication, deleting existing duplicate versions, autosave, new publishing
modes, and other stretch features.

### Functional Requirements

Requirement IDs below are local to `003-idempotent-publish`.

- **FR-001**: The system MUST determine publication equality from exact saved title,
  Markdown source body, and order-independent normalized tag membership compared with
  the same article's referenced live or last-published snapshot. Tag reordering alone MUST
  NOT create a new version. Reuse MUST preserve the referenced snapshot's public tag order
  and the saved draft's own tag order; a new snapshot MUST copy saved draft tag order.
- **FR-002**: A valid current-revision publish of already-published identical content MUST
  succeed without creating a snapshot or changing any persisted article or version field,
  including the article revision and modification time. Concurrent valid unchanged attempts
  MUST NOT invalidate each other by advancing the revision.
- **FR-003**: A never-published article or saved content different from its referenced
  snapshot MUST follow ordinary publication behavior and create exactly one new snapshot
  for the successful state-changing attempt.
- **FR-004**: Publishing an unpublished article with identical retained content MUST make
  it public using the retained snapshot without allocating a version. It MUST advance
  the article revision and modification time for the publication-state change while
  preserving its first publication date, saved draft, history, and version allocation counter.
- **FR-005**: A match with an unrelated or older nonreferenced snapshot MUST NOT suppress
  a new version when the saved draft differs from the current reference.
- **FR-006**: Validation and stale-revision checks MUST retain their existing precedence
  and rejection behavior before any unchanged success is returned. Stale requests MUST
  NOT become successful solely because content matches.
- **FR-007**: Concurrent publication MUST NOT create duplicate snapshots for the same
  unchanged publication state. State-changing attempts MUST retain atomic completion,
  failure rollback, and stale-request protection.
- **FR-008**: The writer MUST receive clear feedback distinguishing newly published
  content, already-published unchanged content, and republished retained content. The
  resulting current article/version information MUST remain available to the writer.
- **FR-009**: Publication MUST use saved content, preserve unsaved local edits, and retain
  the existing editor requirement to save local changes before publishing.
- **FR-010**: Immutable history, referenced-version protection, unique never-reused version
  numbers, original publication date preservation, draft/public isolation, and persistence
  across restart MUST remain intact.

### Key Entities

- **Saved draft**: Existing persisted title, Markdown body, and ordered normalized tags.
- **Referenced snapshot**: The article's immutable live snapshot when published, retained
  as its last-published reference after Unpublish.
- **Publication outcome**: Newly created version, unchanged already-published result, or
  reactivation of retained identical content; this does not require a new stored entity.
- **Article revision**: Existing stale-write token, distinct from snapshot version numbers;
  unchanged publication is a no-op, while publication-state changes advance the token.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After initial publication, ten consecutive current-revision publishes with
  unchanged saved content add zero snapshots, consume zero version numbers, and change
  zero persisted fields, including revision and modification time. Multiple concurrent
  unchanged attempts using that same revision also succeed without persistent changes
  when no state-changing operation intervenes.
- **SC-002**: Each review case changing title, body, or tag membership creates exactly one
  new version on valid publication; identical saves, tag-only reorderings, and reversions
  to matching text and tag membership create zero redundant versions. Tag-only reordering
  cases for already-published and unpublished articles preserve the referenced snapshot's
  public tag order and the saved draft's own order. New-version cases copy saved tag order.
- **SC-003**: Unpublish followed by unchanged Publish restores public access with the same
  snapshot and original publication date, zero new versions, and one revision advancement
  for that republish. A following unchanged Publish makes zero additional changes.
- **SC-004**: Stale, concurrent, and failed publication scenarios produce zero duplicate
  snapshots or partial publication states and preserve all unsaved local fields.
- **SC-005**: In the reviewer walkthrough, feedback correctly identifies all three outcomes:
  new version, already published, and republished retained content.

## Assumptions

- "No draft changes" means equality of saved versioned content, not equality of revisions.
- Only the referenced live/last-published snapshot is eligible for reuse. Existing redundant
  history remains untouched.
- Exact stored title/body text and order-independent normalized tag membership define
  equality. Tag order is ignored, consistent with the version-diff feature's presentation,
  confirmed by the user on 2026-11-09. Rendered text equivalence remains excluded.
- Unchanged republishing after Unpublish reuses the retained snapshot and restores visibility,
  advancing the article revision and modification time while preserving the original
  publication date. Confirmed by the user on 2026-11-09.
- Already-published unchanged Publish leaves all persisted fields unchanged, including
  revision and modification time. Confirmed by the user on 2026-11-09.
- Existing writer access, validation, save-before-publish behavior, and conflict handling
  remain in use. No new architectural mechanism or dependency is selected here.
