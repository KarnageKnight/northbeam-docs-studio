# Feature Specification: Version Diff

**Feature Branch**: No new branch requested; feature directory is independent of branch naming.

**Created**: 2026-11-08

**Status**: Foundation engine/Worker implemented and tested on 2026-11-10. Revised single-scroll UI design approved on 2026-11-10; neither editor comparison story is integrated or verified.

**Input**: User description: "A diff view between the draft and a past version, or between two versions. This is a stretch goal."

## Clarifications

### Session 2026-11-09

- Q: When comparing a draft with a past version, which draft content should the comparison use? → A: Require writers to explicitly save before comparing a draft; compare saved content only. The user selected C, replacing the earlier A selection. Comparison must not save automatically.
- Q: How much detail should text differences show? → A: Show added, removed, and unchanged lines, with additional word-level highlighting within changed lines in titles and Markdown source bodies.
- Q: Should comparison support articles up to the existing 100,000-code-point body limit? → A: Support the full existing content limits for both sources without truncating differences or imposing a smaller comparison-only limit.
- Q: How should we decide whether the UI stays responsive during large comparisons? → A: Record the test environment and timings; verify controls operate during computation, cancellation stops the pending attempt without late results, and all completed output remains reachable. No fixed timing limit is adopted.

### Session 2026-11-10

- Q: How should the article diff be presented? → A: One continuous GitHub-style unified diff, with every line visible in one scroll. No pagination or collapsed unchanged sections. Title changes remain in the same diff surface; tag membership changes remain a summary.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare Draft with a Past Version (Priority: P1)

As a trusted internal writer, I can compare my draft with a retained version of the same
article to understand my saved edits before publishing.

**Why this priority**: Draft review is the primary use of this stretch feature. P1 is
relative to this feature; required application work remains higher priority.

**Independent Test**: Publish an article, edit its title, Markdown body, and tags, and verify
draft comparison requires an explicit successful save. Save, compare with that version,
and verify the saved differences without further changes to stored content.

**Acceptance Scenarios**:

1. **Given** a retained version and a different draft, **When** compared, **Then** the
   version is labeled as baseline, the draft as target, and title, body, and tag changes appear.
2. **Given** unsaved editor changes, **When** draft comparison is requested, **Then** it
   requires an explicit successful save before proceeding, preserves local edits, and does
   not save automatically.
3. **Given** identical draft and version content, **When** compared, **Then** an explicit
   no-differences state appears.
4. **Given** unsaved edits, **When** changing versions or closing comparison, **Then** all
   local draft fields remain intact.
5. **Given** an unpublished article with retained history, **When** comparing its draft
   and a version, **Then** comparison works without changing public availability.
6. **Given** a saved title or body line with a word replacement, **When** compared with
   a retained version, **Then** the changed line identifies the removed and added words
   while distinguishing unchanged words without relying on color alone.

---

### User Story 2 - Compare Two Versions (Priority: P2)

As a trusted internal writer, I can compare two retained versions of one article to
understand how published content evolved.

**Why this priority**: Historical comparison extends draft review to earlier publications.

**Independent Test**: Publish two different versions, compare them, reverse their baseline
and target roles, and verify reversed additions/removals and unchanged stored content.

**Acceptance Scenarios**:

1. **Given** two retained versions of one article, **When** selected for comparison,
   **Then** their version numbers and baseline/target roles identify the displayed title,
   Markdown body, and tag differences.
2. **Given** different versions, **When** baseline and target are reversed, **Then**
   additions become removals and removals become additions.
3. **Given** the same version on both sides or distinct versions with identical content,
   **When** compared, **Then** the view explicitly reports no differences.
4. **Given** any comparison, **When** opened, refreshed, changed, or closed, **Then** the
   saved draft, article revision, snapshots, publication status, live reference, and first
   publication date remain unchanged.
