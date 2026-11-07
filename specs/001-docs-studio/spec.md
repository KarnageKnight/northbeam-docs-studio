# Feature Specification: Northbeam Docs Studio

**Feature Branch**: Not assigned; currently drafting on `main`.

**Created**: 2026-11-06

**Status**: Draft — FR-001 through FR-014, scope, key entities, and SC-001 through SC-006
are approved. Required fields, slug rules, reviewed lifecycle boundaries, Markdown behavior,
title/body limits, tag normalization, tag count/length limits, and allowed tag characters
are clarified. Ready for technical planning; architecture decisions remain subject to human
selection.

**Input**: Northbeam Docs Studio take-home brief in
`Northbeam_Docs_Studio_Take_Home_Brief.docx`. Requirements are added one at a time after
explicit human approval.

## Scope

### In Scope

Articles may cover any topic. The public portal presents articles published by writers;
content is not restricted to documentation or technical subjects.

One trusted internal writer, anonymous readers, the approved article lifecycle, version
history, concurrency protection, an API, a minimal UI, Docker-based local execution,
automated tests, and reviewer documentation.

### Out of Scope

- Authentication, roles, and multi-tenancy.
- WYSIWYG editing, rich Markdown directives, custom components, and media uploads.
- Search, large-scale pagination, and caching layers.
- Production deployment, CI/CD, and infrastructure-as-code.

### Deferred Stretch Goals

Save-as-version, version diffs, automatic slug suffixing, idempotent publishing, and limited
raw HTML formatting are deferred. The raw HTML candidate permits only `<b>`, `<strong>`,
`<i>`, `<em>`, `<br>`, and `<code>` without attributes; other raw HTML remains literal text.
The same approved link rules apply. Any addition requires a separate human approval after
required work is complete.

## Clarifications

### Session 2026-11-06

- Q: Which fields must be filled in before a draft can be saved or published? → A: Drafts
  require a nonblank title and slug; the body may be empty. Publishing also requires a
  nonblank body. Tags are optional. Nonblank means more than whitespace. The user selected
  option A and requested that this decision also be recorded in the assumptions register.
- Q: How should article slugs be formatted and compared for uniqueness? → A: Trim outer
  whitespace and convert uppercase letters to lowercase before validation, storage, and
  uniqueness checks. The normalized slug must be 1–100 characters using `a–z` and `0–9`,
  with single hyphens between groups. Reject other invalid formats. The user selected
  option B and requested that this decision also be recorded in the assumptions register.
- Q: What should happen when a writer unpublishes an article that is already unpublished
  or has never been published? → A: Reject both cases with a clear error and no changes.
  Stale requests still receive conflicts under FR-008. The user selected option B.
- Q: How should the writer preview and public article pages handle raw HTML and links in
  Markdown? → A: Use standard Markdown and display raw HTML as literal text in both views.
  Allow HTTP, HTTPS, email (`mailto:`), relative-path, and `#heading` links; other URL schemes
  must not produce clickable links. The user selected option A and requested option B's
  limited, attribute-free raw HTML formatting as a deferred stretch goal.
- Q: Should writers be allowed to restore the current or last-published snapshot into the
  draft? → A: Allow any retained snapshot belonging to the article, including its current
  or last-published snapshot. Restore changes only draft content and preserves the public
  view and publication state; an already-identical draft has no content difference. Restore
  and delete requests for missing or wrong-article snapshots are rejected with a clear error
  and no changes. The user selected option A after discussing why restoring the current
  snapshot can recover a draft that has diverged from published content.

### Session 2026-11-06 (Pass 2)

- Q: What maximum lengths should article titles and Markdown bodies have? → A: Titles have
  a maximum of 200 characters and Markdown bodies a maximum of 100,000 characters. Lengths
  count Unicode code points, including spaces and Markdown syntax. Existing nonblank-field
  rules still apply. The user selected option A.
- Q: How should tags handle capitalization, whitespace, and duplicates? → A: Trim outer
  whitespace, lowercase tags, discard empty results, and remove duplicates after normalization.
  Preserve the order of first occurrences. For example, `API` and `api` become one `api`
  tag. The user selected option A.
