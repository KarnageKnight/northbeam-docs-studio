# HTTP API Contract

**Date**: 2026-11-07
**Status**: Writer POST/list/detail, PUT draft, and Phase 6 POST publish endpoints are implemented and
verified, including complete payload validation, stale revision conflicts, and rollback.
Publish copies saved content into a numbered immutable snapshot and atomically updates
publication fields/counters/revision; republish preserves the first date. Phase 7 GET
`/api/public/articles` is implemented and verified with its exact live-only PublicSummary
projection and anonymous access. Phase 8 GET `/api/public/articles/:slug` is implemented
and verified with its exact live-only PublicDetail projection and identical 404 for
missing/draft-only/unpublished articles. Remaining endpoints are targets for later phases.

Authority: [specification](../spec.md) and [plan](../plan.md) P025–P033. The
[data model](../data-model.md) owns storage; this contract owns wire representations.
Assume one trusted writer with no authentication or tenancy.

## Conventions

Use JSON request bodies with `Content-Type: application/json`. Success responses are
direct objects or arrays, with no data wrapper. Empty collections are `[]`; deletion
returns 204 with no body. UUIDs are strings, revisions/version numbers are JSON numbers,
and present publication dates are ISO 8601 UTC strings.

The server validates request structure before lifecycle work. Writer UUIDs must be
syntactically valid; valid missing identifiers return 404. Unexpected body fields and
incorrect types return 400 without coercion. Creation-only nullable defaults are specified below.

## Routes and requests

Writer base: `/api/writer/articles`.

| Method | Suffix | Request body | Success |
| --- | --- | --- | --- |
| GET | `/` | None | 200, WriterSummary array |
| POST | `/` | Required title/slug; optional body/tags | 201, WriterArticle |
| GET | `/:articleId` | None | 200, WriterArticle |
| PUT | `/:articleId/draft` | title, body, tags, expectedRevision | 200, WriterArticle |
| POST | `/:articleId/publish` | expectedRevision | 200, WriterArticle |
| POST | `/:articleId/unpublish` | expectedRevision | 200, WriterArticle |
| GET | `/:articleId/versions` | None | 200, VersionSummary array |
| GET | `/:articleId/versions/:versionId` | None | 200, VersionDetail |
| POST | `/:articleId/versions/:versionId/restore` | expectedRevision | 200, WriterArticle |
| DELETE | `/:articleId/versions/:versionId` | None | 204, no body |

| Method | Public path | Success |
| --- | --- | --- |
| GET | `/api/public/articles` | 200, PublicSummary array |
| GET | `/api/public/articles/:slug` | 200, PublicDetail |

Creation body/tags omitted or null normalize to `""`/`[]`. Title and slug remain required.
Save replaces the complete draft: title/body must be strings and tags an array of strings;
null is not a save default. Slug is creation-only and rejected in save requests.
Publish/unpublish/restore accept only expectedRevision; deletion requires no caller revision.

## Validation

- Title: nonblank, maximum 200 Unicode code points.
- Body: maximum 100,000 code points. Draft body may be empty; publishing requires a
  nonblank saved body and title. Publication never implicitly saves browser content.
- Slug: trim/lowercase; 1–100 characters; lowercase ASCII alphanumeric groups with single
  separating hyphens. Reject invalid formats and normalized collisions without suffixing.
- Tags: normalize trim/lowercase, drop empties, deduplicate preserving first occurrence;
  maximum 10 normalized tags, each maximum 30 code points with slug-like characters.
- expectedRevision: nonnegative safe integer JSON number. Numeric strings, fractions,
  negatives, null, missing values, and unsafe integers are invalid.
- Malformed JSON, malformed writer UUIDs, and unexpected fields use VALIDATION_ERROR.

The input types are inferred from Zod schemas rather than separately maintained copies.

## Success representations

WriterArticle, shown as a newly created draft:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "slug": "getting-started",
  "status": "draft",
  "revision": 0,
  "draft": { "title": "Getting started", "body": "", "tags": [] },
  "publishedAt": null,
  "currentPublishedVersionId": null
}
```

| Representation | Fields |
| --- | --- |
| WriterSummary | id, slug, title from the draft, status |
| VersionSummary | id, versionNumber |
| VersionDetail | id, versionNumber, title, body, tags |
| PublicSummary | slug, title, tags, publishedAt |
| PublicDetail | slug, title, body, tags, publishedAt |

Statuses are draft, published, or unpublished. Publication reference/date start null,
then remain present after publication/unpublish. Public title/body/tags come only from
the live snapshot. Public body is Markdown source rendered by the shared UI renderer.
Public data includes no draft, internal ID/reference, revision, counter, or audit metadata.
Audit fields and the allocation counter are also absent from the approved writer shapes.

Snapshot lists order newest first by versionNumber. No scale pagination, search, tag
filtering, or cache contract is added. Other list ordering is not a required behavior.

## Errors

Use Nuxt's native error response, with these fields in its custom `data`:

```json
{
  "code": "VALIDATION_ERROR",
  "fieldErrors": { "title": ["Title is required."] }
}
```

This example is the custom data, not a replacement error envelope. fieldErrors is optional
and maps field names to arrays of safe validation messages. Nuxt owns other native fields.

| HTTP | Application code | Meaning |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Invalid input or ineligible blank saved content on publication |
| 404 | ARTICLE_NOT_FOUND | Missing writer article, or absent/draft-only/unpublished public article |
| 404 | SNAPSHOT_NOT_FOUND | Missing snapshot or snapshot owned by another article |
| 409 | STALE_REVISION | Expected revision does not match the locked article |
| 409 | SLUG_CONFLICT | Normalized slug already exists |
| 409 | SNAPSHOT_PROTECTED | Target is the current/retained publication reference |
| 409 | INVALID_PUBLICATION_STATE | Unpublish on draft-only or already-unpublished state |
| 500 | No required application code | Unexpected failure; generic native production response |

Request parsing/schema errors precede lookup. Then a missing article returns 404; for an
existing article, lock and compare revision before operation eligibility. Thus a well-formed
stale restore returns STALE_REVISION before checking its snapshot target, and stale publish/
unpublish returns it before body/state checks. Snapshot deletion has no revision check.

Expected failures are mapped through the approved code/status allowlist at the thin
HTTP boundary. Unexpected database/runtime failures retain native generic 500 handling;
do not return original database messages or arbitrary error data. No global renderer or
HTTP Problem Details envelope is introduced.

## Atomicity and client behavior

Save, restore, publish, and unpublish each advance revision exactly once on success,
including unchanged save/restore. Reads, rejected actions, and deletion do not advance it.
Each publication creates a new immutable snapshot, allocates a never-reused committed
number, and atomically changes article status/reference/date/revision/counter.

Restore accepts any retained owned snapshot and changes only draft fields/revision/audit
time. Unpublish preserves history, publication date, and reference. Delete rejects that
reference even while unpublished; eligible history deletion does not reset the counter.

Clients use the revision returned by a successful action. A conflict must preserve unsaved
editor text; it must not be retried automatically against a silently refreshed revision.
The [UI/service contract](ui-and-services.md) specifies the remaining responsibilities.