5. **Given** versions with a word replacement inside a title or body line, **When**
   compared, **Then** word-level additions and removals appear within the changed lines
   and reverse when baseline and target are reversed.

### Edge Cases

- No retained versions: explain that comparison requires a published version; preserve editing.
- One retained version: permit draft comparison and explain that distinct version comparison
  requires a second retained version.
- Missing, deleted, or wrong-article sources: show an unavailable-source message without
  displaying another article's content or losing unsaved edits.
- If a source disappears while comparison is open, the next comparison attempt reports
  it unavailable rather than substituting a different version. Background detection is not required.
- Empty bodies, empty tag lists, repeated lines, Unicode, blank lines, and trailing newlines
  remain valid inputs. Text whitespace differences remain detectable.
- Reordering the same tags alone is not a content difference.
- Markdown, raw HTML, and unsafe links appear as text; embedded content must not execute.
- A draft comparison captures saved draft content when opened or refreshed. Unsaved local
  changes block opening or refreshing draft comparison until an explicit successful save.
  Later edits do not silently change an already-displayed comparison; save and refresh or
  reopen to include them. Changes in another tab do not replace local edits.
- Comparing two retained versions does not require saving unrelated local draft edits.
- Sources at the existing title/body/tag limits remain comparable in both modes, including
  bodies of 100,000 Unicode code points per source, long single lines, and repeated lines.
  Comparison must not truncate content or omit word-level highlighting to handle size.

## Requirements *(mandatory)*

### Scope and Dependencies

This optional expansion follows [001-docs-studio](../001-docs-studio/spec.md), which deferred
version diffs. The user authorizes specification of this stretch goal. Existing immutable
snapshot and draft/public isolation guarantees and the
[constitution](../../.specify/memory/constitution.md) apply.

The original [handoff](../001-docs-studio/handoff.md) records Windows acceptance T028 as
unverified. This specification does not close that work or claim required delivery is fully
verified. Assess required-work prerequisites before stretch implementation.

In scope: writer-only, read-only comparisons within one article.
Out of scope: merging, accepting individual changes, restoring or publishing from the diff,
creating versions from unsaved drafts, cross-article comparison, rendered visual Markdown
diffs, public comparison views, and other deferred stretch goals.

### Functional Requirements

Requirement IDs below are local to `002-version-diff`.

- **FR-001**: Writers MUST be able to compare the saved draft with any retained version
  of that article, including its current or last-published version.
- **FR-002**: Writers MUST be able to select any two retained versions of one article and
  assign their baseline and target roles.
- **FR-003**: Comparisons MUST identify additions, removals, and unchanged text in title
  and Markdown source body at line level, with additional word-level highlighting within
  changed lines. Tag differences MUST show additions/removals in membership. Indicators at
  both text levels MUST work without color alone. Replacements MAY appear as removal
  followed by addition, with changed words identified within replaced lines.
- **FR-004**: Both sources MUST be labeled as draft or by version number and as baseline
  or target. Draft comparisons MUST use saved draft content captured when opened or refreshed.
  Unsaved local changes MUST require an explicit successful save before opening or refreshing
  draft comparison; comparison MUST NOT save automatically. The view MUST explain that later
  edits require saving and refreshing. Version-to-version comparison MUST NOT require saving
  unrelated local draft edits.
- **FR-005**: Identical content MUST show an explicit no-differences state. Empty content
  MUST compare without errors or fabricated differences.
- **FR-006**: Opening, refreshing, changing, reversing, and closing comparison MUST preserve
  unsaved edits and MUST NOT save, restore, publish, unpublish, delete, create a version,
  advance the article revision, or change any stored article or snapshot content.
- **FR-007**: Retained versions MUST remain comparable after unpublishing. Comparison MUST
  NOT expose drafts or historical content in public views or change the public representation.
- **FR-008**: Missing, deleted, or wrong-article sources MUST produce a clear failure state
  with preserved local edits and no silent substitution or cross-article content exposure.
