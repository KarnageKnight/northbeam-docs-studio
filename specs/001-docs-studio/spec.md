# Feature Specification: Northbeam Docs Studio

**Feature Branch**: Not assigned; currently drafting on `main`.

**Created**: 2026-11-06

**Status**: Draft — FR-001 through FR-014, scope, key entities, and SC-001 through SC-006
are approved. Validation rules and remaining edge cases need clarification before planning.

**Input**: Northbeam Docs Studio take-home brief in
`Northbeam_Docs_Studio_Take_Home_Brief.docx`. Requirements are added one at a time after
explicit human approval.

## Scope

### In Scope

One trusted internal writer, anonymous readers, the approved article lifecycle, version
history, concurrency protection, an API, a minimal UI, Docker-based local execution,
automated tests, and reviewer documentation.

### Out of Scope

- Authentication, roles, and multi-tenancy.
- WYSIWYG editing, rich Markdown directives, custom components, and media uploads.
- Search, large-scale pagination, and caching layers.
- Production deployment, CI/CD, and infrastructure-as-code.

### Deferred Stretch Goals

Save-as-version, version diffs, automatic slug suffixing, and idempotent publishing are
deferred. Any addition requires a separate human approval after required work is complete.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Draft Article (Priority: P1)

As a trusted internal writer, I can create an article containing a title, slug, Markdown
body, and tags. The article starts as a draft.

**Why this priority**: Creating a draft is the starting point for authoring an article while
keeping it unavailable to public readers.

**Independent Test**: Create a draft, reopen it before and after an application restart,
and verify its content is preserved and it remains unavailable publicly.

**Acceptance Scenarios**:

1. **Given** a trusted internal writer, **When** the writer creates and saves an article with
   a title, slug, Markdown body, and tags, **Then** the article starts as a draft and can be
   reopened with its content preserved.
2. **Given** a saved draft, **When** the application restarts, **Then** the writer can still
   reopen the draft with its content preserved.
3. **Given** a draft-only article, **When** a public reader lists articles, **Then** that
   article is excluded.
4. **Given** a draft-only article, **When** a public reader requests that article, **Then**
   the response is `404`.
5. **Given** a new article, **When** the writer saves it as a draft, **Then** no published
   snapshot is created and no publication date is set.

### User Story 2 - Edit an Existing Draft (Priority: P1)

As a trusted internal writer, I can edit an article's draft title, Markdown body, and tags.

**Why this priority**: Writers need to revise content while preserving what public readers
currently see.

**Independent Test**: Edit and save an existing draft, reopen it before and after an
application restart, and verify the saved changes. For a published article, also verify
that its live snapshot and public content remain unchanged.

**Acceptance Scenarios**:

1. **Given** an existing article, **When** the writer edits its draft title, Markdown body,
   and tags and saves the changes, **Then** those changes are preserved when the draft is
   reopened, including after an application restart.
2. **Given** a published article, **When** the writer edits and saves its draft, **Then**
   the live snapshot and public content remain unchanged.
3. **Given** an existing article, **When** the writer saves draft changes, **Then** no
   published snapshot is created, publication status is unchanged, and the original
   publication date is unchanged.

### User Story 3 - Publish the Current Draft (Priority: P1)

As a trusted internal writer, I can explicitly publish an article's saved draft.

**Why this priority**: Publishing makes a stable version of the article available to public
readers while preserving earlier snapshots and the original publication date.

**Independent Test**: Publish a saved draft and verify its numbered snapshot, published
status, live version, and publication date. Republish changed content and verify earlier
snapshots and the first publication date are preserved. Exercise failures, crashes, and
concurrent requests to verify no partial publication state is left behind.

**Acceptance Scenarios**:

1. **Given** a saved draft, **When** the writer successfully publishes it, **Then** a new,
   uniquely numbered snapshot of its saved title, Markdown body, and tags is created.
2. **Given** a saved draft, **When** the writer successfully publishes it, **Then** the
   article becomes published and the new snapshot is designated as its live version.
3. **Given** an article, **When** it is published for the first time, **Then** `publishedAt`
   is set; subsequent successful publications preserve that original date.
4. **Given** an article with existing snapshots, **When** the writer publishes its current
   draft, **Then** the existing snapshots are not modified.
5. **Given** a publication attempt, **When** it encounters a failure, crash, or concurrent
   requests, **Then** snapshot creation and the publication change remain atomic, with no
   partial publication changes or invalid live snapshot reference left behind.

### User Story 4 - Unpublish an Article (Priority: P1)

As a trusted internal writer, I can explicitly unpublish a published article.

