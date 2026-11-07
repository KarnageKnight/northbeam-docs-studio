# Assumptions Register: Northbeam Docs Studio

**Created**: 2026-11-06
**Status**: Working register; recording an assumption or proposal does not approve it.

This register captures assumptions and proposed choices identified so far in the
[action plan](../../ACTION_PLAN.md) and specification review. Requirements stated directly
in the assignment and explicit human decisions are not open assumptions. Resolve affected
items through human review before treating them as approved requirements or architecture.

## Product Assumptions

### A001 — Protect the Last-Published Snapshot After Unpublishing

**Assumption**: After unpublishing, the retained last-published snapshot remains protected
from deletion.

**Reason**: The brief explicitly forbids deletion while a snapshot is live and requires
unpublishing to preserve the last snapshot and publication date. It does not explicitly
define whether that snapshot may be deliberately deleted later while the article is
unpublished. Extending deletion protection to that state is an interpretation.

**Status**: Approved by the user as FR-007 criterion 3; retained here as a documented
interpretation of the brief.

**Sources**: Approved FR-007 criterion 3 and the action plan's proposed unpublished protection
policy. Constitution Principle II protects the currently referenced snapshot, and approved
FR-004 preserves that reference when unpublishing. If a different deletion policy is chosen,
reconcile the constitution and affected documents before implementation.

### Other Identified Assumptions and Interpretations

| ID | Assumption or interpretation | Source | Status |
| --- | --- | --- | --- |
| A002 | Article slugs are unique. | Action plan's proposed default; the brief's suggested data shape. | Approved as FR-011 criterion 2, including drafts and unpublished articles. |
| A003 | An article's slug is fixed after creation. | Action plan's proposed default. | Approved as FR-011 criterion 4. |
| A004 | A slug collision is rejected with a clear conflict instead of automatically suffixing the slug. | Action plan's proposed default. | Clear rejection and no suffixing approved as FR-011 criterion 3; exact response belongs in the technical plan. |
| A005 | The editor requires an explicit successful save before publishing local edits, rather than saving automatically as part of Publish. | Action plan's proposed editor behavior. | Approved as FR-012 criterion 3; Save, Publish, and Unpublish are separate actions. |
| A006 | Each successful publish creates a new snapshot even when the draft content is unchanged. | Action plan's proposed default; FR-003 criterion 1. | Confirmed by approved FR-003; no longer an open assumption. |

## Architecture Proposals and Decisions

These items began as AI proposals from the action plan. Their status distinguishes approved
human decisions from proposals awaiting selection; recording a proposal does not approve it.
The agreed Nuxt/Vue/PostgreSQL stack remains a confirmed human decision. Present options for
remaining choices under Constitution Principle VI.

| ID | Existing proposal | Status |
| --- | --- | --- |
| P001 | Use TypeScript for the application. | Proposed; human selection pending. |
| P002 | Use one Nuxt application for UI and server endpoints, with thin handlers and a lifecycle service layer. | Proposed; human selection pending. |
| P003 | Use Drizzle with the `pg` driver for database access and migrations. | Proposed; human selection pending. |
| P004 | Use Vitest as the test runner. | Proposed; human selection pending. |
| P005 | Use Docker Compose for both the application and PostgreSQL, with persistent PostgreSQL storage and the same Linux/Windows startup command. | Approved with FR-013. Planned command: `docker compose up --build`. Detailed image, migration, and service configuration remain technical planning decisions. |
| P006 | Use an articles record with draft fields, revision, publication reference/date, and a next-version counter, plus separate version records. | Proposed schema; human selection pending. Required draft/snapshot separation is already established by the brief and constitution. |
| P007 | Use article-row locks and a consistent article-first lock order for publish, restore, unpublish, and deletion. | Proposed concurrency mechanism; human selection pending. |
| P008 | Use a revision token for conditional writes and return `409 Conflict` for stale requests. | Proposed protocol; human selection pending. FR-008 approves stale-request rejection behavior, not this mechanism or response format. |
| P009 | Allocate version numbers using a transactional per-article counter. | Proposed mechanism; human selection pending. Version uniqueness and non-reuse are already constitutional requirements. |
| P010 | Use a composite ownership/reference foreign key with restrictive deletion to protect the published snapshot. | Proposed database constraint design; human selection pending. Snapshot ownership and protection are already constitutional requirements. |

## Open Questions Without Adopted Defaults

- Field-validation rules, including required/nonempty values, allowed formats, size limits,
  and slug case handling. Slug uniqueness, collision rejection, and immutability are approved
  under FR-011.
- The concurrency mechanism and conflict response format; FR-008's observable stale-request
  behavior is approved, while technical proposals P007 and P008 remain pending.
- Remaining lifecycle edge cases to review during specification and clarification.

## Maintenance

Add newly identified assumptions here with a source and status. When a human resolves an
item, record the selected behavior and its requirement or plan reference; preserve the
distinction between an approved decision and a proposal awaiting review.