- Q: What limits should apply to the number and length of tags? → A: Allow up to 10 tags,
  each at most 30 Unicode code points, measured after normalization. Reject inputs exceeding
  either limit with a clear validation error; do not truncate tags or silently drop extra
  tags. The user selected option A.
- Q: What characters should tags allow? → A: After normalization, allow only lowercase ASCII
  letters `a–z` and digits `0–9`, with single hyphens between groups, like slugs. Reject
  invalid tags with a clear validation error. Existing normalization and count/length
  limits still apply. The user selected option B.

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
6. **Given** a nonblank title and slug, **When** the writer creates a draft with an empty
   body and no tags, **Then** the draft can be saved.
7. **Given** a blank or whitespace-only title or slug, or a title/body exceeding its length
   limit, **When** the writer attempts to create a draft, **Then** the draft is rejected
   with a clear validation error.
8. **Given** otherwise-valid input with a 200-character title and a 100,000-character
   Markdown body, **When** the writer creates a draft, **Then** the input is accepted at
   those maximum lengths, measured in Unicode code points.
9. **Given** tags ` API `, `api`, a whitespace-only entry, `Guide`, and `guide`, **When**
   the writer saves the draft, **Then** the tags become `api`, `guide` in that order:
   outer whitespace is trimmed, case is lowered, empty results are discarded, and duplicate
   normalized tags are removed.
10. **Given** otherwise-valid input, **When** the writer creates a draft with 10 normalized
    tags each 30 Unicode code points long, **Then** the input is accepted. More than 10
    normalized tags or any normalized tag longer than 30 Unicode code points is rejected
    with a clear validation error, without truncating tags or silently dropping extra tags.
11. **Given** supplied tags, **When** they are normalized and validated, **Then** ` API `
    and `Getting-Started` are accepted as `api` and `getting-started`. Internal spaces,
    punctuation other than single hyphens between groups, non-ASCII characters, and leading,
    trailing, or repeated hyphens are rejected with a clear validation error.

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
4. **Given** an existing draft, **When** the writer saves changes, **Then** its title and
   slug must remain nonblank, its title and body must satisfy their length limits, its
   body may be empty, and tags are optional. Changes exceeding the limits are rejected
   with a clear validation error. Supplied tags follow FR-001's normalization, count/length,
   and character rules; invalid changes leave the saved draft unchanged.

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
6. **Given** a draft with a blank or whitespace-only body, **When** the writer attempts to
   publish it, **Then** publication is rejected without creating a snapshot or changing
   publication state.

### User Story 4 - Unpublish an Article (Priority: P1)

As a trusted internal writer, I can explicitly unpublish a published article.

**Why this priority**: Writers need to remove an article from public access while preserving
its draft and published history for internal inspection.

**Independent Test**: Unpublish a published article, verify it disappears from the public
list and returns `404` publicly, then inspect the preserved snapshot, reference, publication
date, draft content, and history internally. Attempt to unpublish already-unpublished and
never-published articles and verify both requests are rejected without changes.

**Acceptance Scenarios**:

1. **Given** a published article, **When** the writer unpublishes it, **Then** the article
   is excluded from the public list and public requests for it return `404`.
2. **Given** a published article, **When** the writer unpublishes it, **Then** its last
   published snapshot, snapshot reference, and original `publishedAt` are preserved.
3. **Given** a published article, **When** the writer unpublishes it, **Then** its draft
   content is unchanged and no snapshots are created, modified, or deleted.
4. **Given** an unpublished article, **When** the writer inspects its last published
   snapshot internally, **Then** the preserved snapshot remains available for inspection.
5. **Given** an already-unpublished article, **When** the writer requests unpublish,
   **Then** the request is rejected with a clear error and no article or history changes.
