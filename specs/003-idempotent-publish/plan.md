# Implementation Plan: Idempotent Publish

**Feature context**: `003-idempotent-publish` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Status**: Option B selected by the user on 2026-11-09. Architecture approved for task planning; constitution 3.0.0 and the 003 Windows deferral approved and applied on 2026-11-10; baseline reconciliation and human git checkpoint remain pending. No branch checkout, implementation, dependency installation, or runtime verification performed.

## Summary

Extend saved-content Publish with three outcomes: create a new immutable snapshot for first/different content; return already-published equivalent content without persistent changes; reactivate an unpublished article using its retained equivalent snapshot. Exact title/body plus normalized tag membership define equality; tag order does not.

Selected option B: branch inside the existing article-locked publication transaction and retain the exact WriterArticle response. The UI derives feedback from captured pre-request publication status/reference and the successful returned snapshot reference. Avoid redundant response data that can be derived reliably from existing fields. No new endpoint, schema, migration, dependency, hash, history deduplication, or request-idempotency mechanism.

## Technical Context

**Language/Version**: Existing TypeScript 6.0.3, Node 24.22.2, Nuxt 4.6.4, Vue 3.5.45.
**Primary Dependencies**: Existing Drizzle/pg/Zod and native JavaScript string/Set comparisons. No new packages.
**Storage**: Existing PostgreSQL 18.6 articles/article_versions tables and constraints.
**Testing**: Existing Vitest unit and real PostgreSQL/HTTP suites; extend publication, rollback, contention, and history fixtures rather than duplicating suites. Browser acceptance for outcome feedback and delayed typing.
**Target Platform**: Existing local Compose/host workflows; no new hosting or scaling topology. Windows T028 remains unverified.
**Project Type**: Existing Nuxt monolith.
**Performance Goals**: No new numerical latency target. Compare only bounded saved fields with one referenced snapshot read; no full-history scan. Verify maximum accepted title/body/tag inputs without introducing a reduced publish limit.
**Constraints**: Article-first row lock, stale revision before content eligibility/equality, immutable snapshots, first date preserved, no unsaved browser content published. Governance alignment must precede code.
**Scale/Scope**: One owned referenced snapshot per publish decision; existing title 200/body 100,000 code points and 10 tags of 30 code points. Feature 002 is independent and not a dependency.

## Constitution Check

| Principle | Pre/post-design result |
|---|---|
| I. Specification first | Spec/plan/tasks and human checkpoint precede implementation. New behavior is explicitly future, not retroactive evidence. |
| II. Draft/history isolation | Existing isolation, immutability, reference protection, and first date retained; no data migration. |
| III. Atomic lifecycle | SATISFIED at governance level: human-approved constitution 3.0.0 permits the three outcomes. Baseline reconciliation remains T004. |
| IV. Database evidence | Real-DB exact no-op state, reactivation, changed publish, rollback, and independent-connection races planned. Existing full-suite/build/typecheck gates remain. |
| V. Scope/review | Documentation only. Windows T028 remains open and unverified; the human approved extending its deferral to 003 on 2026-11-10. |
| VI. Human architecture | SATISFIED: user selected option B on 2026-11-09: existing locked transaction, unchanged response, inferred feedback, and the documented integration/testing approach. |
| VII. Consistent patterns | Reuse withArticleTransaction, direct response, errors, acceptSaved, and existing test helpers; no publish-only response field or new response type is introduced. |

**Research gate**: read-only investigation allowed. **Post-design gate**: architecture selection satisfied by option B; constitution amendment and Windows disposition are approved; baseline reconciliation and the human spec-first git checkpoint remain open. Application implementation has not started. No exception to atomicity, stale checks, or snapshot protection is requested.

## Architecture selection

| Option | Approach | Tradeoff |
|---|---|---|
| A — not selected | Existing locked transaction; exact equality; direct WriterArticle response plus publicationOutcome; existing local editor/test patterns | Explicit server-authoritative feedback with one additive publish-only response field; no schema/dependency changes. |
| B — selected 2026-11-09 | Same locked transaction/equality, unchanged WriterArticle response; client derives outcome from before/after status/reference/revision | Preserves wire shape and avoids redundant response data; requires captured pre-request state and inference tests. |