**Why this priority**: Writers need to remove an article from public access while preserving
its draft and published history for internal inspection.

**Independent Test**: Unpublish a published article, verify it disappears from the public
list and returns `404` publicly, then inspect the preserved snapshot, reference, publication
date, draft content, and history internally.

**Acceptance Scenarios**:

1. **Given** a published article, **When** the writer unpublishes it, **Then** the article
   is excluded from the public list and public requests for it return `404`.
2. **Given** a published article, **When** the writer unpublishes it, **Then** its last
   published snapshot, snapshot reference, and original `publishedAt` are preserved.
3. **Given** a published article, **When** the writer unpublishes it, **Then** its draft
   content is unchanged and no snapshots are created, modified, or deleted.
4. **Given** an unpublished article, **When** the writer inspects its last published
   snapshot internally, **Then** the preserved snapshot remains available for inspection.

### User Story 5 - View Version History (Priority: P1)

As a trusted internal writer, I can list and inspect an article's saved version snapshots.

**Why this priority**: Writers need to inspect retained versions and see what was previously
published, including after the article is unpublished.

**Independent Test**: List an article's retained snapshots, verify newest-first ordering
and version numbers, and inspect a selected snapshot's content. Verify history remains
accessible after unpublishing, a never-published article has empty history, and viewing
history leaves the article and its snapshots unchanged.

**Acceptance Scenarios**:

1. **Given** an article with retained snapshots, **When** the writer views its history,
   **Then** all retained snapshots are listed newest first with their version numbers.
2. **Given** an article's version history, **When** the writer selects a snapshot, **Then**
   its saved title, Markdown body, tags, and version number are displayed.
3. **Given** an unpublished article, **When** the writer views its history, **Then** history
   remains accessible; an article that has never been published shows an empty history.
4. **Given** an article, **When** the writer views its history or a selected snapshot,
   **Then** draft content, snapshots, publication status, and the publication date remain
   unchanged.

### User Story 6 - Restore a Snapshot into the Draft (Priority: P1)

As a trusted internal writer, I can restore a chosen snapshot's content into the article's
existing draft.

**Why this priority**: Writers need to recover earlier content while retaining history and
controlling when restored content becomes public.

**Independent Test**: Restore a retained snapshot into an article with different draft
content. Verify the draft receives the snapshot's content while history, publication status,
the live/last-published reference, and publication date remain unchanged. Verify restored
content becomes public only after an explicit publish.

**Acceptance Scenarios**:

1. **Given** an article with a retained snapshot, **When** the writer restores that
   snapshot, **Then** its title, Markdown body, and tags are copied into the article's
   existing draft, replacing the draft's current content.
2. **Given** an article with retained snapshots, **When** the writer restores a snapshot,
   **Then** no snapshots are created, deleted, or modified.
3. **Given** an article with a retained snapshot, **When** the writer restores it,
   **Then** publication status, the live/last-published snapshot reference, and the original
   publication date remain unchanged.
4. **Given** restored draft content, **When** the writer has not explicitly published
   that draft, **Then** the restored content does not become public; it becomes public only
   after the writer explicitly publishes the draft.

### User Story 7 - Delete a Historical Snapshot (Priority: P1)

As a trusted internal writer, I can delete a snapshot that is not the article's protected
published snapshot.

**Why this priority**: Writers need to remove historical versions while preserving the
published state and the integrity of the remaining history.

**Independent Test**: Delete an eligible snapshot and verify it disappears from history
without changing the draft, other snapshots, or publication state. Attempt to delete the
live snapshot and the retained last-published snapshot after unpublishing, including during
concurrent operations, and verify the API rejects protected deletion. Publish again and
verify deleted version numbers are not reused.

**Acceptance Scenarios**:

1. **Given** an eligible historical snapshot, **When** the writer deletes it, **Then**
   the snapshot is removed from the article's history.
2. **Given** an article's current live snapshot, **When** deletion is attempted through
   the API, including during concurrent operations, **Then** the API rejects the deletion.
3. **Given** an unpublished article, **When** deletion of its retained last-published
   snapshot is attempted, **Then** that snapshot remains protected from deletion.
4. **Given** an eligible historical snapshot, **When** the writer deletes it, **Then**
   draft content, other snapshots, publication status, the published reference, and the
   publication date remain unchanged.
5. **Given** deleted historical snapshots, **When** the writer publishes the article
   again, **Then** deleted version numbers are not reused.

### User Story 8 - Detect and Reject Stale Changes (Priority: P1)

As a trusted internal writer, I need an outdated editor view to be prevented from silently
overwriting or acting on newer article state.