6. **Given** an article that has never been published, **When** the writer requests
   unpublish, **Then** the request is rejected with a clear error and no article or history
   changes; the article remains a draft.

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
the live/last-published reference, and publication date remain unchanged. Verify restore
does not change the public view or availability; exposing unpublished draft changes requires
an explicit publish. Restore the current/last-published snapshot and verify it is permitted,
including when draft content already matches it. Reject missing or wrong-article targets
without changes.

**Acceptance Scenarios**:

1. **Given** an article with a retained snapshot, **When** the writer restores that
   snapshot, **Then** its title, Markdown body, and tags are copied into the article's
   existing draft, replacing the draft's current content.
2. **Given** an article with retained snapshots, **When** the writer restores a snapshot,
   **Then** no snapshots are created, deleted, or modified.
3. **Given** an article with a retained snapshot, **When** the writer restores it,
   **Then** publication status, the live/last-published snapshot reference, and the original
   publication date remain unchanged.
4. **Given** an article's existing public view or public unavailability, **When** the writer
   restores a snapshot without publishing the draft, **Then** that public view or
   unavailability remains unchanged. Already-public content remains public; unpublished
   draft changes become public only after an explicit publish.
5. **Given** an article's current or last-published snapshot, **When** the writer restores
   it, **Then** it can be copied into the draft without changing publication state or history.
   If the draft already matches the snapshot, there is no content difference.
6. **Given** a missing snapshot or one belonging to another article, **When** a restore is
   requested, **Then** the request is rejected with a clear error and no changes.

### User Story 7 - Delete a Historical Snapshot (Priority: P1)

As a trusted internal writer, I can delete a snapshot that is not the article's protected
published snapshot.

**Why this priority**: Writers need to remove historical versions while preserving the
published state and the integrity of the remaining history.

**Independent Test**: Delete an eligible snapshot and verify it disappears from history
without changing the draft, other snapshots, or publication state. Attempt to delete the
live snapshot and the retained last-published snapshot after unpublishing, including during
concurrent operations, and verify the API rejects protected deletion. Publish again and
verify deleted version numbers are not reused. Verify missing or wrong-article deletion
targets are rejected without changes.

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
6. **Given** a missing snapshot or one belonging to another article, **When** deletion is
   requested, **Then** the request is rejected with a clear error and no changes.

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

**Why this priority**: Readers need to discover available published articles without
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

**Why this priority**: Readers need to read stable, published articles without seeing
unpublished draft changes.

**Independent Test**: View a published article anonymously and verify its displayed title,
tags, original publication date, and rendered Markdown body. Edit or restore its draft and
verify the public view remains unchanged, then republish and verify the new live snapshot
is shown. Request nonexistent, draft-only, and unpublished articles and verify `404` without
draft content. Verify raw HTML is displayed literally and only approved link destinations
become clickable.

**Acceptance Scenarios**:

1. **Given** a published article, **When** an anonymous reader views it without signing in,
   **Then** the page displays its title, tags, original publication date, and body rendered
   from standard Markdown, with raw HTML displayed as literal text.
2. **Given** a published article whose draft has been edited or restored, **When** a reader
   views it, **Then** its content comes exclusively from the live snapshot.
3. **Given** a published article, **When** it is republished and a reader views it,
   **Then** the reader sees the new live snapshot while the original publication date
   stays unchanged.
4. **Given** a nonexistent, draft-only, or unpublished article, **When** a public reader
   requests it, **Then** the response is `404` without exposing draft content.
5. **Given** links in a published article's Markdown, **When** the article is rendered,
   **Then** only HTTP, HTTPS, email (`mailto:`), relative-path, and `#heading` destinations
   produce clickable links; other URL schemes do not.

### User Story 11 - Unique, Stable Article Slugs (Priority: P1)

As a trusted internal writer, I supply a unique slug when creating an article, and that
slug remains stable throughout the article's lifecycle.

**Why this priority**: Stable, unique slugs keep article addresses unambiguous without
introducing slug changes or automatic collision suffixes.

