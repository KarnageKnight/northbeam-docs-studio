# Feature Specification: Version Diff

**Feature Branch**: No new branch requested; feature directory is independent of branch naming.

**Created**: 2026-11-08

**Status**: Draft — stretch feature specified; not implemented or verified.

**Input**: User description: "A diff view between the draft and a past version, or between two versions. This is a stretch goal."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare Draft with a Past Version (Priority: P1)

As a trusted internal writer, I can compare my draft with a retained version of the same
article to understand my edits before saving or publishing.

**Why this priority**: Draft review is the primary use of this stretch feature. P1 is
relative to this feature; required application work remains higher priority.

**Independent Test**: Publish an article, edit its title, Markdown body, and tags without
saving, then compare with that version and verify differences and preserved local edits.

**Acceptance Scenarios**:

1. **Given** a retained version and a different draft, **When** compared, **Then** the
   version is labeled as baseline, the draft as target, and title, body, and tag changes appear.
2. **Given** unsaved editor changes, **When** comparison opens, **Then** it includes and
   labels those changes without requiring or triggering a save.
3. **Given** identical draft and version content, **When** compared, **Then** an explicit
   no-differences state appears.
4. **Given** unsaved edits, **When** changing versions or closing comparison, **Then** all
   local draft fields remain intact.
5. **Given** an unpublished article with retained history, **When** comparing its draft
   and a version, **Then** comparison works without changing public availability.

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
- A draft comparison captures editor content when opened or refreshed. Further edits require
  refresh or reopening, which the view explains. Changes in another tab do not replace local edits.

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

- **FR-001**: Writers MUST be able to compare the current draft with any retained version
  of that article, including its current or last-published version.
- **FR-002**: Writers MUST be able to select any two retained versions of one article and
  assign their baseline and target roles.
- **FR-003**: Comparisons MUST identify additions, removals, and unchanged text in title
  and Markdown source body, and additions/removals in tag membership. Indicators MUST
  work without color alone. Replacements MAY appear as removal followed by addition.
- **FR-004**: Both sources MUST be labeled as draft or by version number and as baseline
  or target. Draft comparisons MUST use local editor content, label unsaved changes when
  present, and explain when later edits require refreshing.
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
- **FR-011**: Source selection and comparison exit MUST be keyboard operable, with readable
  source labels and textual or symbolic change indicators.

### Key Entities

- **Article**: Existing owner of an editable draft and retained immutable versions.
- **Draft source**: Local editor title, Markdown body, and tags at comparison time,
  potentially including unsaved content.
- **Version source**: Existing snapshot identified by article and version number, containing
  retained title, Markdown body, and tags.
- **Comparison**: A read-only baseline/target pairing and displayed differences; it is not
  a new article version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both requested comparison modes succeed for valid same-article sources,
  including unpublished articles with retained history.
- **SC-002**: Review examples covering title changes, body additions/removals, whitespace,
  Unicode, tag changes, empty content, and identical sources all show expected differences
  or the no-differences state, with zero omitted changed fields.
- **SC-003**: Across opening, refreshing, changing selections, reversing sources, and
  closing comparisons, 100% of unsaved fields remain intact and zero stored draft,
  revision, history, or publication-state changes occur.
- **SC-004**: Every missing, deleted, and wrong-article source example produces a clear
  failure state with zero substitutions or content exposed from another article.
- **SC-005**: A reviewer completes both modes with only the keyboard and identifies
  baseline, target, additions, and removals without relying on color.

## Assumptions

- Title, Markdown body, and tags are compared because these are existing versioned content
  fields. Slug, timestamps, and lifecycle metadata are excluded from content comparison.
- "Draft" means current local editor content, including unsaved edits. This is a proposed
  product default for review.
- Markdown source comparison is sufficient; rendered comparison, word-level highlighting,
  and a particular split or unified layout are not required.
- Tag ordering has no comparison significance; text whitespace does.
- Existing trusted-writer access and retained history are reused. No new authentication,
  tenancy, autosave, or version retention behavior is introduced.
- These behavioral defaults are documented assumptions, not approved architecture choices.
  Technical design and any new dependency decisions belong in planning.