**Why this priority**: Concurrent requests or multiple open editor views must not silently
lose work or apply publication actions to state the writer has not seen.

**Independent Test**: Load the same article state in multiple editor views, change the
article through one view, and attempt save, restore, publish, and unpublish from an outdated
view. Verify clear conflicts, no changes from rejected requests, and preservation of local
unsaved content. Explicitly reload and resubmit against the latest state. Also send competing
requests based on the same starting state and verify at most one succeeds.

**Acceptance Scenarios**:

1. **Given** the article has changed since the writer loaded it, **When** the writer
   submits save, restore, publish, or unpublish from that outdated view, **Then** the
   request is rejected.
2. **Given** a stale request, **When** it is rejected, **Then** a clear conflict is returned
   and the rejected request makes no changes to the draft, history, or publication state.
3. **Given** competing requests using the same starting article state, **When** they are
   processed, **Then** at most one succeeds and the others receive conflicts.
4. **Given** a writer with unsaved local content, **When** a request receives a conflict,
   **Then** the writer's unsaved local content is preserved.
5. **Given** a writer who received a conflict, **When** the writer explicitly reloads the
   latest article state, **Then** the writer can resubmit their intended action against
   that latest state.

### User Story 9 - List Published Articles Publicly (Priority: P1)

As an anonymous reader, I can browse published articles without signing in.

**Why this priority**: Readers need to discover available published documentation without
being shown draft or unpublished content.

**Independent Test**: Browse the public list with a mixture of published, draft-only, and
unpublished articles. Verify the displayed titles, tags, and original publication dates,
including when newer draft edits exist. Verify an empty list is shown when no articles are
published.

**Acceptance Scenarios**:

1. **Given** published, draft-only, and unpublished articles, **When** an anonymous reader
   browses the public list without signing in, **Then** only published articles are included.
2. **Given** a published article in the public list, **When** the reader views its entry,
   **Then** the entry displays the article's title, tags, and original publication date.
3. **Given** a published article with newer draft edits, **When** the reader views its list
   entry, **Then** the displayed title and tags come from the live snapshot, not the draft.
4. **Given** no published articles, **When** the reader browses the public list, **Then**
   an empty list is shown rather than an error.

### User Story 10 - View a Published Article (Priority: P1)

As an anonymous reader, I can view a published article without signing in.

**Why this priority**: Readers need to read stable, published documentation without seeing
unpublished draft changes.

**Independent Test**: View a published article anonymously and verify its displayed title,
tags, original publication date, and rendered Markdown body. Edit or restore its draft and
verify the public view remains unchanged, then republish and verify the new live snapshot
is shown. Request nonexistent, draft-only, and unpublished articles and verify `404` without
draft content.

**Acceptance Scenarios**:

1. **Given** a published article, **When** an anonymous reader views it without signing in,
   **Then** the page displays its title, tags, original publication date, and body rendered
   from Markdown.
2. **Given** a published article whose draft has been edited or restored, **When** a reader
   views it, **Then** its content comes exclusively from the live snapshot.
3. **Given** a published article, **When** it is republished and a reader views it,
   **Then** the reader sees the new live snapshot while the original publication date
   stays unchanged.
4. **Given** a nonexistent, draft-only, or unpublished article, **When** a public reader
   requests it, **Then** the response is `404` without exposing draft content.

### User Story 11 - Unique, Stable Article Slugs (Priority: P1)

As a trusted internal writer, I supply a unique slug when creating an article, and that
slug remains stable throughout the article's lifecycle.

**Why this priority**: Stable, unique slugs keep article addresses unambiguous without
introducing slug changes or automatic collision suffixes.

**Independent Test**: Create articles with writer-supplied slugs, attempt duplicate slugs
against published, draft-only, and unpublished articles, and verify a clear rejection
without automatic suffixing. Edit, restore, publish, and unpublish an article and verify
its slug remains unchanged.

**Acceptance Scenarios**:

1. **Given** a trusted internal writer creating an article, **When** the article is
   created, **Then** the writer supplies its slug.
2. **Given** existing articles of any publication status, **When** articles are created,
   **Then** their slugs are unique across all articles, including drafts and unpublished
   articles.
3. **Given** an existing article's slug, **When** the writer attempts to create another
   article with that slug, **Then** the duplicate is rejected with a clear error and no
   automatic suffix is added.
4. **Given** an existing article, **When** its draft is edited or restored, or the article
   is published or unpublished, **Then** its slug remains fixed after creation.

### User Story 12 - Minimal Writer Interface (Priority: P1)

