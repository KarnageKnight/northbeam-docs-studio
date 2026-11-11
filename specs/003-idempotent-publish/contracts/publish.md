# Idempotent Publish: Proposed Contract

**Date**: 2026-11-09 | **Status**: Option B selected by the user on 2026-11-09; US1 implemented and verified on 2026-11-11; reactivation remains planned.
Use [spec](../spec.md) and [model](../data-model.md); reconcile [baseline contract](../../001-docs-studio/contracts/http-api.md) before implementation.

## Route and request

Existing POST /api/writer/articles/:articleId/publish, JSON body {expectedRevision: nonnegative safe integer}. No new body fields, optional flags, idempotency keys, coercion, or endpoint. Strict request validation and article UUID handling remain.

Continue 200 for every successful outcome. Keep existing 400 invalid input/publish content, 404 missing article, 409 stale revision, and generic 500 unexpected/integrity failures. Stale requests cannot return unchanged success because content happens to match.

## Selected response: existing WriterArticle (option B)

Return exactly the existing direct WriterArticle object. Add no publicationOutcome, wrapper,
PublishResult type, internal audit metadata, or duplicated content. Other lifecycle/load
responses and snapshot history/detail endpoints remain unchanged.

The server compares saved content inside the locked transaction and returns only after
commit. The UI does not fetch snapshot content or perform a second publication-equality check.

## Feedback inference

Before sending Publish, capture immutable values from the saved article used for expectedRevision:
prior status and currentPublishedVersionId. On a successful response, classify before calling
acceptSaved or overwriting local article state:

| Successful response compared with captured state | Feedback category |
|---|---|
| Returned currentPublishedVersionId differs from prior reference (including null on first publication) | New version created |
| Same reference and prior status was unpublished | Retained version reactivated |
| Same reference and prior status was published | Already published, unchanged |

A valid success is published and has a non-null reference. Impossible combinations are not
silently labeled unchanged. Do not infer a successful result from 400/404/409/500, a failed
request, or a later history-refresh response. Retain expected-revision checks and retry:0.

A successful request operates against the captured revision; an intervening state-changing
write before its locked check returns conflict. Later writes after its commit do not rewrite
what that particular request accomplished. Messages describe the completed request, not a
real-time guarantee about current public availability.

**Decision rationale**: Avoid adding response data that is reliably derivable from existing
state. Explicit outcome fields and response wrappers were considered and not selected.

## Editor feedback

Retain explicit save-before-publish, pending/conflict guards, retry:0, and acceptSaved delayed-typing preservation. Replace the hardcoded new-version success message:

| Outcome | Feedback |
|---|---|
| created | Article published. A new version was created. |
| unchanged | This content is already published. No new version was created. |
| reactivated | Article republished using its last-published version. |

Do not compare unsaved browser content on the server or auto-save on Publish. Keep success/failure text accessible through existing status/alert patterns. History refresh may continue for all successful outcomes without creating a version. Reads failing after a successful publication must not imply that committed publication rolled back; expose secondary refresh failure through history state where feasible.

## Concurrency and retries

Same-revision state-changing attempts: one success, others stale. Concurrent unchanged attempts may all return unchanged. No-op followed by Save/Unpublish can both succeed; reversed ordering gives Publish stale conflict. No current reference can become deletable through reuse.

A lost state-changing response followed by retry with old revision still returns 409. Explicit reload then retry can return unchanged. This feature prevents redundant saved-content snapshots; it is not request replay idempotency.

## Equality and validation

Title/body compare exact stored text; normalized tag membership ignores order. Reusing a snapshot preserves public tag order and saved draft order. New snapshot copies saved order. Validation precedes unchanged success; invalid draft or inconsistent ownership/reference fails without changes.