- **FR-009**: Text comparison MUST preserve detectable whitespace and Unicode changes;
  tag comparison MUST ignore ordering when membership is identical.
- **FR-010**: Comparison MUST display source content safely as text without executing HTML
  or scripts or activating unsafe link destinations.
- **FR-011**: The entire article MUST appear in one continuous unified diff with all lines visible in one scroll, without pagination or collapsed unchanged sections. Source selection and comparison exit MUST be keyboard operable, with readable
  source labels and textual or symbolic change indicators.
- **FR-012**: Both comparison modes MUST support the full existing per-source content limits:
  titles of 200 Unicode code points, Markdown bodies of 100,000 Unicode code points, and
  up to 10 tags of 30 Unicode code points each. Comparisons MUST NOT impose a smaller
  content limit, truncate differences, or omit required word-level highlighting due to size.

### Key Entities

- **Article**: Existing owner of an editable draft and retained immutable versions.
- **Draft source**: Saved draft title, Markdown body, and tags captured at comparison time;
  unsaved editor changes are excluded and require an explicit successful save before draft
  comparison can open or refresh.
- **Version source**: Existing snapshot identified by article and version number, containing
  retained title, Markdown body, and tags.
- **Comparison**: A read-only baseline/target pairing and displayed differences; it is not
  a new article version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both requested comparison modes succeed for valid same-article sources,
  including unpublished articles with retained history. Draft comparison with unsaved
  changes requires an explicit successful save; a failed save prevents comparison from
  proceeding and preserves all local fields. Version-to-version comparison remains available
  without saving local edits.
- **SC-002**: Review examples covering title changes, body additions/removals, whitespace,
  Unicode, tag changes, empty content, and identical sources all show expected differences
  or the no-differences state, with zero omitted changed fields. Word replacements within
  title and body lines show the added/removed words distinctly from unchanged words in
  both comparison modes and reverse correctly when version sources are reversed.
- **SC-003**: Across opening, refreshing, changing selections, reversing sources, and
  closing comparisons, 100% of unsaved fields remain intact and zero stored draft,
  revision, history, or publication-state changes occur.
- **SC-004**: Every missing, deleted, and wrong-article source example produces a clear
  failure state with zero substitutions or content exposed from another article.
- **SC-005**: A reviewer completes both modes with only the keyboard and identifies
  baseline, target, additions, and removals without relying on color.
- **SC-006**: Boundary examples in both modes compare sources at the maximum title, body,
  and tag limits, including 100,000-code-point bodies on both sides with changed content,
  long single lines, and repeated lines. All changed fields and required line/word-level
  differences are available without truncation or a size-based rejection. During a separate pending-comparison
  attempt, Cancel/Close and source selection take effect before the original computation
  completes, preserve local edits, and prevent late results from cancelled work. In the
  completion attempt, the entire output remains keyboard reachable in one continuous scroll. Record environment,
  actions, and timings without requiring an unapproved fixed duration.

## Assumptions

- Title, Markdown body, and tags are compared because these are existing versioned content
  fields. Slug, timestamps, and lifecycle metadata are excluded from content comparison.
- "Draft" means saved draft content; writers must explicitly save unsaved changes before
  opening or refreshing draft comparison. Confirmed by the user on 2026-11-09.
- Markdown source comparison includes line-level differences and word-level highlighting
  within changed lines, confirmed by the user on 2026-11-09. Rendered comparison and the
  unified continuous layout was selected on 2026-11-10.
- Tag ordering has no comparison significance; text whitespace does.
- Comparison supports the full existing content limits without truncation, confirmed by
  the user on 2026-11-09. No numerical comparison-time budget has been agreed.
- Existing trusted-writer access and retained history are reused. No new authentication,
  tenancy, autosave, or version retention behavior is introduced.
- Unconfirmed behavioral defaults remain assumptions; confirmed choices above are product
  requirements, not approved architecture choices.
  Technical design and any new dependency decisions belong in planning.