A response wrapper is not recommended because it departs from the existing direct-object convention. Precomputed hashes are not needed without evidence of equality cost; they add canonicalization, collision handling, and schema work.

## Publication flow (selected design; not implemented)

1. Retain request parsing/UUID/expectedRevision validation at the thin handler.
2. Reuse withArticleTransaction without broad helper changes: lock article, check existence/revision, then enter operation.
3. Run existing publish content validation. Validate referenced snapshot ownership/integrity before equality-based success or replacement.
4. Fetch only currentPublishedVersionId with articleId. A published/unpublished article with missing reference/date, or a missing/wrong-owner snapshot, fails generically as an integrity error; do not fabricate success or heal it silently.
5. Compare exact title/body and normalized tag memberships without sorting/mutating saved arrays.
6. Published + equal: return unchanged current article; no INSERT/UPDATE, revision/date/audit/counter/reference changes.
7. Unpublished + equal: UPDATE status to published, revision +1, updatedAt once. Preserve reference, first date, draft/tag order, history, and counter.
8. First publication or different content: retain existing atomic INSERT + publication update/counter/revision flow; allocate UUID/version only on this branch. New snapshot copies saved tag order.
9. Return the unchanged WriterArticle shape only after transaction completion; infer UI feedback from captured pre-request state and this successful response. Unexpected failure remains a generic 500; rollback applies to both state-changing paths.

No-op means no persisted application-field change, not absence of locking or database transaction bookkeeping.

## Concurrency reasoning

- Changed/first publish competitors at the same revision: one success, stale contender conflicts.
- Unpublished equivalent-content competitors: one reactivation/revision advance, stale contender conflicts.
- Already-published equivalent competitors: all can succeed without persistent changes.
- No-op versus Save/Unpublish: if no-op finishes first, both can succeed; if the writer changes revision first, Publish conflicts. Do not extend the old at-most-one-success assertion to no-ops.
- Delete uses existing article-first locking; the referenced snapshot remains protected in either ordering.
- Lost response after a state-changing success does not bypass stale checks. Reload then Publish can return unchanged. No idempotency key or response replay is promised.

## Project Structure

### Documentation

```text
specs/003-idempotent-publish/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── constitution-alignment.md
├── contracts/publish.md
├── quickstart.md
└── checklists/requirements.md
```

[tasks.md](tasks.md) contains 24 generated tasks for selected option B. Governance decisions are approved; baseline alignment and the human git checkpoint still precede code.

### Source integration (selected design; not implemented)

```text
server/services/articles/publishArticle.ts
server/services/articles/samePublicationContent.ts
app/composables/useArticleEditor.ts
tests/unit/publication-equality.test.ts
tests/integration/articles.test.ts
```

The existing publish handler can continue forwarding the service result. Keep toWriterArticle and shared WriterArticle unchanged; add no outcome field at any response boundary. No database helper or migration refactor.

## Phase 0: Research

[research.md](research.md) documents inspected paths, primary PostgreSQL sources, alternatives, equality rules, and fixture/race implications.

## Phase 1: Design and contracts

[data-model.md](data-model.md) gives the state/field-change matrix.
[contracts/publish.md](contracts/publish.md) specifies the unchanged response and selected feedback inference.
[constitution-alignment.md](constitution-alignment.md) provides the concrete governance/baseline change for review.
[quickstart.md](quickstart.md) maps all requirements to future evidence.

Next: reconcile baseline artifacts (T004), validate task completion gates, and record the human spec-first git checkpoint (T005) before code. Governance approval and task generation are not implementation or runtime verification evidence.

## Complexity Tracking

No additional service/table/cache/framework. Governance change is a required explicit redefinition of unconditional snapshot creation, not a hidden exception. Exact reference comparison keeps the implementation bounded to one article.