As a trusted internal writer, I can manage articles through a browser interface.

**Why this priority**: Writers need a minimal interface to exercise the approved authoring
and history flows and understand whether their actions succeeded.

**Independent Test**: Use the article list to create or open an article, edit its fields,
preview Markdown, and save before publishing. Exercise unpublish and history actions, and
verify action feedback and preservation of local content on conflicts.

**Acceptance Scenarios**:

1. **Given** a trusted internal writer, **When** the writer uses the article list,
   **Then** the writer can create an article or open an existing draft.
2. **Given** the article editor, **When** the writer authors content, **Then** the editor
   supports title, tags, a slug at creation, and a Markdown textarea with rendered preview.
3. **Given** an article in the writer interface, **When** the writer manages its content
   and publication, **Then** separate Save, Publish, and Unpublish actions are available,
   and unsaved edits require an explicit successful Save before publishing.
4. **Given** an article's history panel, **When** the writer manages its snapshots,
   **Then** listing, inspecting, restoring, and deleting snapshots follow the approved
   lifecycle rules.
5. **Given** a writer action, **When** the action succeeds or fails, **Then** clear success
   or error feedback is shown, and conflicts preserve unsaved content as required by FR-008.

### User Story 13 - Run Locally with Docker Compose (Priority: P1)

As a reviewer, I can run the application and PostgreSQL together from a clean checkout
using one local startup command.

**Why this priority**: Reviewers need a reproducible local environment that preserves data
and works on the required operating systems.

**Independent Test**: Follow the README prerequisites and configuration, then start the
complete system with the documented command on Linux and Windows PowerShell. Verify the
application is built, PostgreSQL starts, migrations finish before requests are served,
and stored article data survives normal restarts.

**Acceptance Scenarios**:

1. **Given** a clean checkout with documented Docker prerequisites and configuration,
   **When** the reviewer runs `docker compose up --build`, **Then** the application and
   PostgreSQL start together using the same command on Linux and Windows PowerShell.
2. **Given** the local startup command, **When** the system starts, **Then** it builds the
   application, starts PostgreSQL, and applies migrations before serving requests.
3. **Given** stored articles, drafts, snapshots, and publication state, **When** the local
   services restart normally, **Then** that data is preserved in a persistent PostgreSQL
   volume.
4. **Given** a reviewer preparing to run the application, **When** the reviewer reads the
   README, **Then** Docker prerequisites and required configuration are documented.

### User Story 14 - Development Verification and Reviewer Documentation (Priority: P1)

As a developer, I can run automated verification; as a reviewer, I can understand the
application and its design from the documentation without being required to execute tests.

**Why this priority**: Development needs reproducible evidence of lifecycle correctness,
and reviewers need clear explanations of how to run the application and assess its design
tradeoffs.

**Independent Test**: During development, run the documented test command and inspect the
automated lifecycle scenarios. Review the README for prerequisites, configuration, startup,
the documented test command, data model rationale, an actual time-pressure tradeoff, and
known verification gaps or omissions. Reviewer execution of tests is not a completion gate.

**Acceptance Scenarios**:

1. **Given** the documented prerequisites, **When** a developer follows the test instructions,
   **Then** automated tests run with one documented command.
2. **Given** the application's automated tests, **When** lifecycle coverage is verified
   during development, **Then** tests cover draft isolation, publishing, unpublishing, restoration,
   deletion protection, stale requests, and publication atomicity, including failure and
   concurrency cases.
3. **Given** a reviewer reading the README, **When** the reviewer prepares to run and assess
   the application, **Then** the README explains prerequisites, configuration, startup,
   testing, the data model, and its rationale.
4. **Given** a reviewer assessing the implementation, **When** the reviewer reads the README,
   **Then** it describes at least one actual time-pressure tradeoff, what would improve with
   more time, and any known omissions or unverified platform support.

### Edge Cases

- Publishing interrupted by failure or crash, or affected by concurrent requests, MUST
  preserve publication consistency as defined in User Story 3, acceptance scenario 5.
- After unpublishing, the retained last-published snapshot remains protected from deletion
  under approved FR-007; this interpretation is recorded as A001 in the assumptions register.
- Stale saves, restores, publishes, and unpublishes MUST be rejected without applying their
  changes, including when requests compete from the same starting state, under FR-008.
- Slug collisions with published, draft-only, or unpublished articles MUST be rejected with
  a clear error and without automatic suffixing under FR-011.

