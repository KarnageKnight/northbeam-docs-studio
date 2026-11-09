# Research: Northbeam Docs Studio

**Date**: 2026-11-07
**Status**: Research consolidated. The Phase 14 application passes build/typecheck,
99 unit tests, and 143 PostgreSQL/HTTP cases on macOS arm64 with Linux containers.
Production Docker migrations/startup, restart idempotence, failure/interrupt cleanup, and
overlap rejection were verified. Phases 1–13 are approved; [tabbed UI design](ui-design.md) is selected.
Writer create/list/open, draft saving/restart persistence, safe Markdown preview, and
two-tab save conflict/reload behavior are verified. Publish API atomicity and rollback/crash
recovery and the writer Publish UI are verified. Phase 7 is approved. Phase 8 is approved. Phase 9 is approved. Phase 10 is approved. Phase 11 is approved. Phase 12 deletion and writer slug URLs are approved. Phase 13 coordinated lifecycle races
and two-tab rejection/reload checks are approved. Phase 14 slug lifecycle checks pass;
human phase approval is pending. Later acceptance audits and Windows/Linux host execution remain future verification.

Public content is writer-published articles on any topic. Generic article wording is a
confirmed product clarification, with no change to lifecycle behavior or architecture.

The [plan](plan.md) records individual approvals P001–P077 and exact dependency pins.
The [specification](spec.md) owns observable requirements; the [assumptions register](assumptions.md)
records interpretations. The findings below resolve the planning unknowns without adding scope.

## Application and source organization

**Decision**: One Nuxt/Vue/TypeScript application serves UI and JSON HTTP routes. Thin
handlers validate requests and map failures to native HTTP responses. Ordinary lifecycle
functions own transactions, with one file per operation, a shared transaction helper,
and an imported shared Drizzle database instance.

**Rationale**: One local deployment, explicit boundaries, and small operation-focused reviews.
Shared DB configuration fits the selected single-database application.

**Alternatives**: Separate backend, handler-only business logic, one large operation module,
and passing the database through every call were considered and not selected.

## Incremental delivery

**Decision**: At the user's request, [tasks.md](tasks.md) now delivers each feature's
API, UI, feedback, and verification together, with approval between phases. UI design
precedes the first feature screen; shared foundation remains a prerequisite.

**Rationale**: Review usable behavior after each feature rather than waiting for a later
UI-building phase. Split bundled editor actions into their owning lifecycle phases.

**Alternative**: Completing all lifecycle APIs before connecting writer screens is no
longer the selected execution order. The application architecture/dependency pins are unchanged.

## Persistence and concurrency

**Decision**: Two tables, application-generated UUIDv4 IDs, text content, text-array tags,
integer revisions/version counters, and database timestamps. The [data model](data-model.md)
specifies all columns, constraints, audit updates, and state transitions.

Article writes use Read Committed transactions: lock the article, check its revision,
then check operation eligibility and mutate. Publish allocates its number from the locked
article counter; rollback undoes the allocation. Foreign keys enforce snapshot ownership
and reference protection; a trigger rejects snapshot updates. Application checks enforce
publication-state consistency, counter ranges, and content rules.

**Rationale**: Serialize same-article decisions while detecting stale callers; retain
ordinary PostgreSQL integrity checks without adding an enum, sequence, or role setup.

**Alternatives**: First-write conditional updates, stronger isolation, global sequences,
separate drafts, database enums, and additional state/range checks were not selected.
Separate runtime/migration roles are deferred, as approved in P022.

