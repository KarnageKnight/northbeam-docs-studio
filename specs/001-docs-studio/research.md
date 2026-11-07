# Research: Northbeam Docs Studio

**Date**: 2026-11-07
**Status**: Research consolidated. The Phase 4 application passes build/typecheck,
48 unit tests, and 60 PostgreSQL/HTTP cases on macOS arm64 with Linux containers.
Production Docker migrations/startup, restart idempotence, failure/interrupt cleanup, and
overlap rejection were verified. Phases 1–3 are approved; [tabbed UI design](ui-design.md) is selected.
Phase 4 writer create/list/open and restart persistence are verified; later lifecycle/UI
features and Windows/Linux host execution remain future verification.

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