**Independent Test**: Create articles with writer-supplied slugs, attempt duplicate slugs
against published, draft-only, and unpublished articles, and verify a clear rejection
without automatic suffixing, including duplicates after trimming and lowercasing. Verify
accepted slugs are normalized and satisfy the format and length rules. Edit, restore,
publish, and unpublish an article and verify its stored slug remains unchanged.

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
5. **Given** a supplied slug, **When** the article is created, **Then** outer whitespace
   is trimmed and uppercase letters are converted to lowercase before validation, storage,
   and uniqueness checks; for example, ` Getting-Started ` becomes `getting-started`.
6. **Given** a normalized slug, **When** it is validated, **Then** it must contain 1–100
   characters using `a–z` and `0–9`, with single hyphens between groups. Empty values,
   leading/trailing/repeated hyphens, internal whitespace, and other characters are rejected.
7. **Given** an existing normalized slug, **When** another supplied slug becomes identical
   after trimming and lowercasing, **Then** creation is rejected as a duplicate without
   automatic suffixing.

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
   supports title, tags, a slug at creation, and a Markdown textarea with rendered preview
   using the same Markdown, raw HTML, and link rules as public article pages under FR-010.
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
  a clear error and without automatic suffixing under FR-011. Uniqueness is checked after
  trimming outer whitespace and lowercasing, so ` Guide ` and `guide` collide.
- Draft creation and saving require a nonblank title and slug; publishing also requires a
  nonblank body. Nonblank means more than whitespace. Empty draft bodies and no tags are
  allowed. This decision is recorded as A007 in the assumptions register.
- Slug format and length are validated after normalization: 1–100 characters using `a–z`
  and `0–9`, with single hyphens between groups. Invalid formats are rejected rather than
  rewritten beyond trimming and lowercasing. This decision is recorded as A008.
- Requests to unpublish an already-unpublished or never-published article MUST be rejected
  with a clear error and no changes. Stale requests still receive conflicts under FR-008.
  This decision is recorded as A009.
- Writer previews and public pages MUST display raw HTML as literal text and allow only
  HTTP, HTTPS, email (`mailto:`), relative-path, and `#heading` links to become clickable.
  This decision is recorded as A010. Limited raw HTML formatting is a deferred stretch
  goal recorded as A011, not part of required rendering behavior.
- The current or last-published snapshot MAY be restored into the draft, including when
  its content is already identical. Restore leaves the public view and publication state
  unchanged. Missing or wrong-article snapshot targets MUST be rejected for both restore
  and delete with a clear error and no changes. These decisions are recorded as A012–A013.
- Titles MUST contain at most 200 Unicode code points and Markdown bodies at most 100,000,
  counting spaces and Markdown syntax. The limits apply to draft creation, draft saves,
  and publication. Over-limit values MUST be rejected with a clear validation error rather
  than truncated. Existing nonblank-field rules still apply. This decision is recorded as A014.
- On draft creation and saving, supplied tags MUST be trimmed, lowercased, and deduplicated
  after normalization, with empty results discarded and first-occurrence order preserved.
  This decision is recorded as A015.
- After normalization, at most 10 tags are allowed, each at most 30 Unicode code points.
  Draft creation and saving MUST reject inputs exceeding either limit with a clear
  validation error, without truncating tags or silently dropping extra tags. This decision
  is recorded as A016.
- After normalization, each retained tag MUST use only lowercase ASCII letters `a–z` and
  digits `0–9`, with single hyphens between groups. Invalid tags MUST be rejected with a
  clear validation error; do not rewrite internal spaces or other invalid characters.
  Existing normalization and count/length limits still apply. This decision is recorded
  as A017.

Concurrency mechanisms and response formats remain technical planning decisions.
Additional edge cases will be added with the requirements that introduce them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 — Create a draft article (approved)**: The system MUST allow a trusted internal
  writer to create an article containing a title, slug, Markdown body, and tags. The article
  MUST start as a draft and satisfy User Story 1's eleven acceptance scenarios. The title
  and slug MUST be nonblank; the body MAY be empty and tags are optional. Titles MUST NOT
  exceed 200 Unicode code points and Markdown bodies MUST NOT exceed 100,000; counts include
  spaces and Markdown syntax. Over-limit values MUST be rejected with a clear validation error.
  Supplied tags MUST be trimmed and lowercased, empty results discarded, and duplicates
  removed after normalization, preserving the order of first occurrences. After normalization,
  at most 10 tags are allowed, each at most 30 Unicode code points. Exceeding either limit
  MUST cause a clear validation error, without truncating tags or silently dropping extra tags.
  Each retained tag MUST use only lowercase ASCII letters `a–z` and digits `0–9`, with
  single hyphens between groups. Invalid tags MUST be rejected with a clear validation error.