Field-validation rules, including slug format and case handling, are pending separate human
review. Concurrency mechanisms and response formats remain technical planning decisions.
Additional edge cases will be added with the requirements that introduce them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 — Create a draft article (approved)**: The system MUST allow a trusted internal
  writer to create an article containing a title, slug, Markdown body, and tags. The article
  MUST start as a draft and satisfy User Story 1's five acceptance scenarios.
- **FR-002 — Edit an existing draft (approved)**: The system MUST allow a trusted internal
  writer to edit an article's draft title, Markdown body, and tags while satisfying User
  Story 2's three acceptance scenarios.
- **FR-003 — Publish the current draft (approved)**: The system MUST allow a trusted
  internal writer to explicitly publish an article's saved draft while satisfying User
  Story 3's five acceptance scenarios.
- **FR-004 — Unpublish an article (approved)**: The system MUST allow a trusted internal
  writer to explicitly unpublish a published article while satisfying User Story 4's four
  acceptance scenarios.
- **FR-005 — View version history (approved)**: The system MUST allow a trusted internal
  writer to list and inspect an article's saved version snapshots while satisfying User
  Story 5's four acceptance scenarios.
- **FR-006 — Restore a snapshot into the draft (approved)**: The system MUST allow a trusted
  internal writer to restore a chosen snapshot's content into the article's existing draft
  while satisfying User Story 6's four acceptance scenarios.
- **FR-007 — Delete a historical snapshot (approved)**: The system MUST allow a trusted
  internal writer to delete an eligible historical snapshot while protecting the article's
  published snapshot and satisfying User Story 7's five acceptance scenarios.
- **FR-008 — Detect and reject stale changes (approved)**: The system MUST prevent an
  outdated editor view from silently overwriting or acting on newer article state while
  satisfying User Story 8's five acceptance scenarios. The concurrency mechanism and response
  format remain decisions for technical planning.
- **FR-009 — List published articles publicly (approved)**: The system MUST allow an
  anonymous reader to browse published articles without signing in while satisfying User
  Story 9's four acceptance scenarios.
- **FR-010 — View a published article (approved)**: The system MUST allow an anonymous
  reader to view a published article without signing in while satisfying User Story 10's
  four acceptance scenarios.
- **FR-011 — Unique, stable article slugs (approved)**: The system MUST use writer-supplied
  slugs that are unique across all articles and fixed after creation, while satisfying
  User Story 11's four acceptance scenarios.
- **FR-012 — Minimal writer interface (approved)**: The system MUST provide a browser
  interface for the trusted internal writer to manage articles while satisfying User
  Story 12's five acceptance scenarios.
- **FR-013 — Run locally with Docker Compose (approved)**: The system MUST provide a
  single-command local Docker Compose environment for the application and PostgreSQL while
  satisfying User Story 13's four acceptance scenarios. Docker Compose for both services is
  an explicit human-selected execution constraint; remaining configuration details belong
  in the technical plan.
- **FR-014 — Development verification and reviewer documentation (approved)**: The system
  MUST provide development-owned automated verification and reviewer documentation while
  satisfying User Story 14's four acceptance scenarios. Reviewers are not required to
  execute tests; the test command MUST remain documented.

Any additional requirements identified during the remaining review will be proposed for
human approval before being added.

### Key Entities *(include if feature involves data)*

| Entity | Meaning |
| --- | --- |
| Article | The document's stable identity, unique fixed slug, publication status, original publication date, and current/last-published snapshot reference. |
| Draft | An article's editable working content: title, Markdown body, and tags. |
| Version snapshot | An immutable copy of published content, belonging to one article, containing its title, Markdown body, tags, and unique per-article version number. |

An article has one current draft and zero or more retained snapshots. Before its first
publication, it has no published snapshot reference or publication date.

These describe business concepts; database tables and storage structure remain
technical-planning decisions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All approved writer actions can be completed through the UI without direct
  database edits.
- **SC-002**: Public-reading checks expose zero draft-only or unpublished content.
- **SC-003**: All lifecycle-invariant checks pass, including snapshot immutability,
  publication-date preservation, non-destructive restore, protected deletion, and publish
  rollback.
- **SC-004**: Competing changes from the same starting state produce at most one success,
  clear conflicts for the others, and no silent overwrites.
- **SC-005**: One documented startup command works on Linux and Windows PowerShell; saved
  content and publication state survive normal restarts.
- **SC-006**: The README provides setup instructions, design rationale, at least one actual
  time-pressure tradeoff, and known limitations. Reviewers are not required to execute tests.

## Assumptions

See the [assumptions register](assumptions.md) for identified assumptions, their sources and
approval status, and architecture proposals awaiting human decisions. Recording an item in
the register does not approve it or add it as a functional requirement.