Evidence: [row locks](https://www.postgresql.org/docs/18/explicit-locking.html),
[Read Committed](https://www.postgresql.org/docs/18/transaction-iso.html),
[constraints](https://www.postgresql.org/docs/18/ddl-constraints.html),
[triggers](https://www.postgresql.org/docs/18/sql-createtrigger.html), and
[transaction timestamps](https://www.postgresql.org/docs/18/functions-datetime.html).

### Phase 2 SQLSTATE evidence

PostgreSQL 18.6 returned `23001` (`restrict_violation`) when deleting a referenced snapshot;
wrong-owner references return `23503`, uniqueness `23505`, required values `23502`, and
status CHECK rejection `23514`. The immutable-row trigger uses `55000`. Tests assert these
observed outcomes. Future lifecycle operations still perform the approved business checks;
constraint error handling must not assume all reference failures use the same SQLSTATE.
See [PostgreSQL error codes](https://www.postgresql.org/docs/18/errcodes-appendix.html).

## Writer browser identity

The user selected `/writer/articles/:slug/edit` instead of the internal article UUID in
browser links. Slugs are already unique and immutable. Keeping `/edit` distinguishes an
article with slug `new` from `/writer/articles/new`, the creation form. The writer-only
`GET /api/writer/articles/by-slug/:slug` returns the existing WriterArticle projection
for every publication state. Its UUID remains the identity for lifecycle/history APIs
and database relations; revision checks and public visibility are unchanged.

## API, validation, and errors

**Decision**: The [HTTP contract](contracts/http-api.md) uses explicit actions, JSON
`expectedRevision`, stable error codes in native Nuxt error data, and direct success
objects/arrays. Zod validates declared types and infers input types. The runtime remains
strict TypeScript; Unicode limits count code points rather than UTF-16 code units.

**Rationale**: Follow framework conventions and distinguish validation, missing resources,
and conflicts without a custom error envelope or global renderer.

**Alternatives**: tRPC, HTTP Problem Details, ETags, manual validation, and Valibot were
considered and not selected.

For pinned Nuxt 4.6.4, explicit imports from `nuxt/server` provide the native handler,
body, route, response, and error helpers. Use that import source consistently rather than
mixing event models. Its `createError` accepts `status`, `statusText`, and custom `data`;
deprecated status-name aliases need not become a project pattern. Normalize malformed JSON
and Zod failures to the approved validation code at the request boundary.

Evidence: [tagged server exports](https://github.com/nuxt/nuxt/blob/v4.6.4/packages/nuxt/src/server/index.ts),
[error implementation](https://github.com/nuxt/nuxt/blob/v4.6.4/packages/nuxt/src/app/error.ts),
[adapter dependencies](https://github.com/nuxt/nuxt/blob/v4.6.4/packages/nitro-server/package.json),
and [Zod requirements](https://zod.dev/).

Unexpected failures retain native production handling. Verify generic 500 responses
against the installed build; [maintained Nitro v2 production source](https://github.com/nitrojs/nitro/blob/v2/src/runtime/internal/error/prod.ts)
supports this design but is not a substitute for the pinned application's HTTP tests.

## Markdown and UI

**Decision**: Shared markdown-it rendering with raw HTML treated literally and the approved
link allowlist. Use `MarkdownContent.vue` in preview/public pages, local editor state in
`useArticleEditor()`, separate form/history components, and a dedicated creation page.
Use universal rendering and Tailwind's official Vite integration.

**Rationale**: Keep rendering behavior identical, isolate local edits from fetched state,
and reuse the selected framework/build pipeline.

**Alternatives**: Marked, Pinia, client-only rendering, plain CSS, PostCSS integration,
and inline form/history presentation were not selected. Limited raw HTML is deferred.

markdown-it 15 includes TypeScript declarations, so a separate types package is unnecessary.
Evidence: [tagged manifest](https://github.com/markdown-it/markdown-it/blob/15.0.3/package.json),
[Tailwind Nuxt recipe](https://tailwindcss.com/docs/installation/framework-guides/nuxt),
and [Vite plugin requirements](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.5/packages/%40tailwindcss-vite/package.json).

## Runtime and dependency baseline

**Decision**: Use the exact pins in P069, Node 24.22.2/Bookworm slim, PostgreSQL
18.6/Bookworm, and pnpm 12.18.0. Provision pnpm with npm during image builds and install
project dependencies with the frozen lockfile. Use Nuxt's typecheck command separately
from the production build and suite.

**Rationale**: One recorded stable baseline, explicit upgrades, and compatible declared
runtime/peer ranges. The approved Drizzle ORM/Kit pair shares compatibility API 10;
do not substitute current RC examples for its stable API.

**Alternatives**: Alpine, Node 26, PostgreSQL 17, version ranges, standalone pnpm
provisioning, and direct vue-tsc invocation were not selected.

Evidence and exact versions are consolidated in [P069](plan.md#approved-dependency-pin-matrix-p069).
Metadata review proves declared-range alignment, not application execution or lockfile resolution.

## Host development

**Decision**: Add `pnpm dev` for native Nuxt UI/API development against host-accessible
PostgreSQL, as explicitly requested in P077. Configure DATABASE_URL and apply migrations
before starting; locally installed PostgreSQL permits a completely Docker-free dev workflow.

**Rationale**: Reuse the Nuxt development server for hot reload and direct local feedback.
The existing Docker deployment and integration-test workflows remain in place.

**Alternative**: Docker-only development no longer meets the user's requested workflow.
No new runtime, database abstraction, or development-server dependency is needed.

Evidence: [Nuxt development CLI](https://github.com/nuxt/cli/blob/main/docs/dev.md).
The [quickstart](quickstart.md) documents planned commands; execution remains unverified.

## Local startup and verification

**Decision**: Working Compose defaults with optional overrides; app migrations run before
serving. Preserve app data in a named volume at PostgreSQL 18's `/var/lib/postgresql`.
Tests use a fixed separate project, fresh database per run, sequential cases, and explicit
two-table truncation. A Node runner rejects overlaps and owns test-only cleanup.

**Rationale**: One-command reviewer startup and real lifecycle evidence without database
installation on the host or another orchestration library.

**Alternatives**: Separate migration job, mandatory `.env`, Testcontainers, per-worker
databases, generated project names, ordered row cleanup, and separate platform scripts
were considered and not selected.

Evidence: [PostgreSQL image storage](https://github.com/docker-library/docs/blob/master/postgres/README.md),
[Compose startup ordering](https://docs.docker.com/compose/how-tos/startup-order/),
[project isolation](https://docs.docker.com/compose/how-tos/project-name/),
[profiles](https://docs.docker.com/compose/how-tos/profiles/), and
[TRUNCATE semantics](https://www.postgresql.org/docs/18/sql-truncate.html).

The [quickstart](quickstart.md) defines expected procedures and evidence. There are no
remaining architecture questions in this research. The user requested decomposition into
[tasks.md](tasks.md); cross-artifact analysis and the human git
checkpoint were verified before the user-authorized Phase 1 code. Current implementation evidence is recorded in
[quickstart.md](quickstart.md); later implementation waits for human phase approval.


## Phase 5 renderer and editor verification

The approved markdown-it 15.0.3 dependency is installed with bundled TypeScript types.
The shared renderer disables embedded HTML, linkification, and typographer transforms.
Its link validator allows HTTP/HTTPS/mailto and relative paths/headings, rejects unsafe
or scheme-relative URLs, and checks percent-decoded schemes. HTML is rendered literally.
The [markdown-it API documentation](https://markdown-it.github.io/markdown-it/) describes
renderer options and link validation. Unit cases verify the application policy rather
than relying on the library defaults alone.

The editor uses the shared component through Nuxt's `#shared` alias. Browser checks against
a production Docker app verify unsaved preview, two-tab conflicts, explicit confirmed
reload/cancel/resubmit, and newer local text surviving a paused save response. No renderer,
state-management, or browser-testing framework beyond the approved choices was introduced.


## Phase 6 atomic publication evidence

The existing transaction helper now supports Publish as well as Save. Tests inject a
failure after snapshot insertion and observe complete rollback of first/republish state.
An independent PostgreSQL connection holds a test-only advisory-lock barrier reached by
an AFTER INSERT trigger; actual blocking precedes SIGKILL. After restart the transaction
is absent and publication recovers with the original version allocation. All fixture
triggers/functions/locks are removed; production code contains no test hook.

Browser checks on the production Docker build also verify stale-publish feedback,
reload/cancel/resubmit, newer edits surviving a delayed publish response, and a subsequent
save using its returned revision. SQL confirms saves leave the live snapshot unchanged.
No architecture/pattern/dependency change was needed.


## Phase 7 public list evidence

The public list uses one Read Committed statement joining the published article to its
owned current immutable snapshot. Its narrow four-field projection follows the existing
summary-query pattern and prevents body/draft/internal fields from entering the response.
Existing tests now prove empty/live-only responses, private-content exclusion, save/live
isolation, republish/date retention, safe server-rendered text/links, unchanged audits,
and restart persistence. Browser checks verify the approved list and fetch feedback at
mobile/desktop widths. Phase 8 now implements detail destinations; no additional architectural
choice or dependency was needed.


## Phase 8 public detail evidence

The detail read follows the public list's one-statement owned-current-snapshot join,
adding a bound slug predicate and live body to the narrow response. All unavailable
states return the same 404. The page imports the existing MarkdownContent component;
no second renderer, sanitizer, or policy was introduced. Native Nuxt setResponseStatus
was checked in the installed pinned implementation/types and used for friendly SSR 404.

Existing integration cases now cover exact detail fields, safe server Markdown, unchanged
read state, private draft isolation, republish/date retention, restart, and matching API/
page 404. Real-browser checks also verify matching preview output, navigation, fetch
retry/loading, responsive code containment, and 44px back navigation. No new architecture
choice or dependency was needed; Phase 9 subsequently implements Unpublish.


## Phase 9 Unpublish evidence

Unpublish reuses the locked expected-revision transaction and native errors. It changes
only publication status/revision/update time, retaining history/reference/date/counter and
draft. Existing public fixtures now use the actual API. Tests prove public exclusion/404,
stale-before-state ordering, invalid states, rollback, restart, and republish/date retention.

The writer action retains the local buffer unconditionally while updating saved state;
it never implicitly saves dirty content. Browser checks prove before/in-flight edit
retention, conflicts with explicit reload/cancel/resubmit, network retry, invalid-state
feedback, public navigation, and responsive action layout. No new abstraction, library,
or persistence decision was needed; Phase 10 subsequently adds read-only history.


## Phase 10 read-only history evidence

History summary/detail queries use approved narrow projections and snapshot ownership.
Ordering uses version number rather than UUID or audit timestamp. Existing integration
coverage now verifies empty drafts, published/unpublished inspection, exact fields, UUID
validation, missing/wrong-owner distinctions, unchanged stored/public state, and restart.

ArticleHistory follows the approved component/composable boundaries and reuses the shared
renderer. Initial native fetches are created together before awaiting to preserve Nuxt
context and SSR hydration; manual initial refresh had produced browser mismatches and was
replaced by native payload hydration. Browser checks verify no final hydration/runtime
errors, local text retention, snapshot/public isolation, refresh/retry/loading behavior,
missing-version feedback, retained labels, and mobile controls. No new library, architecture,
or persistence decision was required; Phase 11 adds Restore and Delete remains subsequent work.


## Phase 11 Restore evidence

Restore reuses the article-first revision transaction and resolves snapshot ownership
through that same transaction. It copies only saved snapshot content into draft/revision/
update time. Tests prove unchanged publication/history/counter/date, old/current/identical
and unpublished retained targets, stale-before-target errors, rollback, and restart.

The selected-snapshot action follows existing page confirmation and composable write
patterns. It captures the named target for dirty confirmation, uses explicit expectedRevision,
and shares response-baseline handling so newer local edits survive delayed success.
Browser checks verify cancel/confirm, stale/missing/network recovery, subsequent explicit
Save/Publish, unchanged public/history, and responsive controls without hydration/runtime
errors. No new architecture choice, library, or database change was required.


## Phase 12 deletion evidence

Delete uses its approved article-first transaction without a caller revision. It checks
owned snapshot existence and the locked current/retained reference, retaining the restrictive
FK as protection. It never updates article fields/audits/counter; later publication uses
the stored allocation instead of deriving it from remaining rows. Tests cover eligible/
protected states, target validation, empty 204, unchanged public/article state, rollback,
restart, and deleted-target inspection/Restore rejection.

The history action follows existing confirmation/composable patterns, preserving local
text and saved revision even during delayed responses. Browser checks verify labels,
cancel/confirm, missing/protected/network recovery, number preservation, public isolation,
and responsive controls without hydration/runtime errors. No new architecture or library
was needed; coordinated lifecycle races were subsequently verified in Phase 13 below.


## Phase 13 concurrency evidence

The existing suites now verify shared rejection behavior and nine deterministic overlap
cases using the approved PostgreSQL row-lock/independent-connection approach. The test-only
controller holds the article row; actual blocking and three distinct backend PIDs establish
request order and overlap before release. No application hook or timing-only race was added.
Same-revision contenders produce exactly one success and one stale conflict. Publish/delete
and restore/delete follow both serialized orders while preserving ownership, snapshots,
public isolation, first dates, counters, revisions, and audit values. All requests finish
before fixture reset and barriers are released in cleanup.

Four two-tab Chrome cases preserve input typed while stale responses are paused, prove no
automatic write retry or SQL/public mutation, and verify reload cancel/confirm followed by
explicit resubmission. No runtime/hydration errors occurred. Full suite: 98 unit + 131
PostgreSQL/HTTP cases; build and typechecks pass. No production or architectural change was
needed. The user subsequently approved Phase 13 and authorized Phase 14.


## Phase 14 slug evidence

Existing unit and HTTP cases now cover normalized one/100-character boundaries, malformed
slug formats, exact/normalized collision rejection in every publication state, and rejected
slug edits. Complete SQL/audit/history/public comparisons prove rejections make no changes.
Existing lifecycle/restore/restart cases verify the original stored slug and writer lookup.

The competing-create case now pauses the first uncommitted row after insertion using the
existing test-only advisory-lock pattern and observes a second backend waiting on that
transaction's uniqueness enforcement. Three distinct PIDs prove overlap. Exactly one 201
and one 409 SLUG_CONFLICT leave one unsuffixed article; requests, locks, and fixture DDL
are cleaned before later tests. No new test framework or application hook was introduced.

Chrome/SQL confirms collision messages/input retention across states, recovery with a new
slug, boundary-length creation/redirect/load/save, fixed slug SQL/URLs/display throughout
lifecycle actions and reload, and the 100-character slug at 390px. No runtime/hydration
errors occurred. Build/typechecks and 99 unit + 143 PostgreSQL/HTTP cases pass (242 total).
No production or architecture change was needed. Phase 14 awaits human approval.