- **FR-002 — Edit an existing draft (approved)**: The system MUST allow a trusted internal
  writer to edit an article's draft title, Markdown body, and tags while satisfying User
  Story 2's four acceptance scenarios. Saving MUST satisfy FR-001's required-field,
  length-limit, tag-normalization, tag count/length, and tag character rules.
- **FR-003 — Publish the current draft (approved)**: The system MUST allow a trusted
  internal writer to explicitly publish an article's saved draft while satisfying User
  Story 3's six acceptance scenarios. Publishing MUST require a nonblank title, slug, and
  body and satisfy FR-001's title/body length limits; tags remain optional.
- **FR-004 — Unpublish an article (approved)**: The system MUST allow a trusted internal
  writer to explicitly unpublish a published article while satisfying User Story 4's six
  acceptance scenarios. Requests for already-unpublished or never-published articles MUST
  fail with a clear error and no changes; stale-request protection under FR-008 still applies.
- **FR-005 — View version history (approved)**: The system MUST allow a trusted internal
  writer to list and inspect an article's saved version snapshots while satisfying User
  Story 5's four acceptance scenarios.
- **FR-006 — Restore a snapshot into the draft (approved)**: The system MUST allow a trusted
  internal writer to restore a chosen snapshot's content into the article's existing draft
  while satisfying User Story 6's six acceptance scenarios. Any retained snapshot belonging
  to that article MAY be restored, including its current/last-published snapshot. Restore
  MUST preserve public visibility and content, publication state, and history. Missing or
  wrong-article targets MUST be rejected with a clear error and no changes.
- **FR-007 — Delete a historical snapshot (approved)**: The system MUST allow a trusted
  internal writer to delete an eligible historical snapshot while protecting the article's
  published snapshot and satisfying User Story 7's six acceptance scenarios. Missing or
  wrong-article targets MUST be rejected with a clear error and no changes.
- **FR-008 — Detect and reject stale changes (approved)**: The system MUST prevent an
  outdated editor view from silently overwriting or acting on newer article state while
  satisfying User Story 8's five acceptance scenarios. The concurrency mechanism and response
  format remain decisions for technical planning.
- **FR-009 — List published articles publicly (approved)**: The system MUST allow an
  anonymous reader to browse published articles without signing in while satisfying User
  Story 9's four acceptance scenarios.
- **FR-010 — View a published article (approved)**: The system MUST allow an anonymous
  reader to view a published article without signing in while satisfying User Story 10's
  five acceptance scenarios. Standard Markdown MUST be rendered, raw HTML MUST be shown
  as literal text, and clickable links MUST be limited to HTTP, HTTPS, email (`mailto:`),
  relative-path, and `#heading` destinations.
- **FR-011 — Unique, stable article slugs (approved)**: The system MUST use writer-supplied
  slugs that are unique across all articles and fixed after creation, while satisfying
  User Story 11's seven acceptance scenarios. Supplied slugs MUST be trimmed and lowercased
  before validation, storage, and uniqueness checks. The normalized slug MUST contain
  1–100 characters using `a–z` and `0–9`, with single hyphens between groups.
- **FR-012 — Minimal writer interface (approved)**: The system MUST provide a browser
  interface for the trusted internal writer to manage articles while satisfying User
  Story 12's five acceptance scenarios. Its preview MUST use FR-010's Markdown, raw HTML,
  and link rules.
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
| Article | The document's stable identity, unique normalized fixed slug, publication status, original publication date, and current/last-published snapshot reference. |
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
