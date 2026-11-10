# Implementation Plan: Northbeam Docs Studio

> **003 amendment — 2026-11-10 (approved, not implemented):**
> The [003 spec](../003-idempotent-publish/spec.md) and constitution 3.0.0 supersede unconditional
> snapshot creation/revision advancement with create, no-op, and reactivation outcomes.
> Original implementation descriptions and dated evidence below remain historical, not 003
> verification. [003 tasks](../003-idempotent-publish/tasks.md) track the new work. Windows T028 remains
> unchecked and unverified; its approved deferral now includes 003.

**Feature**: `001-docs-studio` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Status**: Phases 1–14 approved. The user authorized one-shot execution through Phase 17
on 2026-11-08, including intermediate gates. Integrated interface acceptance and the final
audit/documentation are verified. Linux-client Docker acceptance and macOS host development
pass; Windows T028 remains open, so Phase 16 and FR-013/SC-005 are not fully verified.
Phase 18 review work is verified, approved by the user on 2026-11-08. The spec-first checkpoint was verified before code without git
commands. Feature identifier `001-docs-studio` does not establish a branch name;
architecture decisions P001–P077 remain authoritative.

## Summary

The public portal presents articles published by writers on any topic. Public UI copy
and sample content use generic article language; the product name and architecture remain
Northbeam Docs Studio and the previously approved design.

Build the approved API and minimal writer/public UI as one Nuxt application (a monolith),
using Vue, TypeScript, and PostgreSQL. This application boundary is approved to reduce complexity.
Keep draft edits isolated from immutable published snapshots. Enforce atomic publication,
preserved first-publication dates, protected snapshot deletion, non-destructive restoration,
and stale-write rejection. Verify lifecycle invariants against real PostgreSQL.

Docker Compose for both the application and database, persistent database storage, and
`docker compose up --build` on Linux and Windows PowerShell are already approved.
The app startup entry point applies migrations before starting Nuxt, approved in P054.
The [assumptions register](assumptions.md) records the approved application boundary and
thin-handler/lifecycle-function separation under P002. Configuration is consolidated in P076.
Further NFR discussion was set aside at the user's request; this plan adds no new NFR targets.

## Technical Context

**Language/Version**: TypeScript approved (P001), pinned to `6.0.3` with `vue-tsc` `3.3.14`
and Nuxt's typecheck command (P068). Node.js 24 LTS approved (P052), pinned
to `24.22.2` with `node:24.22.2-bookworm-slim` (P063). Node containers use the Debian slim
baseline (P059) and a multi-stage Docker build (P060).
Nuxt 4.6.4 requires Node 24.15.0 or newer within the chosen Node 24 line (P062).
Remaining direct package pins are approved in P069; application compatibility verification
follows during scaffolding.

**Package Management**: pnpm approved (P021), pinned to `12.18.0` (P065), with
`pnpm-lock.yaml`. Containers provision it with npm under P066. Direct package versions
are exact; Docker installs use `--frozen-lockfile` under P061.

**Primary Dependencies**: Nuxt 4.6.4 approved (P062); Vue 3.5.45 approved (P067).
Thin API handlers call shared lifecycle
functions that own business rules and transactions. Drizzle ORM with the `pg` driver and
Drizzle Kit migrations approved (P003). markdown-it approved for shared preview/public
rendering (P011). Zod approved for runtime request validation (P012). A JSON HTTP API using
Nuxt's native server handlers and the writer/public route map are approved (P024 and P025).
Native Nuxt API errors and writer request-body fields/defaults are approved (P026 and P028).
Writer article responses/revisions, read-response shapes, and custom error codes/data are
approved (P029–P031). Nullable creation defaults and request validation are approved (P032/P033).
Editor state uses local Vue reactivity and native Nuxt fetching, approved in P048, with
state/actions organized in `useArticleEditor()` under P071.
Tailwind CSS is approved for UI styling and bootstrapping (P049), with the official Vite
integration approved in P070.
Nuxt's default universal rendering is approved (P050).
Exact versions are approved in P069. The [research](research.md) resolves version-specific
APIs; the [HTTP contract](contracts/http-api.md) defines strict Zod validation and errors.

**Storage**: PostgreSQL with TypeScript schema definitions in Drizzle and SQL migrations
managed through Drizzle Kit approved. Two tables approved (P006): `articles` stores metadata
and editable draft fields; `article_versions` stores immutable snapshots. PostgreSQL 18 is
approved (P053), pinned to `18.6` with `postgres:18.6-bookworm` for application and test
databases (P064). Column definitions, constraints, and audit timestamps are approved in
P075; migration configuration is consolidated in P076 and [quickstart.md](quickstart.md).
Transactional article-row locking and revision checks are approved (P007); the JSON revision
protocol and stale-request `409 Conflict` response are approved (P008). Snapshot version
numbers use a transactional per-article counter (P009). A composite foreign key with restrictive
deletion enforces published-snapshot ownership and reference protection (P010).
An update-rejecting database trigger enforces snapshot immutability (P022).
Article status uses text with a CHECK constraint permitting `draft`, `published`, and
`unpublished` (P023).
Lifecycle transactions use Read Committed isolation with the approved locks and revision
checks (P013). Article and snapshot primary keys use PostgreSQL's `uuid` type (P014);
UUIDs are generated by the Nuxt server before insertion (P015), using UUIDv4 through Node's
built-in `crypto.randomUUID()` (P016). Draft and snapshot tags use PostgreSQL `text[]` (P017).
All planned columns are NOT NULL except the article publication date and snapshot reference
(P040); empty body/tags use an empty string/array.

**Testing**: Vitest approved (P004), with separate database-free unit tests, PostgreSQL
integration tests, and one full-suite entry point (P018). Real PostgreSQL with application
migrations and independent connections for concurrency tests is required. Compose test database
and runner services are approved (P019). Integration tests use one disposable database per
run with sequential cases (P020), truncating both application tables between cases (P055).
Test runs use a fixed dedicated Compose project name and must not overlap (P056).
A single Node.js script orchestrates integration-test startup and cleanup (P057).
Vitest/Vite pins are approved in P069. P076 and [quickstart.md](quickstart.md) define
real HTTP/SQL verification, commands, resource ownership, readiness, reset, and cleanup.

**Target Platform**: Local Docker Compose startup from Linux and Windows PowerShell.
Host Nuxt development through `pnpm dev` with configured PostgreSQL is approved in P077.
PostgreSQL readiness, app-entry-point migrations, and Nuxt startup are ordered under
P054. Images and service configuration are approved through P076. Actual startup on each
platform remains to be verified during implementation and reported explicitly.

**Project Type**: Approved monolith: one Nuxt application serves the Vue writer/public UI
and API. PostgreSQL runs as a separate Compose service. No separate backend service.

**Performance Goals**: No new targets adopted in this planning draft; NFR review set aside.

**Constraints**: Roughly 24 focused hours, small reviewable tasks, human architecture
selection and commits, passing production build and tests after scaffolding, and synchronized
documentation. Preserve spec-before-implementation history through human-created commits.

**Scale/Scope**: One trusted writer, anonymous readers, FR-001 through FR-014 and SC-001
through SC-006. Required field limits and lifecycle rules remain those in the spec.

## Constitution Check

Post-design review against [constitution v1.5.0](../../.specify/memory/constitution.md)
found no design exception. The artifacts describe the required protections and verification;
execution evidence follows implementation.

| Principle | Planning obligation | Current status |
| --- | --- | --- |
| I. Specification before implementation | Complete and review spec, plan, and tasks before code; human records git checkpoint. | Spec, design, tasks, and analysis recorded; the spec-first checkpoint was verified before the authorized Phase 1 implementation. Phases 1–14 approved; execution through Phase 17 authorized; Write/Preview tabs selected. |
| II. Draft and snapshot isolation | Public reads use live snapshots; immutable history and referenced-snapshot protection. | Data model and contracts specify table separation, immutable-row trigger, owned reference, and retained-reference deletion protection. |
| III. Atomic lifecycle and concurrency | Transactional publication and revision checks; no partial state or stale overwrites. | Contracts specify article-first locking, revision-before-eligibility ordering, transactional allocation, rollback, and SQL constraints. |
| IV. Database-backed evidence | Real PostgreSQL lifecycle/failure/race tests; passing build and suite once scaffolded. | Quickstart maps invariants to real HTTP/SQL evidence, independent connections, rollback and restart checks. Build/typecheck, 99 unit cases, and 143 real PostgreSQL/HTTP cases pass, including normalized slug collisions/immutability/boundaries, observed competing inserts and lifecycle contention, both delete-race orders, rollback/crash recovery, restart, and safe rendering. Final acceptance/platform audits remain. |
| V. Small reviewable changes | Small scoped tasks, verification, explanation, human review, and no AI commits. | Implement one small task at a time; keep subsequent tasks separate unless explicitly requested together. Leave changes for human review and approval. 38 tasks verified; Windows T028 open; Phase 18 review prepared; final review approved on 2026-11-08. One-shot execution through Phase 17 was explicitly authorized; no AI commits. |
| VI. Human architecture decisions | Present alternatives and record each human selection before dependent work. | P001–P077 record selections and rationale; consolidated artifacts received final review approval on 2026-11-08. |
| VII. Consistent patterns | Establish approved patterns and reuse them across implementation tasks. | UI/service contract fixes shared validation, handlers/errors, transaction helper, data access, renderer, and local-state patterns. |

Do not treat this design review as evidence that application behavior has passed checks.

Follow constitution v1.5.0: implement one small task at a time, run the required checks,
and explain changes, results, and limitations at each task boundary. Subsequent tasks
remain separate unless the user explicitly requests them in the same prompt. Leave all
changes uncommitted for human review and approval. Architecture/pattern changes, the
spec-first human checkpoint, and T035's UI-design approval retain their specific gates.

The user additionally requires human approval between phases. After all tasks and checks
for a phase are complete, present its changes, acceptance evidence, documentation updates,
and remaining issues, then stop. Wait for explicit approval of that phase before starting
the next. Record phase approval separately from task completion in `tasks.md`; phase
corrections require renewed verification and review. This applies to all 18 phase sections,
including Phase 3 (UI design) and Phase 18 (final delivery review). Individual tasks within a phase continue to
follow constitution v1.5.0. The constitution itself is unchanged.

## Project Structure

### Documentation (this feature)

Existing: `spec.md`, `assumptions.md`, `checklists/requirements.md`, and this `plan.md`.
Generated design artifacts:

- [research.md](research.md): decisions, rationale, alternatives, and primary sources.
- [data-model.md](data-model.md): fields, constraints, validation, and transitions.
- [contracts/http-api.md](contracts/http-api.md): requests, responses, errors, and concurrency.
- [contracts/ui-and-services.md](contracts/ui-and-services.md): UI and internal module responsibilities.
- [quickstart.md](quickstart.md): verified foundation commands and future feature acceptance procedures.

[tasks.md](tasks.md) contains 39 dependency-ordered tasks across all 14 stories, with
verification and human review gates. T001–T027 and T029–T039 are verified
and checked (38 tasks). Windows T028 remains open; Phase 18 T033/T034 review work is verified.
The user authorized execution through Phase 17 without additional intermediate gates.

### UI design review before page implementation

The user approved adding a separate UI design task. T035 is approved in
[ui-design.md](ui-design.md) with wireframes for all five screens, basic Tailwind visual
guidance, responsive behavior, and required interaction/feedback states. The user selected Write/Preview tabs on 2026-11-07
in one full-width panel at all screen widths, with history below. Switching tabs preserves
local edits, dirty state, saved revision, and feedback; it never saves or publishes.
Shared visual guidance and lifecycle behavior remain selected. Writer create/list/open
and editing/preview/save/Publish/public list are implemented; public detail is verified; Unpublish and read-only history are implemented; Restore and eligible Delete are implemented; final acceptance remains future work. Routes, component boundaries, and lifecycle rules remain those
in the existing contracts. Target 30–60 minutes for design and review within the agreed overall budget.

Execute T035 immediately after the foundation (Phase 3), and obtain explicit human
design approval before the first writer screens in T022. Existing IDs remain stable;
phase order in the task list defines execution, not numeric ID order. The wireframes
are approved; no application UI code is created in this design phase. Later visual changes
require approval.

The user explicitly approved the final rendered Deloitte-inspired black/white/green
theme with Write/Preview tabs on 2026-11-07 after reviewing the mockups.
Use `#86BC25` accents with black button text, darker green links/focus, near-black navigation
and heading surfaces, and white cards. Retain the Northbeam identity and selected tabs;
this is a visual change without new routes, libraries, or lifecycle behavior. Detailed
palette guidance and its source are recorded in [ui-design.md](ui-design.md).

The user requested an explicit Public / Writer switch in the shared top header.
Use segmented navigation links to the existing `/` and `/writer/articles` routes, highlight
the current portal on every screen, and retain the switch on mobile. This adds no routes,
authentication behavior, or dependencies.

The user also requested rendered visual designs. The isolated
[offline preview](design-preview/index.html) and linked screenshots show only the approved design
across the five screens, responsive widths, and feedback states. This extends T035
without changing application architecture, routes, dependencies, or APIs. The Write/Preview tabbed editor is
the selected design. Prototype browser verification is recorded in [ui-design.md](ui-design.md).

### Initial migration verification order

To resolve analysis finding U1, T003 generates/reviews the schema, SQL, and migration
metadata without connecting to PostgreSQL or initializing the application pool. Its
completion evidence is generation/review, typechecking, and the existing build/unit suite;
database enforcement is not yet claimed. T004 supplies the app image and first applies
those migrations using the installed CLI through the existing app startup entry point,
connecting to private `db:5432` on the Compose network. Direct constraint/trigger checks use
PostgreSQL tools inside the db container. T005 automates the same assertions against the
isolated test database. All three tasks' evidence is recorded and Phase 2 is approved.

This sequencing needs no host database port, locally installed PostgreSQL, or extra service.
The separate P077 host-development workflow still uses a host-accessible database when chosen.
Drizzle distinguishes [schema-based SQL generation](https://orm.drizzle.team/docs/drizzle-kit-generate)
from applying migrations; retain the approved stable CLI pin and reviewed migration format.

### Feature-by-feature implementation

The user requires each feature's API, UI, feedback states, and meaningful verification
in the same phase. After foundation and design, deliver create/open draft, editing with
preview, publishing, public list, public detail, unpublish, history inspection, restore,
and deletion as separate usable increments. Demonstrate each phase and obtain human
approval before starting the next. Shared runtime/schema/test infrastructure comes first;
no complete business-API layer or unused UI skeleton is built in advance.

Writer listing/creation moves into US1; editing/preview and immediate conflict feedback
into US2; Publish into US3; Unpublish into US4; history inspection into US5; Restore into
US6; and Delete into US7. Public API/page tasks remain together in US9/US10. US12's later
phase reviews the already-integrated screens; US8/US11 extend concurrency/slug evidence
already introduced with each affected feature rather than postponing correctness.

T013 now provides the shared renderer for editor preview. T039 implements the later
public detail page with the same component. T024/T025 are narrowed to Publish and history
inspection; T036–T038 split Unpublish/Restore/Delete UI work into their owning features.
These four new task IDs split existing scope; no architecture or product scope changes.
The full dependency and acceptance map lives in [tasks.md](tasks.md).

### Source Code (repository root)

Target layout, derived from the approved boundaries. The Phase 2 scaffold/persistence/test subset now
exists; remaining feature modules are planned and are added only with their owning task.
The contracts describe responsibilities, and helpers are added only when first used.

```text
app/
├── app.vue
├── assets/css/main.css
├── pages/                      # Five pages mapped in the UI contract
├── components/
│   ├── ArticleEditorForm.vue
│   ├── ArticleHistory.vue
│   └── MarkdownContent.vue
└── composables/useArticleEditor.ts
shared/
├── types/articles.ts
└── utils/markdown.ts
server/
├── api/                        # Twelve method-specific routes in the HTTP contract
├── db/
│   ├── client.ts
│   └── schema.ts
├── validation/articles.ts
├── utils/api-errors.ts
└── services/articles/
    ├── createArticle.ts
    ├── saveDraft.ts
    ├── publishArticle.ts
    ├── unpublishArticle.ts
    ├── restoreDraft.ts
    ├── deleteSnapshot.ts
    ├── queries.ts
    ├── withArticleTransaction.ts
    └── toWriterArticle.ts
tests/
├── unit/
└── integration/
scripts/test-integration.mjs
drizzle/                       # Versioned SQL and migration journal
drizzle.config.ts
nuxt.config.ts
vitest.config.ts
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
Dockerfile
compose.yaml
.env.example
README.md
```

The two Drizzle table definitions share `server/db/schema.ts`, approved in P046.
Article request schemas and shared field rules use `server/validation/articles.ts`, approved
in P047.
Editor preview and public article bodies share `MarkdownContent.vue`, approved in P051.
Editor state and API actions use `app/composables/useArticleEditor.ts`, approved in P071.
Editor presentation uses `app/components/ArticleEditorForm.vue` and
`app/components/ArticleHistory.vue`, approved in P072.
Article creation uses a dedicated page, approved in P073. Browser URLs and their Nuxt
page source paths are approved in P074.

Remaining implementation details follow these contracts and existing patterns. A change
to an approved architectural boundary still requires human selection before dependent code.

## Architecture Review

The application boundary (P002) is approved: the user selected option A.

| Option | Proposal | Tradeoff |
| --- | --- | --- |
| A | One Nuxt application serves the Vue UI and server API, with PostgreSQL as a separate Compose service. | One application build and runtime; UI and API share a deployment lifecycle. |
| B | Nuxt serves the UI; a separate backend application serves the API and accesses PostgreSQL. | Independent backend boundary; another application build, runtime, and connection to configure. |

**Decision**: A — one Nuxt application (a monolith) for the UI and API, with PostgreSQL
as a separate service. The user chose this approach to reduce complexity: one application
build and runtime, with fewer service boundaries to configure and maintain. Option B was
not selected. This decision approves only the application boundary. Language and internal
layering and database tooling are approved separately below; API contracts are consolidated
in [contracts/http-api.md](contracts/http-api.md).

**Evidence**: Nuxt registers files in `server/api`, `server/routes`, and `server/middleware`
as server handlers. See the [official Nuxt configuration documentation](https://github.com/nuxt/nuxt/blob/main/docs/4.api/6.nuxt-config.md).
The simpler local setup recommendation is a project-specific judgment, not a framework guarantee.

### Application Language (P001)

**Decision**: TypeScript, approved by the user as option A. JavaScript was considered as
option B for less type syntax and was not selected. Node.js 24 LTS is approved in P052;
the exact runtime patch/image are approved in P063. TypeScript and typechecking versions
are approved in P068; other direct package pins are approved in P069.

**Rationale**: Static checks help catch mismatched data structures before runtime; requires type annotations.

### Internal Layering (P002)

**Decision**: Thin API handlers handle request parsing, request-shape validation, and HTTP
responses. Shared lifecycle functions own application rules and database transactions.
The user selected option A after reviewing the responsibilities and publish example.

**Rationale**: Keep lifecycle rules together and testable without HTTP plumbing, with a small
separation between files. Lifecycle tests still use real PostgreSQL; handler verification
covers the request/response behavior. Ordinary TypeScript functions are sufficient for
this separation. Lifecycle operation files are approved in P043; remaining paths and
function contracts are consolidated in [contracts/ui-and-services.md](contracts/ui-and-services.md).
Database tooling is approved separately below.

**Alternative considered**: Option B placed lifecycle logic directly in API handlers for
fewer initial layers, at the cost of coupling HTTP handling and transaction logic. Not selected.

### Database Tooling (P003)

**Decision**: Drizzle ORM with the `pg` driver and Drizzle Kit migrations, approved by the
user as option A. Runtime migration execution uses the Drizzle Kit CLI under P058;
exact versions are approved in P069; migration configuration is consolidated in P076.

**Rationale**: Define schemas in TypeScript and use an SQL-oriented API to express complex
queries. The user prefers this combination over Prisma's model-definition workflow.
The tradeoff is learning Drizzle's schema and query APIs.

**Alternatives considered**: Direct SQL through `pg` (option B) offers explicit queries but
requires more manual query/result typing and separate migration tooling. Prisma (option C)
offers its own model-definition format, transactions, and migrations, and also supports
complex SQL. The selection reflects the preferred schema and query style rather than a
claim that Prisma cannot express complex queries.

**Evidence**: [Drizzle query API](https://orm.drizzle.team/docs/select),
[PostgreSQL driver integration](https://orm.drizzle.team/docs/get-started-postgresql),
[Drizzle migrations](https://orm.drizzle.team/docs/migrations), and
[Prisma advanced queries](https://www.prisma.io/docs/orm/fundamentals/advanced-queries).

### Persistence Layout (P006)

**Decision**: Two tables, approved by the user as option A: `articles` stores article
metadata and editable draft fields together; `article_versions` stores immutable published
snapshots. Public content comes from the referenced live snapshot, never the draft fields.

**Rationale**: Follow suggested structure, but didn't separate metadata and drafts for simplicity.

**Alternative considered**: Option B used a separate `article_drafts` table alongside
`articles` and `article_versions`. It offered further separation of metadata and drafts
but added a table and joins. Not selected.

This decision approves the table split; the consolidated columns, defaults, constraints,
indexes, and audit timestamps are approved in P075. Transaction coordination, revision
protocol, version allocation, and ownership/reference protection are approved separately below.

### Transaction Coordination (P007)

**Decision**: Use a single transaction for each lifecycle write, locking the article row
with `SELECT ... FOR UPDATE` before checking its revision and performing the operation.
Save, restore, publish, and unpublish reject stale expected article revisions without changes.
Snapshot deletion follows the same article-first lock order and rechecks eligibility inside
the transaction, preserving protection when it races with publication.

**Rationale**: Atomicity can be made less complex by keeping the operation in a single
transaction: start transaction → lock article row → check article revision → perform the
operation → commit. Any failure rolls back the transaction. The user selected option A.
The revision here tracks article changes; it is distinct from a snapshot's version number.

**Tradeoff**: Competing writes to the same article wait for the current transaction to finish.
Locks cover the database operation, not the time the writer spends editing in the browser.

**Alternative considered**: Option B used a revision-matched conditional article update
as the first write before the remaining transactional work, without an initial explicit
locking read. It combines revision checking and the first write but requires careful
coordination across lifecycle actions. Not selected.

The isolation level and revision API protocol are approved separately below. Response
shapes are approved in P029/P030 and columns in P075. This decision does not require a caller revision for snapshot deletion;
FR-008's stale-request rule applies to save, restore, publish, and unpublish.

**Evidence**: PostgreSQL documents [row-level locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)
and [concurrent update behavior](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED).

### Revision API Protocol (P008)

**003 supersession (approved, not implemented):** Published equality preserves revision and
updatedAt; unpublished equality advances both once but preserves the retained reference,
counter, and first date. First/different content creates a snapshot. The original decision
record below remains historical; the [003 model](../003-idempotent-publish/data-model.md)
and [contract](../003-idempotent-publish/contracts/publish.md) govern dependent implementation.

**Decision**: Return `revision` in writer article JSON and require `expectedRevision` in
the JSON body of save, restore, publish, and unpublish requests. Return `409 Conflict` for
a stale article revision, without applying changes. The user selected option A.

**Rationale**: Universal and less complex.

**Alternative considered**: Option B returned an `ETag` and required the `If-Match` request
header, using `412 Precondition Failed` on a stale precondition. It uses HTTP conditional
requests but adds header handling. Not selected.

The protocol uses the article revision, not the published snapshot's version number.
Request-body fields/defaults and writer article responses are approved in P028 and P029.
The article revision is a JSON integer starting at 0; every successful save, restore,
publish, or unpublish advances it, including unchanged saves/restores. Token validation is
approved in P033; P027 approves `400 Bad Request` for missing or
malformed tokens. Existing rules to preserve unsaved local edits on conflict still apply.

**Evidence**: HTTP defines [409 Conflict](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.10)
and [If-Match conditional requests](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1).

### Snapshot Version Allocation (P009)

**Decision**: Store a counter on each article and allocate snapshot version numbers from it,
starting at 1 for each article. The user selected option A. During publication, use the
counter's current value for the new snapshot and advance it in the same transaction under
the approved article-row lock. Commit the snapshot, counter, and publication changes together;
roll them all back on failure. Deleting snapshots MUST NOT decrease or reset the counter.

**Rationale**: Versions are unique for each article.

Different articles may each have a version 1. Within one article, committed version numbers
are never reused, including after deletion. This counter is separate from the article revision
used for stale-write detection. Integer counter types are approved in P034; a database
unique constraint on article ID and version number is approved in P041. Column definitions
and constraints are approved in P075; ownership/reference protection is approved separately below.

**Alternative considered**: Option B used one database sequence shared across all articles.
It avoided a per-article counter, but each article's version numbers could have gaps caused
by publications of other articles. Not selected.

### Snapshot Ownership and Reference Protection (P010)

**Decision**: Use a composite foreign key from an article's own ID and referenced snapshot ID
to the snapshot's owning article ID and snapshot ID. Add the supporting composite unique
constraint on the referenced pair. Use `ON DELETE RESTRICT` to reject deletion while the
snapshot is referenced. The user selected option A after reviewing the ownership example.

**Rationale**: Ownership and reference protection describe relationships between records;
built-in foreign key constraints express and enforce those relationships directly.

The composite key rejects references to another article's snapshot. Keeping the reference
on unpublish also keeps the last-published snapshot protected. Once republishing replaces
that reference, the old snapshot is eligible for deletion under the approved lifecycle rules.
Application checks and article-first locking still provide clear errors and coordinate races.

**Alternative considered**: Option B used a single-column snapshot foreign key with restrictive
deletion plus a custom database trigger for ownership. It could enforce the same rules but
required trigger code and verification. Not selected.

This approves the constraint pattern and supporting unique constraint. Column names are
approved in P075; SQL migration definitions are implementation work. UUID key types and generation are approved
separately below. Publication-state consistency is enforced by application logic under P037;
column nullability is approved in P040. Atomic publication follows P007. Snapshot immutability
is enforced by the trigger approved separately in P022.

**Evidence**: PostgreSQL documents [composite foreign keys and restrictive deletion](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK).

### Test Runner (P004)

**Decision**: Use Vitest, approved by the user as option A, for automated verification.
Lifecycle invariants use real PostgreSQL with application migrations; concurrency cases
use independent database connections. Selecting Vitest does not replace those requirements
with mocked database behavior.

**Rationale**: Vitest's TypeScript support, assertion utilities, and Vite-based execution fit
the chosen TypeScript/Nuxt stack. The tradeoff is an additional development dependency.

**Alternative considered**: Option B used Node's built-in `node:test` runner and assertions
for fewer dependencies, with Nuxt-specific execution potentially needing additional
configuration. Not selected.

Separate unit/integration/full-suite entry points are approved in P018; version pins are
approved in P069. P076 and [quickstart.md](quickstart.md) define setup/reset/cleanup,
runner responsibilities, and commands; the isolation strategy is approved in P020. This decision does not
add component or browser test dependencies.

**Evidence**: [Vitest features](https://vitest.dev/guide/features.html) and
[Node's built-in test runner](https://nodejs.org/api/test.html).

### Markdown Renderer (P011)

**Decision**: Use markdown-it for Markdown rendering in the writer preview and public
article pages, with shared rendering configuration. The user selected option A.

**Rationale**: Previously used. The user has prior experience with markdown-it.

The shared renderer MUST preserve FR-010 and FR-012: raw HTML appears as literal text,
and only the approved HTTP, HTTPS, `mailto:`, relative-path, and `#heading` destinations
become clickable links. Library defaults must be checked against those requirements.
Limited raw HTML formatting remains a deferred stretch goal.

**Alternative considered**: Option B used Marked with custom HTML and link renderer overrides.
It was viable but required more explicit renderer code for the approved policies. Not selected.

Version 15.0.3 is approved in P069. Rendering policy and `shared/utils/markdown.ts` are
consolidated in [contracts/ui-and-services.md](contracts/ui-and-services.md). This
decision selects the renderer without adding Markdown plugins or changing rendering behavior.

**Evidence**: [markdown-it documentation](https://markdown-it.github.io/markdown-it/) and
[Marked renderer customization](https://marked.js.org/using_pro).

### Request Validation (P012)

**Decision**: Use Zod for runtime validation of incoming API data, approved by the user
as option A. Infer the corresponding TypeScript input types from the validation schemas.

**Rationale**: Keep request validation readable and reduce manually maintained validation
and type definitions. The tradeoff is another dependency and learning its schema API.

Request schemas MUST preserve the approved required fields, normalization, formats, and
limits, including Unicode code-point length measurement. Zod handles input validation;
lifecycle functions still check state and revisions, and PostgreSQL enforces database
constraints. Validation policy is approved in P033; the shared validation module location
is approved in P047. The HTTP contract and research resolve schema behavior and version APIs;
schema code is implementation work.

**Alternatives considered**: Valibot (option B) offered modular validation functions and
inferred types with a different API style. Handwritten checks (option C) avoided a library
dependency but required more manual validation and error handling. Neither was selected.

**Evidence**: [Zod schemas, validation, and inferred types](https://zod.dev/basics) and
[Valibot introduction](https://valibot.dev/guides/introduction/).

### Transaction Isolation (P013)

**Decision**: Use PostgreSQL's `READ COMMITTED` isolation for lifecycle transactions,
approved by the user as option A. Retain the explicit article-first `SELECT ... FOR UPDATE`
lock and expected-revision checks approved in P007 and P008.

**Rationale**: PostgreSQL's default Read Committed isolation, combined with the approved
article-row locks and revision checks, is sufficient for this per-article lifecycle design.

Read Committed alone does not lock rows on ordinary reads or detect stale editors. The
design depends on every relevant write following the approved locking sequence, with
database constraints protecting ownership and references. Real PostgreSQL failure and
concurrency tests must verify the resulting behavior before implementation is complete.

**Alternative considered**: Serializable isolation (option B) offered stronger transaction
isolation but required handling serialization failures and retries. Not selected.

**Evidence**: PostgreSQL documents [Read Committed](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED)
and [Serializable](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE).

### Record Identifiers (P014)

**Decision**: Use UUID primary keys for articles and snapshots, stored as PostgreSQL `uuid`
values with matching UUID foreign-key columns. The user selected option B. Server-side UUIDv4
generation is approved separately in P015 and P016. Article revisions and per-article
snapshot version numbers remain separate from these record identifiers.

**Rationale**: Prefer identifiers that can be generated before inserting a row, allowing
dependent records to use the ID without first retrieving a database-generated identifier.
This captures the pre-insertion ID benefit behind the user's preference.

**Technical clarification**: PostgreSQL identity sequences allocate distinct values atomically
under concurrent requests; normal concurrent inserts do not cause sequence-generated IDs
to collide. `INSERT ... RETURNING` can return a generated ID without a separate query.
UUIDs are therefore selected for independent ID generation, not to fix an inherent integer
identity concurrency problem. Server-side UUIDv4 generation is approved in P015 and P016.

**Alternative considered**: Integer identity primary keys (option A) offered compact keys
and simpler manual inspection in one database. Not selected.

**Evidence**: PostgreSQL documents [concurrency-safe sequence allocation](https://www.postgresql.org/docs/current/functions-sequence.html)
and [returning generated values](https://www.postgresql.org/docs/current/dml-returning.html).

### UUID Generation Location (P015)

**Decision**: The Nuxt server generates article and snapshot UUIDs before inserting their
rows into PostgreSQL. The user selected option A. UUIDv4 and the generator are approved
separately in P016.

**Rationale**: Keep the server from needing to read the PostgreSQL insert result solely to
obtain the generated ID; the identifier is already available when constructing related records.

This does not eliminate database reads required for article locking, revision checks, or
other operation results. Return database-generated fields when needed by the approved
contracts. Existing primary-key and foreign-key constraints still apply.

**Alternative considered**: Option B generated UUIDs through a PostgreSQL default and
returned the generated ID to the application. It centralized generation in the database but
did not provide the ID before insertion. Not selected.

### UUID Version and Generator (P016)

**Decision**: Generate UUIDv4 identifiers on the Nuxt server using Node's built-in
`crypto.randomUUID()`, approved by the user as option A. Use this approach for both article
and snapshot IDs before insertion, as established in P015.

**Rationale**: Less complexity; timestamp-based UUIDs are not needed for now.

**Alternative considered**: UUIDv7 (option B) included a timestamp and provided time-oriented
keys, with generator availability depending on the runtime. Not selected. Snapshot history
ordering continues to use the approved per-article version numbers, not UUID ordering.

The generator adds no UUID library dependency. Node.js 24 LTS is approved in P052;
the exact runtime patch is approved in P063.

**Evidence**: Node documents [UUIDv4 generation with crypto.randomUUID()](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions).

### Tag Storage (P017)

**Decision**: Store draft tags on `articles` and snapshot tags on `article_versions` as
PostgreSQL `text[]` columns. The user selected option A after reviewing array querying.

**Rationale**: A native text array directly matches the ordered list of tag strings and
supports containment and overlap queries without requiring a general JSON structure.

Preserve the approved normalization, first-occurrence order, deduplication, and count/length
and character rules. The array type alone does not enforce all those rules. Column definitions
and defaults are approved in P075; field validation remains in the application. Draft tags
default to an empty array; snapshots explicitly copy the saved tags.

**Alternative considered**: `jsonb` (option B) could store a JSON array but required additional
checks to constrain the JSON shape to an array of strings. Its richer structure was not
needed for the approved tag model. Not selected.

This selects storage only; tag filtering endpoints and tag-search indexes are not added
to the required feature scope.

**Evidence**: PostgreSQL documents [arrays](https://www.postgresql.org/docs/current/arrays.html),
[array query operators](https://www.postgresql.org/docs/current/functions-array.html), and
[JSON storage](https://www.postgresql.org/docs/current/datatype-json.html).

### Test Suite Entry Points (P018)

**Decision**: Provide all three test entry points, approved by the user after reviewing
database-free tests, real database verification, and future GitHub runner compatibility.

| Planned script | Scope | Database requirement |
| --- | --- | --- |
| `test:unit` | Fast tests of isolated application logic, such as validation and normalization. Mock dependencies where useful. | No PostgreSQL or Docker required. |
| `test:integration` | Lifecycle, API/database integration, constraints, rollback, and concurrency tests using application migrations. | Automatically provision an isolated PostgreSQL container after documented prerequisites are available. |
| `test` | Run both suites and return a failing exit status if either suite fails. | Includes the integration suite's PostgreSQL requirement. |

These script names are implemented through Phase 2. Their full lifecycle scope is added
in subsequent feature phases. The pnpm entry points are approved in P021; script/Compose
procedures are consolidated in P076 and quickstart. The full-suite entry point provides
FR-014's one documented test command; separate suite commands
provide focused development feedback.

**Rationale**: Keep unit-test feedback database-free while preserving real evidence of
PostgreSQL lifecycle correctness and a path to future CI execution.

Mocks remain supplemental for database behavior. Invariant tests use real PostgreSQL;
concurrency cases use independent connections. A unit-only pass does not replace full-suite
verification. The production build and required type checks remain separate completion checks.
Existing tests must be reused or extended where appropriate rather than duplicated.

Compose test services and the isolation/reset strategy are approved in P019 and P020;
version pins are approved in P069. Configuration and command procedures are consolidated
in P076 and quickstart. Future GitHub Actions
implementation remains outside the current assignment scope; this approval adds no CI files.

### Test Database Orchestration (P019)

**Decision**: Use Docker Compose to define a dedicated PostgreSQL test service and a test
runner service. The user selected option A. Integration/full-suite entry points start the
required test services automatically after documented prerequisites are available, wait for
the test database to be ready, apply application migrations, and run the relevant Vitest suite.

**Rationale**: Reuse the Docker Compose workflow already required for local execution and
avoid adding a separate container-orchestration testing dependency.

The test database is isolated from application data. Normal application startup does not
start the test services; database-free unit testing still requires neither Docker nor
PostgreSQL. Per-run database isolation and sequential-case reset are approved in P020.
Configuration and reset/cleanup procedures are consolidated in P076 and quickstart.
Compose/script code is subsequent implementation work; none is created during planning.

**Alternative considered**: Testcontainers (option B) would start and dispose of PostgreSQL
from test code, adding an orchestration dependency and Docker control from the test process.
Not selected.

**Evidence**: Docker documents [selective service activation with Compose profiles](https://docs.docker.com/compose/how-tos/profiles/);
Testcontainers documents its [PostgreSQL module](https://node.testcontainers.org/modules/postgresql/).

### Integration Test Isolation (P020)

**Decision**: Use one disposable PostgreSQL test database per integration run. Execute
integration test files and cases sequentially and clear application data between cases.
The user selected option A. Preserve the migrated schema while resetting case data;
discard the run's test database after the run and start the next run with a fresh database.

**Rationale**: Keep setup and cleanup simple and predictable without per-worker databases.
The tradeoff is less parallelism across integration cases, which fits this assignment's scope.

Each concurrency case still runs simultaneous operations through independent database
connections. Sequential cases isolate fixtures; they do not serialize the competing
operations being tested. Allow lifecycle transactions to commit and roll back normally.
Finish test operations and close their connections before clearing data for another case.

Cleanup targets only the run's test resources and preserves application services/data.
The table reset is approved in P055; a fixed dedicated test project is approved in P056.
P076 and quickstart define reset-hook behavior, resource ownership, cleanup, and commands;
the script and reset-hook code remain implementation work.
This decision does not restrict unit-test parallelism.

**Alternative considered**: Option B assigned each parallel test worker its own database.
It could improve throughput for a larger suite but added database setup and cleanup logic.
Not selected.

**Evidence**: Vitest supports [controlling file parallelism](https://vitest.dev/config/fileparallelism).

### Package Manager (P021)

**Decision**: Use pnpm for dependency installation and package scripts, approved by the user
as option B. Use `pnpm-lock.yaml` as the dependency lockfile. Version `12.18.0` is approved
in P065; container provisioning is approved in P066. P076 and quickstart consolidate
project configuration and developer prerequisites.

**Rationale**: pnpm is quicker to work with during development, based on the user's preference.
This records a workflow preference rather than a measured installation-speed claim.

The planned test entry points are `pnpm run test:unit`, `pnpm run test:integration`, and
`pnpm test`. They implement the scopes approved in P018; no scripts exist or have been
verified yet. Provision pnpm consistently for development and container builds, with
frozen-lockfile installs in Docker and exact direct package versions under P061.
App startup remains `docker compose up --build`.

**Alternative considered**: npm (option A) offered a standard npm workflow and
`package-lock.json` with straightforward setup. Not selected.

**Evidence**: [pnpm installation and version provisioning](https://pnpm.io/installation).

### Snapshot Immutability (P022)

**Decision**: Add a PostgreSQL trigger that rejects updates to existing `article_versions`
rows. The user confirmed option A after distinguishing database enforcement from application-only
checks. Snapshot insertion and eligible deletion remain permitted; P010 protects referenced
snapshots from deletion.

**Rationale**: Use a database trigger for direct snapshot protection and a compact local
setup; consider database roles in the future.

Application lifecycle functions do not update snapshots. The database trigger also rejects
accidental direct SQL updates, including changes to snapshot content, ownership, or version
identity. Real PostgreSQL tests must verify rejected updates leave the snapshot unchanged;
reuse or extend relevant lifecycle tests where appropriate.

**Alternative considered**: Option B restricted snapshot-update privileges for the application
connection and used a separate migration role. It avoided a trigger but added role and
credential configuration. Deferred as future work rather than required local setup.

**Future work**: Introduce separate database roles for application runtime and migrations.
This concerns database connection privileges; writer authentication and application roles
remain outside the approved feature scope. The data model fixes trigger behavior;
SQL function and migration code are subsequent implementation work.

**Evidence**: PostgreSQL documents [update triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
and [database privileges](https://www.postgresql.org/docs/current/ddl-priv.html).

### Publication Status Storage (P023)

**Decision**: Store article status in a text column with a PostgreSQL CHECK constraint
permitting only `draft`, `published`, and `unpublished`. The user selected option A.

**Rationale**: Keep migrations straightforward without maintaining a separate database enum
type. Both options enforce the approved set of status values in the database.

**Alternative considered**: A native PostgreSQL enum (option B) offered a dedicated database
type but made removing existing values more involved. Not selected.

The allowed-value check does not by itself enforce lifecycle transitions or consistency
with the publication reference/date. Application lifecycle logic enforces that consistency
under P037; no cross-field publication-state CHECK is added. The allowed-status CHECK and
approved ownership/reference foreign key remain required. The `draft` default is approved
in P039; the column definition is approved in P075.

**Evidence**: PostgreSQL documents [CHECK constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)
and [enum types](https://www.postgresql.org/docs/current/datatype-enum.html).

### API Style (P024)

**Decision**: Expose a JSON HTTP API through Nuxt's native server handlers, using GET,
POST, PUT, and DELETE as appropriate. The user selected option A. Retain thin handlers,
Zod input validation, shared lifecycle functions, and P008's JSON revision/409 protocol.

**Rationale**: Nuxt has built-in support for HTTP.

**Alternative considered**: tRPC (option B) offered typed procedure calls and inferred
client/server contracts but added RPC dependencies and integration. Not selected.
Nuxt's internal route type inference can still support typed frontend calls with option A;
its exact coverage depends on the approved version and configuration.

Route paths and the native Nuxt error format are approved separately in P025 and P026.
HTTP status mappings and writer request-body fields/defaults are approved in P027 and P028.
Response shapes and custom error data are approved in P029–P031; validation is approved in P033.
Research and contracts resolve version-specific APIs and validation. This decision does not introduce RPC
libraries or new features.

**Evidence**: [Nuxt server handler registration](https://github.com/nuxt/nuxt/blob/main/docs/4.api/6.nuxt-config.md),
[Nuxt data-fetching type inference](https://learn.nuxt.com/en/concepts/data-fetching), and
[tRPC introduction](https://trpc.io/docs).

### API Route Map (P025)

**Decision**: Use the following writer and public routes, explicitly approved by the user.

Writer routes use the base `/api/writer/articles`:

| Method | Path suffix | Purpose |
| --- | --- | --- |
| GET | `/` | List articles. |
| POST | `/` | Create a draft. |
| GET | `/:articleId` | Load article state by internal UUID. |
| GET | `/by-slug/:slug` | Resolve the writer browser slug to WriterArticle, including its internal UUID. |
| PUT | `/:articleId/draft` | Save draft content. |
| POST | `/:articleId/publish` | Publish. |
| POST | `/:articleId/unpublish` | Unpublish. |
| GET | `/:articleId/versions` | List snapshots. |
| GET | `/:articleId/versions/:versionId` | Inspect a snapshot. |
| POST | `/:articleId/versions/:versionId/restore` | Restore into the draft. |
| DELETE | `/:articleId/versions/:versionId` | Delete an eligible snapshot. |

Public routes:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/public/articles` | List published articles. |
| GET | `/api/public/articles/:slug` | Read a published article. |

**Rationale**: Separate writer and public namespaces make the required representations
explicit. Writer mutations and history use article and snapshot UUIDs; writer browser
loading and public detail use the stable slug. The user requested slug-based writer URLs
during Phase 12 review. The writer-only slug lookup returns the existing WriterArticle
projection for any publication state, with ARTICLE_NOT_FOUND for an unknown slug. It does
not use the public lookup, which excludes drafts and unpublished articles.
The route map follows the approved authoring, history, and public-reading journeys.

Save, publish, unpublish, and restore require `expectedRevision` as approved in P008.
Snapshot deletion follows its existing ownership, reference-protection, and locking rules.
Public routes expose only published snapshot content and retain the approved `404` behavior.
Error format, HTTP statuses, and writer request-body fields/defaults are approved in P026–P028.
Success bodies and custom error data are approved in P029–P031; validation is approved in P033.
No endpoint implementation is created during planning.

### API Error Format (P026)

**Decision**: Use Nuxt's built-in API error handling and native error response conventions.
The user selected option A. Put a stable application error code and optional field-validation
details in Nuxt's supported custom error data. Do not add a custom error envelope or global
error renderer for this assignment.

**Rationale**: No current need for custom error handling. Follow Nuxt conventions.

Thin API handlers map expected lifecycle and validation failures to the native HTTP error
mechanism. Preserve the approved stale-revision `409 Conflict` and public `404` behavior.
HTTP status mappings and custom error codes/data are approved separately in P027 and P031.
The Nuxt version is approved in P062; research documents its native server exports and
error API. Verify the installed production error behavior during implementation.

**Alternative considered**: HTTP Problem Details (option B) used the standardized
`application/problem+json` contract with explicit response mapping. Not selected.

**Evidence**: [Nuxt API error handling and custom data](https://github.com/nuxt/nuxt/blob/main/docs/4.api/3.utils/create-error.md)
and [HTTP Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html).

### HTTP Status Mapping (P027)

**Decision**: Use the following status mapping, explicitly approved by the user. Preserve
Nuxt's native error format under P026.

| HTTP status | Use |
| --- | --- |
| `200 OK` | Successful reads, save, publish, unpublish, and restore. |
| `201 Created` | Successful draft creation. |
| `204 No Content` | Successful snapshot deletion, without a response body. |
| `400 Bad Request` | Invalid input, including missing or malformed `expectedRevision`. |
| `404 Not Found` | Missing articles, missing/wrong-article snapshots, and unavailable public articles. |
| `409 Conflict` | Stale revisions, duplicate slugs, protected snapshot deletion, and invalid unpublish states. |
| `500 Internal Server Error` | Unexpected failures, with a generic public-facing message. |

**Rationale**: Distinguish successful operations, invalid input, missing resources, state
conflicts, and unexpected failures through HTTP status semantics. The already approved
stale-revision `409` and public `404` behavior are retained.

Failed lifecycle requests still make no changes as required by the specification. Writer
article responses, revision behavior, and read-response shapes are approved in P029/P030;
native error-data fields and application error codes are approved in P031. Request validation
is approved in P033. This mapping does not add a custom error renderer.

### Writer Request Bodies (P028)

**Decision**: Use the following writer request bodies and creation defaults, explicitly
approved by the user after reviewing the purpose of `expectedRevision`.

| Operation | Required JSON fields | Optional JSON fields |
| --- | --- | --- |
| Create draft | `title`, `slug` | `body`, `tags` |
| Save draft | `title`, `body`, `tags`, `expectedRevision` | None. |
| Publish / unpublish | `expectedRevision` | None. |
| Restore snapshot | `expectedRevision` | None; snapshot UUID comes from the URL. |
| Delete snapshot | No request body. | None; snapshot UUID comes from the URL. |

On creation, omitted or `null` `body` defaults to `""`, and omitted or `null` `tags` defaults
to `[]`, as amended in P032. Saving
replaces the complete draft content; empty body and empty tags remain permitted. Slug is
supplied only during creation and remains fixed afterward. Existing normalization and
validation rules still apply. Publish does not implicitly save editor content.

**Rationale**: Keep each request explicit about the intended action. Creation supports
empty draft content, while complete draft saves and revision checks prevent partial or
stale updates from silently changing the saved state.

Revision representation, writer responses, and read-response shapes are approved in P029/P030.
Native error data and validation are approved in P031/P033. This decision defines request
fields/defaults and does not create handlers or Zod schemas yet.

### Writer Article Responses and Revisions (P029)

**003 supersession (approved, not implemented):** Published equality preserves revision and
updatedAt; unpublished equality advances both once but preserves the retained reference,
counter, and first date. First/different content creates a snapshot. The original decision
record below remains historical; the [003 model](../003-idempotent-publish/data-model.md)
and [contract](../003-idempotent-publish/contracts/publish.md) govern dependent implementation.

**Decision**: Return the following article shape directly, without a `data` wrapper, after
creation, loading an article, saving, publishing, unpublishing, or restoring. The user
explicitly approved this shape and the revision rules below. This example is a new draft:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "slug": "getting-started",
  "status": "draft",
  "revision": 0,
  "draft": {
    "title": "Getting started",
    "body": "",
    "tags": []
  },
  "publishedAt": null,
  "currentPublishedVersionId": null
}
```

- The article `revision` is a JSON integer starting at 0. Every successful save, restore,
  publish, or unpublish increases it, including saves/restores with unchanged content.
  Failed requests and reads do not advance it. This supports at most one successful
  competing write per starting revision, including when content is already identical.
- Publication date and reference are initially `null`. First publication sets them;
  republishing preserves the date and replaces the reference. Unpublishing preserves both.
- Dates use ISO 8601 UTC strings when present; UUID values are strings in JSON.
- Snapshot deletion retains its approved `204` response without a body.

**Rationale**: A consistent writer representation gives the editor the saved content and
latest revision after each action. Revision advancement makes stale-write detection
consistent even for unchanged saves/restores, without creating extra snapshots.

Read-response shapes and custom error data are approved separately in P030/P031. Integer
revision storage is approved in P034, publication timestamp storage in P035, and content
text storage in P038. Column definitions are approved in P075. Token validation
is approved in P033. This is an approved contract example,
not an implemented or verified endpoint.

### Read Response Shapes (P030)

**Decision**: Use the following read-response shapes, explicitly approved by the user.
These complete the read representations alongside the writer article object in P029.

| Response | Fields |
| --- | --- |
| Writer article list | Array of `{ id, slug, title, status }`; title comes from the draft. |
| Snapshot list | Array of `{ id, versionNumber }`, newest first. |
| Snapshot detail | `{ id, versionNumber, title, body, tags }`. |
| Public article list | Array of `{ slug, title, tags, publishedAt }`. |
| Public article detail | `{ slug, title, body, tags, publishedAt }`. |

- Return objects and arrays directly, without a `data` wrapper.
- Empty lists return `[]`; missing resources retain the approved `404` behavior.
- Public content comes exclusively from the live snapshot. `publishedAt` is the original
  publication date; no draft fields, article revision, or internal snapshot reference are
  included in public representations.
- Public `body` contains Markdown; the shared renderer approved in P011 renders the page.
- Dates use the ISO 8601 UTC format approved in P029. UUIDs are JSON strings; snapshot
  version numbers are per-article integers, distinct from record IDs and article revisions.

**Rationale**: Return only the fields needed for writer navigation/history and public
reading, while keeping draft and live representations explicit and list responses simple.

Custom error data and validation are approved in P031/P033. Physical column definitions
are approved in P075. These are the final contract definitions. Phase 4 implements writer create/list/detail;
remaining endpoints are added with their owning feature phases.

### Application Error Codes and Validation Details (P031)

**Decision**: Put the following application codes in Nuxt's native custom error data.
The user explicitly approved the codes and optional field-validation details.

| Application code | HTTP status |
| --- | --- |
| `VALIDATION_ERROR` | `400` |
| `ARTICLE_NOT_FOUND` | `404` |
| `SNAPSHOT_NOT_FOUND` | `404` |
| `STALE_REVISION` | `409` |
| `SLUG_CONFLICT` | `409` |
| `SNAPSHOT_PROTECTED` | `409` |
| `INVALID_PUBLICATION_STATE` | `409` |

Optional `fieldErrors` maps field names to arrays of validation messages. For example,
the custom error data inside the native response may contain:

```json
{
  "code": "VALIDATION_ERROR",
  "fieldErrors": {
    "title": ["Title is required."]
  }
}
```

Unavailable public articles use `ARTICLE_NOT_FOUND`, including draft-only and unpublished
articles. Missing and wrong-article snapshot targets both use `SNAPSHOT_NOT_FOUND`.
Unexpected failures retain generic native `500` handling. No custom response envelope or
global error renderer is introduced.

**Rationale**: Stable codes let the client distinguish expected failures while field errors
support useful validation feedback. Nuxt retains ownership of the native error response format.

### Null Optional Creation Fields (P032)

**Decision**: Accept explicit `null` for the optional `body` and `tags` fields on draft
creation, as requested by the user. Treat it like omission: `body: null` becomes `""`, and
`tags: null` becomes `[]`. Normalize before persistence so the approved writer response
still returns a string body and an array of tags.

**Rationale**: Allow explicit null where an optional field already has an empty default,
rather than rejecting an equivalent empty draft input.

Required title, slug, and expected-revision rules remain in effect. This amendment approves
null defaults for optional creation fields; the remaining validation policy was approved
separately in P033. Save's complete-draft request remains defined by P028.

### Request Validation Policy (P033)

**Decision**: Enforce the following validation policy, explicitly approved by the user
with the nullable creation defaults in P032.

- Require declared JSON types: strings for content fields and an array of strings for tags.
  Do not coerce types; approved slug/tag normalization still applies.
- Require `expectedRevision` to be a nonnegative safe integer JSON number. Reject numeric
  strings such as `"5"`, fractions, negative numbers, `null`, and values outside the safe
  integer range.
- Reject unexpected request fields with `400 VALIDATION_ERROR`, including `slug` supplied
  during save. The approved body map in P028 defines supported fields.
- Validate writer API article/version IDs as UUIDs; browser slugs use the separate writer lookup. Malformed IDs return `400 VALIDATION_ERROR`; valid
  UUIDs identifying missing resources retain `404` and the error codes in P031.
- During creation, omitted or null `body`/`tags` normalize to `""`/`[]` as approved in P032.
  Required fields still need valid values; save retains its complete string/array payload.
- Preserve all approved field limits, formats, nonblank rules, normalization, and Unicode
  code-point length measurement.

**Rationale**: Catch malformed or unsupported input clearly instead of silently coercing
types or discarding fields, while accepting null for optional empty creation values.

Use Zod and Nuxt's approved native validation-error data; no new validation library or
custom error envelope is introduced. Research and contracts resolve schema behavior and
framework integration; exact schema code remains implementation work.

### Revision and Version Counter Types (P034)

**Decision**: Use PostgreSQL `integer` for the article revision, per-article next snapshot
version counter, and snapshot version number. The user selected option A.

- Article revision starts at 0 and the next snapshot version counter starts at 1,
  preserving P009/P029's allocation and advancement rules.
- The per-article counter remains a field advanced within the locked transaction, not a
  database sequence or auto-incrementing ID.
- Article and snapshot record IDs remain UUIDs. The request validation policy in P033
  remains unchanged.

**Rationale**: The 32-bit integer range is sufficient for this assignment and maps directly
to JavaScript numbers without additional 64-bit integer handling.

**Alternative considered**: Option B used PostgreSQL `bigint`, offering greater capacity
but requiring care when mapping values to JavaScript numbers and JSON. Not selected.

Column definitions and constraints are approved in P075. Publication
timestamp and content text types are approved in P035/P038; counter range enforcement is
approved in P042.

### Publication Timestamp Storage (P035)

**Decision**: Store `publishedAt` as PostgreSQL `timestamptz` (`timestamp with time zone`).
The user selected option A. Continue returning ISO 8601 UTC strings in the API as approved
in P029/P030.

**Rationale**: Publication time represents a specific instant. PostgreSQL handles timezone
conversion rather than relying on the application to interpret timezone-free values as UTC.
The original input timezone is not retained; PostgreSQL displays the stored instant using
the session timezone, while the API serializes it in UTC.

**Alternative considered**: Option B used `timestamp without time zone`, requiring a
consistent application convention that all stored values represent UTC. Not selected.

Existing lifecycle rules remain in effect: initially null, set on first publication, and
preserved after republishing or unpublishing. The database clock source is approved in
P036; this decision approves storage and retains the existing API format.

### First-Publication Clock Source (P036)

**Decision**: Set the first-publication date using PostgreSQL `CURRENT_TIMESTAMP` within
the approved publication transaction. The user selected option A. This value represents
the transaction's start time and remains constant throughout that transaction.

Set the date only on first publication; preserve the stored date on republishing and
unpublishing. Draft creation leaves it null. Publication changes and the timestamp commit
or roll back together under P007. Storage and API formatting follow P035 and P029/P030.

**Rationale**: Use the database clock for the persisted publication date, keeping its
generation within the transaction that establishes publication.

**Alternative considered**: Option B generated the date in the Nuxt server with `new Date()`.
It is easy to control in unit tests but relies on the application server's clock. Not selected.

### Publication-State Consistency Enforcement (P037)

**Decision**: Enforce publication-state consistency in application lifecycle logic, without
an additional cross-field database CHECK constraint. The user selected option B.

- For `draft`, the publication date and snapshot reference must both be null.
- For `published` or `unpublished`, both must be present.
- Shared server-side lifecycle functions maintain these rules within the approved
  transaction and article-row locking protocol. Real PostgreSQL lifecycle and concurrency
  tests must verify the resulting states, rollback, and preservation behavior.

**Tradeoff accepted**: Less schema logic; every application write path must maintain the
state/date/reference relationship. Direct SQL writes are not protected by this additional
cross-field check because it is not being added.

The allowed-status CHECK (P023), ownership/reference foreign key and deletion protection
(P010), and snapshot immutability trigger (P022) remain approved database protections.

**Alternative considered**: Option A added a database CHECK for the state/date/reference
relationship alongside application logic. It also rejected inconsistent direct writes,
but added a schema constraint. Not selected.

### Title, Slug, and Body Storage (P038)

**Decision**: Use PostgreSQL `text` for the article slug and for draft and snapshot titles
and bodies. The user selected option A. Enforce the approved length limits through Zod:
title 200, slug 100, and body 100,000 Unicode code points.

**Rationale**: Keep length validation in the approved application validation layer and
schema maintenance simple. No bounded `varchar(n)` columns are added for these fields.

**Alternative considered**: Option B used `varchar(n)` column definitions to also enforce
maximum lengths in the database. Not selected.

Required-field rules, slug uniqueness and immutability, normalization, and snapshot
immutability remain in effect. Tags retain the separately approved `text[]` storage (P017).
Article defaults and column nullability are approved in P039/P040; column definitions and
constraints are approved in P075.

### Initial Article Database Defaults (P039)

**Decision**: Define the following initial article values as PostgreSQL column defaults.
The user selected option A.

| Article field | Database default |
| --- | --- |
| Status | `draft` |
| Revision | `0` |
| Next snapshot version counter | `1` |
| Draft body | Empty string |
| Draft tags | Empty `text[]` array |

**Rationale**: Less code maintenance.

Creation inserts may omit these fields to use their defaults; supplied body/tags still
undergo the approved validation and normalization. Explicit null creation inputs retain
P032's empty-value normalization before persistence; database defaults do not replace it.
Required title/slug validation is unchanged. Publication date/reference remain initially
null, with `CURRENT_TIMESTAMP` applied only during first publication under P036. UUIDs
remain generated by the Nuxt server under P015/P016.

This decision covers article defaults only; snapshot creation still copies the saved draft
and allocates its version under the approved publication transaction.

**Alternative considered**: Option B omitted these database defaults and required the
application to supply each initial value explicitly. Not selected.

### Column Nullability and Empty Content (P040)

**Decision**: Mark all planned article and snapshot columns NOT NULL except the article's
publication date and snapshot reference. The user selected option A. Draft and snapshot
bodies and tags store empty content as an empty string and empty `text[]` array.

**Rationale**: Stored body/tags match the canonical API representation without requiring
null-to-empty conversion when reading content.

Explicit null creation inputs remain accepted and normalized before persistence under P032.
The article defaults in P039 still apply when insert columns are omitted. The nullable
publication date/reference follow the lifecycle rules in P037; this decision does not add
the cross-field database CHECK rejected there.

**Alternative considered**: Option B allowed null bodies/tags in storage and normalized
them when returning API responses, representing missing content separately. Not selected.

Column definitions and constraints are approved in P075.

### Per-Article Snapshot Version Uniqueness (P041)

**Decision**: Add `UNIQUE(article_id, version_number)` on `article_versions`, alongside
the locked transactional allocation in P009. The user selected option A. Different articles
may each have version 1; an article cannot have two retained snapshots with the same number.
The column names and related schema constraints are approved in P075.

**Rationale**: Provide a database guarantee against duplicate per-article version numbers,
including inserts outside the normal application allocation path.

The constraint does not replace the counter or prove that deleted numbers cannot be reused.
P009's counter never decreases or resets on deletion and remains necessary for that rule.
Allocation, snapshot insertion, and publication changes still commit or roll back together.
This constraint is distinct from P010's supporting ownership/reference unique constraint
on snapshot article ID and snapshot ID.

**Alternative considered**: Option B relied on transactional allocation alone, with fewer
database constraints but every insertion required to follow the locking protocol. Not selected.

### Counter Range Enforcement (P042)

**Decision**: Enforce valid counter ranges in application logic without additional database
range CHECK constraints. The user selected option B.

- Article revision must be at least 0.
- The next snapshot version counter and snapshot version number must each be at least 1.
- Preserve the approved initialization, revision advancement, locked version allocation,
  rollback, and non-reuse behavior in P009/P029/P039.

**Tradeoff accepted**: Fewer schema constraints; every application write path must maintain
the ranges. Direct SQL writes are not protected against out-of-range values by an additional
range CHECK. Existing PostgreSQL integer types, NOT NULL declarations, version uniqueness,
and other approved database protections remain required.

P033's expected-revision request validation remains unchanged. Lifecycle tests must verify
the valid initial values and advancement through the approved operations.

**Alternative considered**: Option A added database CHECK constraints for the three ranges,
also rejecting invalid direct SQL writes. Not selected.

### Lifecycle Operation Modules (P043)

**Decision**: Separate lifecycle operations into individual TypeScript files under
`server/services/articles/`, using the layout in Project Structure. The user selected
option B after reviewing the example. Thin API handlers call these ordinary functions;
the operation functions own business rules and database transactions under P002.

**Rationale**: Prepare for anticipated application growth by separating operation logic
now. The user prefers establishing this structure early rather than refactoring a single
module later when separation becomes necessary.

The accepted tradeoff is more files, imports, and navigation. Shared database connection
and schema definitions remain shared. Repeated transaction/revision coordination uses the
shared helper approved in P044. This decision introduces no service classes or repository
layer. Source files will be added during their implementation tasks; this is a planning
decision, not application scaffolding.

**Alternative considered**: Option A grouped the lifecycle functions in one
`server/services/articles.ts` module, keeping related operations together with fewer files.
Not selected.

### Shared Revision-Checked Transaction Helper (P044)

**Decision**: Use a shared transaction helper for save, publish, unpublish, and restore.
The user selected option A. Each operation remains in its own module under P043 and owns
its operation-specific changes inside the helper's transaction.

The helper begins the transaction, locks the article row, and checks the caller's expected
revision before invoking the operation. Missing articles and stale revisions retain the
approved error behavior. The operation uses the same transaction and locked article state;
commit follows successful completion, and failures roll back the transaction.

**Rationale**: Centralize the repeated locking and revision-check protocol to keep it
consistent across separate operation files without duplicating coordination code.

Create and snapshot deletion retain their approved workflows. Snapshot deletion still
locks the article first and checks eligibility without requiring a caller revision.
The helper does not change publication, version allocation, or revision advancement rules.
Database access uses the shared instance approved in P045. The UI/service contract defines
`withArticleTransaction.ts`, its inputs and transaction callback context; code follows
during implementation.

**Alternative considered**: Option B repeated transaction setup, locking, and revision
checks in each operation. It kept each workflow explicit but duplicated coordination code.
Not selected.

### Shared Database Instance Access (P045)

**Decision**: Lifecycle operations and the transaction helper access the database through
an imported shared database module, rather than requiring callers to pass the database
as an operation argument. The user selected option B. Use a reusable Drizzle database
instance backed by a connection pool for the configured database in each process.

**Rationale**: Support a single application database and reduce complexity through shared
configuration and simpler function calls.

Integration tests configure the shared module to use the isolated test database before
it initializes. The application and test databases remain separate under P019/P020.
Concurrency tests still require independent connections; a shared database instance does
not mean a single physical connection or serialized transactions.

P044's helper starts transactions using the shared instance. Operation-specific queries
inside a transaction use its transaction context so all related writes commit or roll back
together. They must not escape the transaction by using the shared instance directly.
The UI/service contract fixes `server/db/client.ts`. P076 and quickstart define the
server-only DATABASE_URL and test configuration before server initialization.

**Alternative considered**: Option A passed a database argument into lifecycle functions,
making dependencies and test database selection explicit. It also supports one production
database but adds argument wiring. Not selected.

### Drizzle Schema Module Organization (P046)

**Decision**: Define both `articles` and `article_versions`, including their Drizzle schema
constraints, in one `server/db/schema.ts` file. The user selected option A.

**Rationale**: Keep the two related tables and their constraints together, with fewer
imports between schema modules.

This decision concerns table-definition organization. The database client remains a
separate shared module, `server/db/client.ts`, under P045. The snapshot immutability
trigger remains required under P022 and will be expressed in a SQL migration. No application
files or migrations are created during this planning update.

**Alternative considered**: Option B placed each table definition in a separate schema
file, separating definitions but adding imports between related tables. Not selected.

### Article Request Validation Module (P047)

**Decision**: Keep shared article field rules and article request schemas together in
`server/validation/articles.ts`. The user selected option A. API handlers use these schemas
for request validation, with TypeScript input types inferred as approved in P012.

**Rationale**: Keep common field rules and related request schemas together, reusing rules
without imports between multiple validation modules.

This selects module organization only. Required fields, normalization, Unicode length
limits, null creation defaults, strict request types, and validation-error behavior remain
defined by P028/P031–P033. State and revision checks remain lifecycle responsibilities.
Schema behavior and version APIs are resolved in contracts/research; schema code is implementation work; no application
files are created in this planning update.

**Alternative considered**: Option B separated validation into a file per operation, with
smaller files and imports for shared field rules. Not selected.

### Editor State Management (P048)

**Decision**: Use local Vue reactive state with native Nuxt fetching for the editor.
The user selected option A. Keep editable draft values, saved revision, pending actions,
and errors with the editor's components rather than introducing a Pinia store.

**Rationale**: The application is small enough that Pinia is not currently warranted.
The user considers a later move to Pinia manageable if shared-state needs grow, and prefers
native state management for now. This records a project judgment rather than a guaranteed
future migration effort.

Maintain editable draft content separately from fetched/saved article state so a rejected
write or refreshed server response cannot silently overwrite unsaved text. Preserve the
approved conflict behavior, explicit-save-before-publish flow, and revision protocol.
Editor state/actions use the composable approved in P071; form and history presentation
components are approved in P072. The UI/service contract defines their data flow and responsibilities.

**Alternative considered**: Option B centralized editor state in a Pinia store for sharing
across pages/components, adding a dependency and store lifecycle management. Not selected.
Both approaches can use Nuxt's native fetching tools.

### UI Styling (P049)

**Decision**: Use Tailwind CSS to style the required writer and public UI. The user selected
option B.

**Rationale**: Bootstrap the UI using Tailwind's utility classes.

Keep styling focused on the required flows and the assignment's minimal UI scope. This
selection adds Tailwind tooling; exact versions are approved in P069. The official Vite
integration is approved in P070. It does not select a component library.
No packages or application files are added during this planning update.

**Alternative considered**: Option A used plain CSS with Vue scoped styles, avoiding an
additional styling dependency but requiring the CSS to be written and maintained directly.
Not selected.

### Nuxt Rendering Mode (P050)

**Decision**: Use Nuxt's default universal rendering for the writer and public UI.
The user selected option A. Initial page requests receive server-rendered HTML; Vue
hydrates it for browser interactions, with client-side navigation thereafter.

**Rationale**: Public article content belongs in the initial HTML response, and the
application follows Nuxt's default rendering conventions.

Page code must work in both server and browser environments. Keep browser-only behavior
in the appropriate client lifecycle and ensure server/client rendering stays consistent.
Public rendering continues to use only the published representation; writer draft state,
explicit saving, and conflict preservation retain their approved behavior. The Nuxt API
and PostgreSQL remain part of the approved monolith deployment.

**Alternative considered**: Option B used client-side rendering only, simplifying the
frontend execution environment and avoiding hydration while making public content wait
for JavaScript and data fetching. Not selected.

### Shared Markdown Display Component (P051)

**Decision**: Use one `MarkdownContent.vue` component for the editor's Markdown preview
and public article body display. The user selected option A. The component receives Markdown
text and uses the shared markdown-it renderer and configuration approved in P011.

**Rationale**: Reuse rendering markup and styling across preview and public reading.

The editor supplies draft text for preview; public pages supply only the live published
body. Data fetching and editor state remain with their owning pages/components. Preserve
the approved literal handling of embedded HTML and link allowlist in the shared renderer,
and support universal rendering under P050. Use the approved Tailwind styling approach.
The UI/service contract fixes `app/components/MarkdownContent.vue` and `shared/utils/markdown.ts`.
No component implementation is added during planning.

**Alternative considered**: Option B called the shared renderer directly from each page,
with fewer components but repeated display markup. Not selected.

### Node.js Runtime Baseline (P052)

**Decision**: Target Node.js 24 LTS for development and the application runtime.
The user selected option A.

**Rationale**: Favor more stable dependency compatibility by using an established LTS
release line. This records the user's selection rationale; compatibility with the exact
Nuxt, build, and test dependencies remains to be verified.

This decision selects the runtime major version. The Debian slim image family is approved
in P059; the exact runtime patch and image are approved in P063. Resolve remaining compatible
dependency versions during configuration design before implementation. No runtime, package,
or container is installed by this planning update.

**Alternative considered**: Option B used Node.js 26 LTS, a newer release line with a
longer support window. Not selected.

### PostgreSQL Runtime Baseline (P053)

**Decision**: Target PostgreSQL 18 for the application and isolated integration-test
databases. The user selected the original option A.

**Rationale**: Use a supported stable release line with a longer support window than
PostgreSQL 17. See the [official versioning policy](https://www.postgresql.org/support/versioning/).

The exact minor version and Docker image are approved in P064. Existing data-model,
transaction, and test-isolation decisions remain in effect. No database or container is
installed by this planning update.

**Alternative considered**: Option B used PostgreSQL 17, an older supported release line
with a shorter remaining support window. Not selected.

### App Startup Migrations (P054)

**Decision**: Run migrations in the app startup entry point before starting Nuxt.
The user selected option A. The existing `docker compose up --build` command remains
the local startup entry point, with two normal services: the app and PostgreSQL.

Startup order:

1. PostgreSQL starts and passes its readiness healthcheck.
2. The app waits for PostgreSQL using `service_healthy`; its entry point applies pending
   versioned application migrations.
3. The entry point starts Nuxt only after migrations succeed.

**Rationale**: Keep local startup simple with two services. The accepted tradeoff is
coupling migration execution to application startup.

If migration execution fails, the entry point exits unsuccessfully without starting Nuxt.
Existing database data remains in its persistent volume across normal restarts.
Integration tests still migrate their isolated database before running under P019/P020.
The migration command is approved in P058. Images and Compose configuration are approved
through P076; no Compose files or migration code are created here.

**Alternative considered**: Option B used a separate one-shot migration service and
successful-completion dependency, separating responsibilities but adding Compose
configuration. Not selected.

**Evidence**: [Docker Compose startup ordering](https://docs.docker.com/compose/how-tos/startup-order/).

### Integration Case Data Reset (P055)

**Decision**: Clear both application tables together with TRUNCATE between integration
cases, only in the run's disposable test database. The user selected option A.

```sql
TRUNCATE TABLE articles, article_versions;
```

List both related tables explicitly in the same statement; use the default restrictive
behavior rather than adding CASCADE. Preserve the migrated schema, constraints, triggers,
and migration history. Application data and services remain separate from test resources.

**Rationale**: A simple, repeatable reset without reference-clearing and deletion-order logic.

Finish the case's operations, including all competing transactions, before cleanup.
Retain P020's sequential cases and independent connections within concurrency cases.
Assertions verifying lifecycle behavior occur before fixture cleanup; this reset is not
an application deletion path. P076 and quickstart define reset and cleanup procedures;
reset-hook and runner code remain implementation work. No database commands are executed during this planning update.

**Alternative considered**: Option B cleared publication references, deleted snapshots,
then deleted articles using ordered DELETE statements. It preserved the schema but required
more cleanup logic. Not selected.

### Test Compose Project Identity (P056)

**Decision**: Use a fixed dedicated Compose project name for integration test runs,
separate from the normal application project. The user selected option B.

**Rationale**: Keep project naming simple, accepting that runs using this fixed test project
must not overlap.

Each run still starts with a fresh disposable test database and removes its test resources
after completion under P020. Cleanup targets only this test project's resources; application
services and persistent application data remain separate. Fixed project naming does not
permit retaining test data between runs.

Non-overlapping runs are distinct from concurrency cases: a single test case still runs
competing operations through independent database connections. P076 and quickstart define
`northbeam-docs-studio-test`, coordination, cleanup, and command procedures; actual script
code and platform verification follow during implementation.

**Alternative considered**: Option A generated a unique Compose project name per run,
isolating each run's resources and cleanup while requiring name generation. Not selected.

### Test Orchestration Script (P057)

**Decision**: Use one Node.js script to coordinate integration-test startup, test execution,
results, and resource cleanup on Linux and Windows. The user selected option A.
`pnpm run test:integration` invokes this orchestration; `pnpm test` reuses it for the
PostgreSQL-backed portion of the full suite. Unit tests remain database-free under P018.

**Rationale**: Reuse the chosen Node.js runtime and maintain one orchestration implementation
for both host platforms.

The script starts the dedicated Compose test services, waits for database readiness, and
ensures application migrations are applied before Vitest runs under P019. It uses P056's
fixed test project and non-overlapping-run rule. Preserve test failure results while
attempting cleanup after completion and handled failures or interruptions; report cleanup
failures as failures. Cleanup removes only the dedicated test resources and disposable
database, preserving the normal application project and its data.

P076 and quickstart define `scripts/test-integration.mjs`, explicit test service selection,
fixed-project invocations, atomic ownership, and cleanup. Script code and platform
verification remain implementation work. No script, package entry point, or test services
are implemented in this planning update.

**Alternative considered**: Option B maintained separate shell and PowerShell scripts,
using native platform scripting but duplicating orchestration logic. Not selected.

### Migration Execution Command (P058)

**Decision**: Apply versioned SQL migrations using the Drizzle Kit CLI, invoked through
the installed pnpm toolchain as `pnpm exec drizzle-kit migrate`. The user selected option B.
The app startup entry point runs this command before starting Nuxt under P054.

**Rationale**: Use the provided migration command directly. The accepted tradeoff is
including Drizzle Kit in the runtime image.

The runtime image must include the pinned CLI, versioned migration files and metadata,
and required configuration. Use the installed version rather than downloading a CLI
during startup. Drizzle Kit still generates SQL migrations during development under P003;
startup applies reviewed migrations rather than generating schema changes.

Integration-test setup uses the same migration command against its isolated test database
before Vitest runs. The configured database determines the target; application and test
data remain separate. Command failures prevent Nuxt or the integration suite from starting.
Versions are approved in P069. P076 fixes `drizzle.config.ts`, `server/db/schema.ts`,
and `drizzle/`; P060/P076 fix runtime/test packaging responsibilities. Dockerfile and
migration code remain implementation work. No commands or installations run here.

**Alternative considered**: Option A used a small runner with Drizzle ORM's migrator,
reusing the ORM at runtime but requiring a migration script. Not selected.

**Evidence**: [Drizzle migration execution options](https://orm.drizzle.team/docs/migrations).

### Node Container Base Image (P059)

**Decision**: Use Debian slim variants of the official Node.js 24 images for the application
and Node-based build/test containers. The user selected option A.

**Rationale**: Favor dependency compatibility with Debian's glibc-based environment,
consistent with the runtime selection rationale in P052. The accepted tradeoff is a larger
base image than Alpine.

Preserve P058's requirement to include Drizzle Kit, pnpm, migration files/metadata, and
required configuration where migrations run. Debian Bookworm, the Node patch, and image
tag are approved in P063. Remaining dependency compatibility and container build/run
verification are still required.
No Dockerfile, image build, or package installation is performed in this planning update.

**Alternative considered**: Option B used Alpine, offering smaller images but a musl-based
environment that can require compatibility adjustments for native dependencies. Not selected.

**Evidence**: [Official Node image variants](https://github.com/nodejs/docker-node/blob/main/README.md#image-variants).

### Docker Build Structure (P060)

**Decision**: Use a multi-stage Docker build to separate build/test tooling from the final
application runtime. The user selected option A. Node-based stages retain the Node.js 24
Debian slim baseline approved in P059.

**Rationale**: Keep build/test tooling separate from runtime files, accepting additional
Dockerfile structure.

Build stages install the required dependencies and produce the Nuxt application output.
The runtime stage includes that output, required runtime dependencies, and P058's installed
Drizzle Kit CLI, pnpm, migration files/metadata, and configuration. Migration execution
still precedes Nuxt startup under P054. The dedicated test runner retains its required
test dependencies under P019; normal application startup does not run the test services.

The Node image is pinned in P063. Use dependency/build stages plus runtime and test
targets under P076. The runtime retains migration tooling/assets; the test target includes
production output and test dependencies. Copy/install instructions are implementation work;
no Dockerfile or container builds are added here.

**Alternative considered**: Option B used a single-stage build, simplifying the Dockerfile
but retaining source and build/test dependencies in the final image. Not selected.

**Evidence**: [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/).

### Direct Dependency Version Declarations (P061)

**Decision**: Declare exact versions for direct dependencies and development dependencies
in `package.json`, retaining `pnpm-lock.yaml`. The user selected option A. Docker dependency
installation uses `pnpm install --frozen-lockfile`.

**Rationale**: Make direct dependency updates explicit and reviewable in both the manifest
and lockfile.

The lockfile records resolved transitive dependencies. Exact direct versions do not replace
the lockfile or prove compatibility; research and build/test verification remain required.
Frozen Docker installs fail when the manifest and lockfile disagree rather than updating
the lockfile during the build. Exact package versions are approved in P069; application compatibility verification remains
scaffolding work;
no package manifest, lockfile, installation, or Dockerfile is created here.

**Alternative considered**: Option B used compatible version ranges with the same lockfile,
permitting matching updates when the lockfile is updated. Frozen-lockfile installs can
also make that approach repeatable. Not selected.

**Evidence**: [pnpm frozen-lockfile installation](https://pnpm.io/cli/install#--frozen-lockfile).

### Nuxt Version Baseline (P062)

**Decision**: Pin Nuxt to version `4.6.4`. The user approved the proposed baseline.
Apply P061's exact-version and lockfile policy.

**Rationale**: Use the supported stable Nuxt release verified during planning, consistent
with the chosen framework and universal rendering approach.

The published source manifest requires `^24.15.0` for the Node 24 release line. P063 pins
Node 24.22.2, satisfying that requirement; P052's major-version choice remains in effect.
Vue 3.5.45 is approved in P067 and satisfies Nuxt's declared Vue range. Match remaining
supporting dependencies to Nuxt's published requirements. Metadata
review does not replace production-build, type-check, or test verification after scaffolding.

**Alternatives considered**: Nuxt 3's maintenance period ended July 31, 2026; it is not the
selected baseline. A prerelease framework version is not selected.

Supporting dependency pins are approved in P069; configuration is consolidated in P076. No packages
are installed or application files created in this planning update.

**Evidence**: [Nuxt 4.6.4 release](https://github.com/nuxt/nuxt/releases/tag/v4.6.4),
[package requirements](https://github.com/nuxt/nuxt/blob/v4.6.4/packages/nuxt/package.json),
and [support roadmap](https://nuxt.com/docs/4.x/community/roadmap/), checked on 2026-11-07.

### Exact Node Runtime and Image (P063)

**Decision**: Pin Node.js to `24.22.2` and use the official image
`node:24.22.2-bookworm-slim` for the approved Node-based container stages. The user approved
this runtime/image proposal. Development tooling follows the same Node patch baseline.

**Rationale**: Satisfy Nuxt 4.6.4's Node 24 minimum while retaining the approved Debian slim
approach and Node 24's default Debian Bookworm baseline.

Official release metadata and image tags were checked on 2026-11-07. Version/image selection
does not replace build/test or platform verification. Retain the multi-stage layout and
required migration tooling under P058/P060. No runtime or image is installed or built here.

**Alternative considered**: `node:24.22.2-trixie-slim` uses newer Debian 13; it was not selected.

**Evidence**: [Node 24 release checksums](https://nodejs.org/download/release/v24.22.2/SHASUMS256.txt),
[official Node image tags](https://github.com/docker-library/official-images/blob/master/library/node),
and [Nuxt package requirements](https://github.com/nuxt/nuxt/blob/v4.6.4/packages/nuxt/package.json).

### Exact PostgreSQL Version and Image (P064)

**Decision**: Pin PostgreSQL to `18.6` and use the official `postgres:18.6-bookworm` image
for both application and isolated integration-test databases. The user selected option A.

**Rationale**: Match the Node image's Debian Bookworm baseline and use the same PostgreSQL
version/image for application behavior and database-backed verification.

The application database retains its persistent volume. Test databases remain disposable
and isolated under P020/P056. This image selection does not change migration execution,
schema constraints, transaction behavior, or data reset rules. Volume mounts and remaining
Compose configuration still require design and verification. No database containers are
started or images pulled in this planning update.

**Alternative considered**: `postgres:18.6-trixie` uses newer Debian 13 and follows the
default PostgreSQL 18 image variant. Not selected.

**Evidence**: [Official PostgreSQL image tags](https://github.com/docker-library/official-images/blob/master/library/postgres),
checked on 2026-11-07.

### Exact pnpm Version (P065)

**Decision**: Pin pnpm to `12.18.0` for development and containers. The user approved this
version proposal. Retain P061's exact direct dependency versions, lockfile, and frozen
Docker dependency installs.

**Rationale**: Use one consistent published stable package-manager version across
development and container workflows.

The published package declares Node `>=18`, covering the selected Node 24.22.2 runtime.
This metadata check does not establish full application or platform compatibility; those
checks remain required after scaffolding. Container provisioning is approved in P066;
project configuration is consolidated in P076 and quickstart. No package manager is installed or
updated in this planning task.

**Evidence**: [pnpm 12.18.0 package metadata](https://registry.npmjs.org/pnpm/12.18.0),
checked on 2026-11-07.

### Container pnpm Provisioning (P066)

**Decision**: Install the approved pnpm version in Node containers using npm:

```text
npm install --global pnpm@12.18.0
```

The user selected option A. Provision pnpm during image construction before dependency
installation; retain it in the runtime image for P058's migration command. Image-stage
reuse and packaging follow the approved multi-stage approach in P060.

**Rationale**: Reuse npm already available in the Node image for straightforward, explicitly
versioned provisioning.

Application dependency installs still use the frozen lockfile under P061. Development
uses the same pnpm version under P065; this container decision does not run an installation
on the host. Dockerfile commands and development setup documentation remain implementation
work. No package installation or image build is executed here.

**Alternative considered**: Option B used pnpm's standalone installer pinned to 12.18.0,
requiring download-script and PATH configuration. Not selected.

**Evidence**: [pnpm installation using npm](https://pnpm.io/installation#using-npm).

### Exact Vue Version (P067)

**Decision**: Pin Vue to `3.5.45`. The user approved this version proposal. Use P061's exact
direct dependency declaration and lockfile policy.

**Rationale**: Use the current stable Vue patch checked during planning, within Nuxt 4.6.4's
declared `^3.5.44` range.

Keep local reactive editor state, universal rendering, and the shared Markdown display
component under P048/P050/P051. Package metadata establishes version-range compatibility;
production build, type-check, and test verification remain required after scaffolding.
No package installation or application files are created here.

**Alternative considered**: Vue `3.5.44` matches Nuxt's repository baseline but is an older
patch. Not selected.

**Evidence**: [Vue 3.5.45 package metadata](https://registry.npmjs.org/vue/3.5.45) and
[Nuxt 4.6.4 dependency catalog](https://github.com/nuxt/nuxt/blob/v4.6.4/pnpm-workspace.yaml),
checked on 2026-11-07.

### Typechecking Toolchain (P068)

**Decision**: Use `pnpm exec nuxt typecheck`, with TypeScript `6.0.3` and `vue-tsc` `3.3.14`
as exact development dependency pins. The user selected the Nuxt command from the proposed
typechecking setup. These versions match Nuxt 4.6.4's development catalog.

**Rationale**: Follow Nuxt's typechecking conventions while checking application types,
including Vue components, through the framework command.

Nuxt's command invokes `vue-tsc`. Keep typechecking as a distinct verification step
alongside the production build and automated suite; metadata alignment does not establish
that this application's checks pass. Exact package scripts and project configuration remain
implementation work. No package installation or typecheck is run before scaffolding.

**Alternative considered**: Invoke `vue-tsc` directly. The Nuxt wrapper was selected to
retain framework conventions.

**Evidence**: [Nuxt typecheck command](https://nuxt.com/docs/api/commands/typecheck) and
[Nuxt 4.6.4 development catalog](https://github.com/nuxt/nuxt/blob/v4.6.4/pnpm-workspace.yaml),
checked on 2026-11-07.

### Approved Dependency Pin Matrix (P069)

**Decision**: Adopt the following exact package pins under the user's explicit approval
of all recommended pins. This includes the proposed Vitest/Vite pair and completes version
selection for the already approved libraries and their necessary supporting packages.
Retain P061's lockfile and frozen-install policy.

| Package | Pin | Role |
| --- | --- | --- |
| `nuxt` | `4.6.4` | Framework; P062 |
| `vue` | `3.5.45` | UI runtime; P067 |
| `vue-router` | `5.4.0` | Nuxt's native page routing |
| `drizzle-orm` | `0.45.4` | Database runtime |
| `drizzle-kit` | `0.31.11` | Migration CLI; ship in runtime under P058 |
| `pg` | `8.23.1` | PostgreSQL driver |
| `zod` | `4.6.7` | Request validation |
| `markdown-it` | `15.0.3` | Shared Markdown renderer |
| `typescript` | `6.0.3` | Development/typechecking; P068 |
| `vue-tsc` | `3.3.14` | Development/typechecking; P068 |
| `vitest` | `5.0.5` | Development/testing |
| `vite` | `8.3.5` | Development/build/test tooling |
| `tailwindcss` | `4.3.5` | Development/CSS build |
| `@tailwindcss/vite` | `4.3.5` | Development/CSS integration; P070 |
| `@types/node` | `24.19.2` | Development/Node 24 declarations |
| `@types/pg` | `8.23.1` | Development/PostgreSQL declarations |

The Tailwind integration package and method are approved in P070. Use only the selected
Vite integration for Tailwind; do not add competing integration packages.

**Rationale**: Use stable releases aligned with the approved framework/runtime while
keeping required supporting packages explicit and avoiding per-package approval prompts.
The user's delegation concerns version pins; other architecture decisions still require
human selection under Principle VI.

Compatibility and scope findings:

- Nuxt's official starter declares Vue Router, so its pin supports the selected native
  routing approach rather than adding a custom router. The Vite/Vitest/typechecking and
  Node declaration pins match Nuxt 4.6.4's catalog. [Starter](https://github.com/nuxt/starter/blob/v4/package.json),
  [catalog](https://github.com/nuxt/nuxt/blob/v4.6.4/pnpm-workspace.yaml).
- Drizzle ORM 0.45.4 and Kit 0.31.11 use matching compatibility API version 10.
  Use their stable tagged APIs when writing schema/migrations; current RC documentation
  is not a reason to switch to a prerelease. [ORM compatibility declaration](https://github.com/drizzle-team/drizzle-orm/blob/0.45.4/drizzle-orm/src/version.ts),
  [Kit compatibility check](https://github.com/drizzle-team/drizzle-orm/blob/drizzle-kit%400.31.11/drizzle-kit/src/cli/utils.ts),
  [Kit manifest](https://github.com/drizzle-team/drizzle-orm/blob/0.45.4/drizzle-kit/package.json).
- ORM's `pg >=8` peer and pg's Node `>=16` requirement cover the selected driver/runtime
  versions. [ORM manifest](https://github.com/drizzle-team/drizzle-orm/blob/0.45.4/drizzle-orm/package.json),
  [pg manifest](https://github.com/brianc/node-postgres/blob/pg%408.23.1/packages/pg/package.json).
- Zod 4.6.7 is a stable release; retain its documented strict TypeScript requirement.
  [Release](https://github.com/colinhacks/zod/releases/tag/v4.6.7), [requirements](https://zod.dev/).
- markdown-it 15.0.3 bundles TypeScript declarations, so do not add a separate
  `@types/markdown-it` dependency. [Tagged manifest](https://github.com/markdown-it/markdown-it/blob/15.0.3/package.json).
- Tailwind's Vite plugin accepts Vite 8. The selected plugin is the official minimal
  Nuxt recipe, with no component library selected. [Plugin manifest](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.5/packages/%40tailwindcss-vite/package.json),
  [Nuxt integration guide](https://tailwindcss.com/docs/installation/framework-guides/nuxt),
  [core package metadata](https://registry.npmjs.org/tailwindcss/latest).
- The pg declarations have a published TypeScript 6 tag; keep Node declarations on the
  chosen 24.x line. [pg declarations](https://www.npmjs.com/package/%40types/pg?activeTab=versions),
  [Node declarations](https://www.npmjs.com/package/%40types/node?activeTab=versions).

These checks concern published metadata and tagged source, researched on 2026-11-07.
Actual dependency resolution, lockfile generation, production build, typecheck, automated
tests, and platform verification remain implementation gates. No packages, application
files, lockfile, or containers are created by this planning task. Source layout, contracts,
and P076 configuration are consolidated in the generated artifacts for final human review.

### Tailwind Integration Method (P070)

**Decision**: Integrate Tailwind through the official `@tailwindcss/vite` plugin, pinned
to `4.3.5` alongside `tailwindcss` `4.3.5`. The user selected option A.

**Rationale**: Reuse the existing Nuxt/Vite build pipeline and follow Tailwind's official
Nuxt recipe.

Register the plugin in Nuxt's Vite configuration and import Tailwind through one global
CSS file registered with Nuxt. Keep this configuration consistent across development and
the production build. The chosen plugin's peer range includes the approved Vite 8.3.5.
Use `app/assets/css/main.css` and `nuxt.config.ts`; config code follows during implementation; no package installation,
CSS, or application configuration is created by this planning update.

**Alternative considered**: Option B used `@tailwindcss/postcss` through Nuxt's PostCSS
configuration, with additional explicit integration packages. Not selected.

**Evidence**: [Official Tailwind Nuxt recipe](https://tailwindcss.com/docs/installation/framework-guides/nuxt),
[plugin package requirements](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.5/packages/%40tailwindcss-vite/package.json),
and [PostCSS alternative](https://tailwindcss.com/docs/installation/using-postcss).

### Editor Composable Organization (P071)

**Decision**: Put editor state and API actions in `useArticleEditor()`, planned at
`app/composables/useArticleEditor.ts`. The user selected option A. The editor page consumes
the composable and retains presentation responsibilities.

**Rationale**: Separate state/action logic from markup for focused review of the editor's
multiple lifecycle actions, accepting one additional file.

Create reactive state for each invocation within the calling editor's scope, preserving
P048's local-state approach and P050's universal rendering. Do not introduce a module-global
mutable editor singleton. Use native Nuxt fetching; keep editable draft values separate
from server responses and saved revisions so conflicts do not overwrite unsaved text.
Retain explicit saving before publication and the approved lifecycle action behavior.

Form/history component boundaries are approved in P072. The UI/service contract defines
composable inputs, exposed responsibilities, and component data flow; exact property names
are implementation detail. No composable or page implementation
is added in this planning task.

**Alternative considered**: Option B kept state and actions in the editor page's script,
with fewer files but combined state/action and presentation logic. Not selected.

### Editor Presentation Components (P072)

**Decision**: Separate editor presentation into `ArticleEditorForm.vue` and
`ArticleHistory.vue`, planned under `app/components/`. The user selected option A.
The editor page uses `useArticleEditor()` to own editor state and API actions and connects
the two components. The history panel remains in the editor under User Story 12.

**Rationale**: Keep form and history markup focused and independently reviewable, accepting
two additional files.

The form presents editable fields and the approved save/publication controls; the history
component presents snapshot listing, inspection, restoration, and deletion controls.
Components receive the relevant state/status and communicate user actions to the owning
page/composable. Keep the shared Markdown display component under P051 and all existing
save, revision, conflict-preservation, and protected-deletion behavior.

The UI/service contract defines inputs and emitted intents. Exact property names and source code remain implementation work. No Vue
components or application files are created in this planning task.

**Alternative considered**: Option B kept form and history markup inside the editor page,
with fewer files but a larger page template. Not selected.

### Article Creation Page (P073)

**Decision**: Give article creation a dedicated page reached from the writer list.
The user selected option B. After successful draft creation, open the new article's editor.

**Rationale**: Give creation a focused view, accepting an additional route and page.

Collect the required title and supplied slug, using the approved empty body/tags defaults.
Submit through the approved creation API and display its validation/conflict feedback.
Creation remains separate from publication; content editing and explicit save/publication
actions continue in the editor. Slug normalization and uniqueness rules remain unchanged.

The page URL `/writer/articles/new` and source `app/pages/writer/articles/new.vue` are
approved in P074. No page, route, or API implementation is added in this planning task.

**Alternative considered**: Option A put a small creation form on the writer list, then
opened the editor, requiring fewer pages. Not selected.

### Browser Page Route Map (P074)

**Decision**: Use the following browser routes through Nuxt's native page routing.
The user approved the proposed map; the writer editor now uses the user-selected slug route
with an `/edit` suffix (Phase 12 review).

| Browser route | Purpose | Planned page source |
| --- | --- | --- |
| `/` | Public article list | `app/pages/index.vue` |
| `/articles/:slug` | Published article | `app/pages/articles/[slug].vue` |
| `/writer/articles` | Writer article list | `app/pages/writer/articles/index.vue` |
| `/writer/articles/new` | Dedicated creation page | `app/pages/writer/articles/new.vue` |
| `/writer/articles/:slug/edit` | Editor with history panel | `app/pages/writer/articles/[slug]/edit.vue` |

**Rationale**: Make the public list the direct landing page and keep writer journeys under
one article route namespace.

Creation opens the new article's editor after success under P073. Writer article IDs remain
UUIDs internally. The user selected `/writer/articles/:slug/edit` during Phase 12 review,
keeping creation at `/writer/articles/new` so the valid slug `new` cannot collide with it.
Both writer and public browser links use the fixed slug; public visibility/404 rules remain required.
The editor uses P071/P072's composable and components; the history panel stays in that page.
API routes retain the P025 map, including the writer-only slug lookup added for this change.
The original map was planning-only; writer slug routing is implemented during Phase 12 review.

**Alternative considered**: Place the public list at `/articles` and redirect `/` there.
Not selected.

### Consolidated Database Schema with Audit Timestamps (P075)

**003 supersession (approved, not implemented):** Published equality preserves revision and
updatedAt; unpublished equality advances both once but preserves the retained reference,
counter, and first date. First/different content creates a snapshot. The original decision
record below remains historical; the [003 model](../003-idempotent-publish/data-model.md)
and [contract](../003-idempotent-publish/contracts/publish.md) govern dependent implementation.

**Decision**: Adopt the consolidated two-table schema below with audit timestamps.
The user selected option B, adding article `created_at`/`updated_at` and snapshot
`created_at` to the proposed minimal schema. All columns are NOT NULL except the two
explicitly nullable article publication fields.

`articles`:

| Column | PostgreSQL type | Default / role |
| --- | --- | --- |
| `id` | `uuid` | Primary key; application-generated UUIDv4 |
| `slug` | `text` | Unique; supplied and normalized on creation |
| `status` | `text` | Default `draft`; allowed-status CHECK |
| `draft_title` | `text` | Supplied title |
| `draft_body` | `text` | Default empty string |
| `draft_tags` | `text[]` | Default empty array |
| `revision` | `integer` | Default `0` |
| `next_version_number` | `integer` | Default `1` |
| `current_published_version_id` | `uuid` | Nullable; initially NULL |
| `published_at` | `timestamptz` | Nullable; initially NULL; first publish sets it |
| `created_at` | `timestamptz` | Default `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamptz` | Default `CURRENT_TIMESTAMP` |

`article_versions`:

| Column | PostgreSQL type | Default / role |
| --- | --- | --- |
| `id` | `uuid` | Primary key; application-generated UUIDv4 |
| `article_id` | `uuid` | Owning article foreign key |
| `version_number` | `integer` | Supplied by transactional article counter |
| `title` | `text` | Copied from saved draft |
| `body` | `text` | Copied from saved draft |
| `tags` | `text[]` | Copied from saved draft |
| `created_at` | `timestamptz` | Default `CURRENT_TIMESTAMP` |

Constraints and persistence rules:

- `articles.slug` is unique. Normalize and validate before insertion; the constraint
  also prevents concurrent creation of duplicate stored slugs.
- `article_versions.article_id` references `articles.id` with restrictive deletion.
- Snapshot `(article_id, version_number)` is unique. Snapshot `(article_id, id)` has the
  supporting unique constraint required by P010.
- Article `(id, current_published_version_id)` references snapshot `(article_id, id)` with
  `ON DELETE RESTRICT`, enforcing ownership and protecting retained references.
- Article status permits only `draft`, `published`, and `unpublished` under P023.
- A BEFORE UPDATE row trigger rejects snapshot updates under P022, including changes to
  snapshot audit metadata. Snapshot insertion and eligible deletion remain permitted.
- Use the indexes supporting primary/unique constraints for this initial schema.
  State/date consistency, counter ranges, text/tag validation, slug immutability, and
  non-reuse of deleted version numbers retain their approved application enforcement.

Audit behavior follows the existing timestamp conventions in P035/P036. Database defaults
set creation times; article mutation statements explicitly set `updated_at` to
`CURRENT_TIMESTAMP` in the same transaction as successful save, restore, publish, or
unpublish. This includes unchanged saves/restores that advance revision under P029.
Reads, rejected operations, and snapshot deletion do not change the article row's audit
timestamps. Article `created_at` is preserved; snapshot `created_at` remains immutable.
These values represent database transaction time rather than a guaranteed unique ordering.
History continues to sort by descending version number.

**Rationale**: Add audit tracking while retaining the approved draft/snapshot separation
and lifecycle invariants. Reuse database timestamp types/clock and existing article writes
rather than adding an audit-update trigger.

Audit fields are stored tracking data; the approved P029/P030 API representations continue
as defined. SQL migration/trigger definitions and Drizzle declarations are implementation
work. No database commands or application code are added here.

**Alternative considered**: Option A used the same required lifecycle schema without
the three audit fields. Not selected. Audit fields also appear in the brief's suggested
data shape, which is guidance rather than a required layout.

### Consolidated Local Runtime and Verification Configuration (P076)

**Decision**: Adopt the consolidated Docker/test configuration with working local defaults
and optional `.env` overrides. The user selected option A. Runtime and verification
procedures are specified in [quickstart.md](quickstart.md).

| Area | Selected design |
| --- | --- |
| Normal project | `northbeam-docs-studio`; services `app` and `db` |
| Startup | `docker compose up --build`; healthy db, CLI migrations, production Nuxt server |
| Browser access | `http://localhost:3000`; default host mapping `127.0.0.1:3000:3000` |
| Database access | Compose network only; no host database port |
| Application storage | Project-scoped named `postgres_data` volume at `/var/lib/postgresql` |
| Database configuration | Private `DATABASE_URL` supplied separately to app/test processes |
| Local defaults | Database/user `northbeam`; password `northbeam_local`; optional overrides documented |
| Test project | Fixed `northbeam-docs-studio-test`; `test-db` and `test-runner` services in the test profile |
| Test storage | Fresh project-scoped test volume per run; removed on completion |
| Test coordination | One Node runner; reject overlap before resource changes; cleanup only its test project |
| Unit coverage | Database-free validation, Markdown rendering, and pure helpers |
| Integration coverage | Built Nuxt HTTP API plus real PostgreSQL assertions and coordinated independent connections |
| Restart coverage | Automated application-process restart against retained test data; Compose/database restart walkthrough |
| UI coverage | Manual required-flow walkthrough; no browser-test dependency selected |
| Developer gates | Full suite, separate typecheck, production build, and documentation review |

**Rationale**: A clean checkout starts with one command while retaining reproducible
developer verification and application/test resource isolation.

Use `drizzle.config.ts` with PostgreSQL dialect, `server/db/schema.ts`, SQL output in
`drizzle/`, and the process's `DATABASE_URL`. Keep the Drizzle migration journal separate
from application-table resets. Build the production output and a test target through
the same multi-stage Dockerfile; the test target retains required dev dependencies.
The Node integration runner is implemented at `scripts/test-integration.mjs`; package entry
points remain those in P018/P021. Use one Vitest configuration with unit/integration
projects, sequential integration cases, and P055's explicit two-table reset.

The runner sets a dedicated test database URL before launching migrations and the built
server. It waits for readiness, preserves test failure results, handles cleanup on normal
completion/handled failure or interruption, and reports cleanup failures. Atomic runner
coordination applies to the fixed test project; a rejected overlapping invocation must
not clean up the active invocation's resources.

HTTP tests use Node's native fetch; SQL assertions use the approved pg driver. Coordinate
concurrency cases with database locks and distinct backend connections rather than relying
on unverified timing. Inject a temporary database failure in the isolated test database
to prove publish rollback; restore fixture changes before later cases. No HTTP-test or
browser-automation library is added.

Platform support is a design target, not an executed verification result. Actual Windows,
Linux, fresh-start, and persistence checks remain delivery gates. No Docker commands,
package installs, application scripts, or service configuration are executed/created here.

**Alternative considered**: The same configuration with a mandatory `.env` setup step.
Not selected.

**Evidence**: [PostgreSQL 18 image storage layout](https://github.com/docker-library/docs/blob/master/postgres/README.md),
[Compose startup ordering](https://docs.docker.com/compose/how-tos/startup-order/),
[project isolation](https://docs.docker.com/compose/how-tos/project-name/), and
[profiles](https://docs.docker.com/compose/how-tos/profiles/).

### Host Development Server (P077)

**Decision**: Support host development without Docker, explicitly requested by the user.
Provide `pnpm dev` as the package command for `nuxt dev --host 127.0.0.1 --port 3000`.
It runs the same Nuxt UI/API with hot reload against a configured host-accessible PostgreSQL
instance. A fully Docker-free workflow requires locally installed PostgreSQL; use the
approved database version, schema, and migration CLI.

**Rationale**: Allow direct local development and fast feedback alongside the existing
one-command Docker reviewer startup. Reuse the selected framework and database tooling.

Set server-only `DATABASE_URL` in the terminal, install locked dependencies, and apply
migrations before first start or after new migrations. Host URLs use a reachable address
such as `127.0.0.1:5432`, not Compose's private `db` hostname. The [quickstart](quickstart.md)
documents POSIX/PowerShell configuration and commands. The dev command does not install/start
PostgreSQL or apply migrations. Avoid running both app workflows on port 3000 simultaneously.

The prior Docker deployment and isolated integration-test workflows remain approved.
Host development is an additional execution path, with actual platform/startup verification
required during implementation. No package script or application code is created here.

## Implementation evidence through Phase 2

On 2026-11-07, macOS arm64 with Linux containers: Node 24.22.2/pnpm 12.18.0, the active
Nuxt/Vue/Zod/Tailwind/Vitest/TypeScript packages, and the approved stable Drizzle/pg packages
pass build/typecheck and frozen installation. T013 adds the approved markdown-it 15.0.3 pin.
`pnpm-workspace.yaml` permits esbuild scripts and is copied for container installs.

The 19-column schema, named constraints, and immutable-row trigger have versioned SQL and
Drizzle journal/snapshots. The CLI generates without a live connection; app startup applies
the installed migrations before serving. The multi-stage Dockerfile provides runtime and
test targets; runtime excludes Vitest while retaining migration tooling. A migration failure
prevents serving, and app restart leaves the migration journal at two entries.

The complete command passes 15 unit and 32 real PostgreSQL/HTTP foundation tests. Test
runs use fixed project `northbeam-docs-studio-test`, dedicated credentials/database/network,
a fresh disposable volume, sequential cases, and explicit two-table reset. Actual failure,
SIGTERM, and overlapping-run probes verified status/cleanup and active-resource protection
using a disposable copy; original repository tests were unchanged. Normal application
resources were preserved. The temporary validation project was removed after checks.

Port 3000 was already occupied; the validation app used a temporary loopback-3300 override.
The committed default is loopback 3000. Windows/Linux host execution, lifecycle operations,
concurrency races, and later feature UI remain unverified/unimplemented. Phases 1–3 are approved;
Write/Preview tabs are the selected UI design; Phases 1–14 are approved; work through Phase 17 is verified except Windows T028. See [README.md](../../README.md) for current commands.

## Entry chooser requested during Phase 4 review

The user selected a native Public/Writer modal before the homepage, while explicitly
keeping T011 public listing in Phase 7. On a fresh root entry, hide the Articles placeholder
until Public is selected or Escape dismisses the chooser; Writer navigates directly to the
existing writer list. Retain selection only during client navigation and preserve deep links.
The root no longer presents an Open writer workspace landing action. Public lists remain
unimplemented; this navigation change adds no routes, dependencies, authentication, or APIs.

## Writer query simplification requested during Phase 4 review

The user requested less repetitive column selection after the feature was completed.
Use select-all plus the existing toWriterArticle response mapper for the single-article
writer lookup, matching creation's returning/mapping pattern. The mapper accepts the
inferred article row type rather than repeating a nine-field Pick. Retain the summary
query's four-column selection because it intentionally omits potentially large bodies.
The user explicitly selected “Keep current names; simplify queries” on 2026-11-07.
Retain draftTitle/draftBody/draftTags and their SQL names draft_title/draft_body/draft_tags;
these distinguish editable content from published snapshots. No schema, migration, or
HTTP field is renamed in this cleanup. Exact-response tests continue to prove
that counter/audit columns are not returned.

## Phase 4 implementation evidence

Draft creation validates the approved fields and defaults, generates UUIDv4 keys, maps
named slug conflicts, and returns the WriterArticle allowlist. Writer list/detail reads
validate UUID syntax, use the declared response projections, preserve read audits/revisions,
and reopen persisted drafts after a built-server restart. Native production 500 errors
hide unexpected database details. Shared process helpers own/start/stop a production
server for each sequential integration test file; restart tests use the same database.

The writer UI follows the approved black/white/green styling with top-header Public/Writer
navigation, list/creation/read-only detail, field/collision/errors, empty/loading feedback,
and deliberate retry. Native page routing required moving the root shell to app/pages/index.vue.
No editing/preview/publishing/history/public list/detail implementation is included.
The user-requested entry chooser is implemented as the Phase 4 follow-up described above;
the root Articles placeholder replaces the former workspace landing action.

`pnpm test` passes 48 unit + 60 integration tests; Nuxt typecheck, explicit changed-test
TypeScript checks, and production build pass. Real Chrome checks at loopback 3300 cover
create/list/open/reload, invalid fields, collisions, missing drafts, failed submissions,
and mobile widths with no runtime exceptions/hydration warnings. macOS arm64 with Linux
containers is verified; Windows/Linux host execution remains unverified. Phase 4 was
subsequently approved by the user when requesting Phase 5.

## Complexity Tracking

No constitutional exceptions proposed. The post-design gates above have been reviewed.
Task generation is complete; cross-artifact analysis, reviewed tasks, and the human git
checkpoint precede application implementation.


## Phase 5 implementation evidence

T008/T013/T023 implement complete-draft saves, shared safe Markdown, and the editable
writer screen using the approved boundaries. Save uses a Read Committed transaction,
article-row lock, expected-revision check, and callback-bound update; unchanged saves
advance revision and stale saves leave stored state unchanged. Published fixtures confirm
saves preserve snapshots, publication metadata, slug, and allocation counter.

The shared markdown-it renderer escapes HTML and permits HTTP/HTTPS/mailto/relative links
and headings while rejecting unsafe and scheme-relative links, including encoded schemes.
MarkdownContent imports through Nuxt's `#shared` alias for universal builds. Editor state
is per invocation; explicit saves update the baseline without replacing newer local edits.
Dirty reload requires confirmation; no autosave, rebase, or newer-token retry is introduced.

97 unit and 75 PostgreSQL/HTTP tests pass, alongside Nuxt typecheck, explicit changed-test
typecheck, and production build. A fresh production Docker app and real Chrome walkthrough
verified two-tab stale-save feedback, reload/cancel/resubmit, delayed-response retention,
network failure, safe preview, keyboard tabs, and mobile layouts without runtime/hydration
errors. Disposable validation resources were removed; development PostgreSQL was preserved.
Phase 5 was subsequently approved by the user when requesting Phase 6. Public lists remain in Phase 7.


## Phase 6 implementation evidence

T009/T010/T024 add publication without changing schema, migrations, dependencies, or the
approved architecture. The native POST publish handler validates only expectedRevision;
the existing Read Committed helper locks the article and checks revision before saved
content eligibility. Publish inserts a UUIDv4 snapshot from the saved title/body/tags,
allocates its locked per-article number, and updates status/reference/date/counters/audit
atomically. Every publish creates a snapshot; republish preserves the first date and
all earlier snapshot content. Saves continue to leave live content unchanged.

Extended existing suites pass 98 unit and 93 real PostgreSQL/HTTP tests. Forced article
update failures after snapshot insertion prove first-publish and republish rollback.
A test-only AFTER INSERT trigger and independent advisory-lock holder establish observed
contention before killing the app with SIGKILL; restart proves no partial transaction,
and the next publish uses version 1. No production test hooks or new testing library were added.

The writer Publish action requires explicit save of dirty content and explains blank-body
ineligibility. It shares pending/error/conflict handling, preserves local edits made during
responses, and never auto-saves/rebases/retries with a newer token. Nuxt typecheck,
changed-test typecheck, and production build pass. Real Chrome/SQL checks verify first and
unchanged publication, original date/reference, save/live isolation, stale publication,
reload/cancel/resubmit, delayed-response retention, network failure, and mobile layouts
without runtime/hydration errors. Disposable resources were removed, preserving development
data. Phase 6 was subsequently approved by the user when requesting Phase 7.


## Phase 7 implementation evidence

T011 adds the public list query, endpoint, PublicSummary type, and universal root page.
The one-statement join checks published status and current-snapshot ownership; it selects
only slug, snapshot title/tags, and original publication date. No body, draft fields,
internal identities, counters, or audit values are fetched into the public representation.
The existing writer query/projection patterns and Nuxt fetching/error patterns are reused.
The earlier root placeholder is replaced; chooser behavior and portal routes remain intact.

Three new cases in the existing integration file failed before implementation and now
pass alongside all prior cases. Evidence covers empty list/API, anonymous exact fields,
draft/unpublished exclusion, unchanged read audits, safe server-rendered titles/tags/date/
links, saved/live isolation, republish/date retention, and restart persistence. Unpublished
fixtures use isolated SQL until the Unpublish phase. Build, Nuxt/changed-test typechecks,
and the full suite pass: 98 unit + 96 PostgreSQL/HTTP tests (194 total).

Real Chrome checks passed chooser/portal navigation, empty/list/tag states, literal
HTML-looking titles, draft/republish isolation, first dates, network error/retry/loading,
and 320/390/1440px maximum-content layouts with 44px article links and no runtime/hydration
errors. Disposable validation resources were removed, preserving normal resources. No
schema, migration, dependency, architecture, ordering, search, or pagination change was
introduced. Phase 7 was subsequently approved by the user when requesting Phase 8.


## Phase 8 implementation evidence

T012/T039 add exact PublicDetail fields, a one-statement slug/published/current-owned-
snapshot query, the native GET endpoint, and the universal reader page. The API returns
only live slug/title/body/tags/original date; absent/draft-only/unpublished records share
404 ARTICLE_NOT_FOUND. Extended existing public-read cases prove exact projection,
unchanged read state/audits, draft privacy, republish/date preservation, and restart.

The page reuses MarkdownContent and the existing renderer policy without modification.
It provides live metadata/body, All articles navigation, loading/error/Retry, and the same
friendly missing-state page for each unavailable state. Nuxt's native setResponseStatus
helper ensures server-rendered missing pages return HTTP 404 without a new error framework.
The installed helper/types were inspected and HTTP behavior verified in integration tests.

After failing page assertions, server-rendered Markdown/link/HTML safety and private-content
exclusion now pass. Build, Nuxt/changed-test typechecks, and full suite pass: 98 unit + 99
PostgreSQL/HTTP cases (197 total). Real Chrome verifies list/detail/back navigation,
identical writer preview, draft/republish isolation, original date, safe rendering,
friendly page/API 404, retry/loading recovery, and 320/390/1440px long-title/code layouts.
A browser-observed small return-link target was enlarged locally to 44px; all checks
passed again. Code scrolls within its block; no runtime/hydration errors occurred.
Disposable resources were removed; normal resources were preserved. No schema, dependency,
Markdown policy, architecture, or later lifecycle feature changed. Phase 8 awaits human
review at that point; the user subsequently approved Phase 8 and requested Phase 9.


## Phase 9 implementation evidence

T014/T036 implement revision-checked Unpublish through the existing thin-handler,
operation-function, and shared Read Committed article-lock patterns. Request validation
precedes lookup; missing articles return 404, stale tokens are checked before publication
eligibility, and draft/already-unpublished state returns INVALID_PUBLICATION_STATE.
Success changes only status/revision/update time, preserving draft, immutable snapshots,
retained reference, first date, counter, and creation time. Public queries immediately
exclude the article and detail/page return 404. Republish retains the date.

Existing unit/request cases were extended across Publish/Unpublish; public SQL unpublished
fixtures now use the real API. New focused cases prove preservation, actual public removal,
stale/state rejection, rollback/recovery, restart, and republish. Typecheck, changed-test typecheck, build,
and full suite pass: 98 unit + 103 PostgreSQL/HTTP cases (201 total).

The writer shows Unpublish only while published and allows it with unsaved local edits.
Its response updates the saved article without replacing local title/body/tags. Pending
and conflict states reuse existing controls; retained references are labeled Last published
snapshot and invalid-state feedback offers explicit reload. Real Chrome/SQL checks prove
text retention before/during responses, publish/unpublish/public/republish flow, original
date, two-tab conflicts/reload/cancel/resubmit, network failure/retry, current public
navigation, invalid-state feedback, and 320/390/1440px layouts with 44px action targets.
No runtime/hydration errors occurred. Pinned-type audit: 39 files/eight Vue scripts, no
findings. Disposable resources were removed; normal resources were preserved. No schema,
dependency, architecture, or later history feature changed. Phase 9 was subsequently
approved by the user when requesting Phase 10.


## Phase 10 implementation evidence

T015/T025 add exact VersionSummary/VersionDetail types, newest-first history and owned
snapshot queries, native GET handlers, and the separate read-only ArticleHistory panel.
Both IDs validate before lookup; missing articles differ from absent/wrong-owner snapshots.
History orders by version number, with tests deliberately opposing UUID/timestamp order.
Reads do not mutate article fields/revision/audits, snapshots, or public output/availability.
Published and unpublished history remain readable; empty drafts return an empty array.

The editor creates native article/history fetches before awaiting both, preserving Nuxt
context and SSR hydration; existing missing-page tests cover the context regression.
Publish refreshes history and explicit refresh handles external changes. Inspection has
separate per-editor pending/error/selection state, clears misleading old detail before a
new request, and never changes local draft inputs. The existing MarkdownContent renderer
handles read-only title/body/tags presentation with current/last-reference labels. Separate
list/inspection loading and retry feedback do not mislabel failures as empty history.

Typechecks, production build, and the full suite pass: 98 unit + 108 real PostgreSQL/HTTP
cases (206 total). Real Chrome/SQL checks verify empty/current/old/retained history, safe
Markdown, publish refresh, exact content, unchanged local/stored/public state, text typed
while reads are pending, network failure/retry/loading, missing-version refresh, reopening,
and 320/390/1440px layouts with 44px controls. Final walkthrough has no runtime exceptions
or hydration warnings. Pinned-type audit: 42 files/nine Vue scripts, no findings.
Disposable resources were removed; normal resources were preserved. No schema, migration,
dependency, architecture, or renderer policy change was needed. Phase 10 was subsequently
approved by the user when requesting Phase 11.


## Phase 11 implementation evidence

T016/T037 add strict Restore requests and a thin native handler that validates both IDs
and expectedRevision before lookup. The existing shared transaction locks the article
and compares revision before resolving the owned snapshot through the callback transaction.
Success copies snapshot title/body/tags into the draft and advances revision/update time,
including identical restores. Slug/status/live reference/counter/first date/creation time,
all history rows, and public content/availability remain unchanged. Missing/wrong-owner
snapshots return SNAPSHOT_NOT_FOUND; a stale well-formed request fails first.

Existing strict-action cases now include Restore; focused HTTP/SQL scenarios verify
old/current/last-published/identical restores in published/unpublished states, precise
preservation, stale-before-target errors, invalid input, rollback/recovery, and restart.
Typechecks, production build, and full suite pass: 98 unit + 112 real PostgreSQL/HTTP
cases (210 total). No new testing framework or production test hook was introduced.

The history control requests explicit confirmation naming the target when the local draft
is dirty; cancel makes no write. Successful Restore loads the saved draft/revision and
reports not published, while newer text typed during a delayed response remains local.
Rejected operations preserve inputs; stale conflicts require explicit reload/resubmit,
and missing targets clear stale inspection with refresh guidance. Real Chrome/SQL checks
cover all restore variants, confirmation/cancel, in-flight edits and next Save, later
explicit Publish, stale/missing/network rejection and recovery, public/history isolation,
reopening, and 320/390/1440px controls with 44px targets. No runtime/hydration errors occurred.
Pinned-type audit: 44 files/nine Vue scripts, no findings. Disposable resources were removed;
normal resources were preserved. No schema, migration, dependency, architecture, or renderer
policy change was needed. Phase 11 was subsequently approved by the user when requesting Phase 12.


## Phase 12 implementation evidence

T017/T038 implement eligible snapshot deletion through a native UUID-validating DELETE
handler and an article-first Read Committed operation transaction. No caller revision is
required. The operation locks the article, checks owned-target existence, rejects the
current/retained reference with SNAPSHOT_PROTECTED, and deletes only the eligible snapshot.
The restrictive ownership/reference FK remains database protection. Success returns empty
204 and changes no article fields/revision/audits/counter or public content/availability.
Deleted versions cannot be inspected/restored and publication continues from the stored
counter without reusing their numbers.

Six new scenarios in the existing integration suite failed before implementation and now
pass alongside prior cases. Tests prove eligible/protected behavior in both publication
states, malformed/missing/wrong-owner IDs, exact preservation, rollback/retry, restart,
deleted-target rejection, and later number allocation. Typechecks, build, and the full
suite pass: 98 unit + 118 real PostgreSQL/HTTP cases (216 total).

The inspected snapshot offers a version-named confirmation only when locally eligible;
current/retained snapshots display a protection reason. The API remains authoritative.
Success clears selection and refreshes history while leaving the editor baseline and
local buffer untouched. Protected errors request explicit reload, missing targets clear
stale inspection with refresh guidance, and network failures permit deliberate retry.
Real Chrome/SQL checks cover cancel/confirm, before/in-flight text retention, unchanged
article/public state, next Save with unchanged revision, retained protection after unpublish,
missing/protected/network feedback and recovery, counter preservation, and 320/390/1440px
controls with 44px targets. No runtime/hydration errors occurred. Pinned-type audit: 46
files/nine Vue scripts, no findings. Disposable resources were removed; normal resources
were preserved. No schema, migration, dependency, architecture, or renderer policy changed.
Phase 12 was subsequently approved by the user; Phase 13 evidence is recorded below.


## Phase 13 verification evidence

T018 extends existing request/rejection cases across Save/Publish/Unpublish/Restore,
including complete SQL/audit/history/public comparisons, large safe stale revisions,
strict payloads, revision-before-eligibility ordering, and sanitized production failures.
Existing unit validation already covers the required token domain and needed no duplicate cases.

T019/T020 add nine coordinated overlap cases to the existing HTTP integration suite.
A controller connection holds the article row; the helper observes the first HTTP backend
blocked on it and the second queued behind the first, verifies three distinct PIDs, then
releases the row. Both requests settle before reset; cleanup releases barriers on failure.
Save/save, publish/save in both orders, and unpublish/restore in both orders give one
success and one stale conflict with exactly one revision advance. Publish/delete and
restore/delete cover both serialized outcomes, preserving owned references, publication
dates, snapshot contents, counters, audits, and public isolation without deadlock/partial state.

Two real Chrome tabs verify all four stale actions, text entered while the 409 response
is paused, unchanged SQL/public state, no automatic write retry, reload cancel/confirm,
and successful explicit resubmission. No runtime or hydration errors occurred.
Nuxt/test typechecks, production build, and full suite pass: 98 unit + 131 PostgreSQL/HTTP
cases (229 total). No application code, API, schema, migration, dependency, architecture,
or Markdown policy changed. Disposable resources were removed; normal resources were
preserved. The user subsequently approved Phase 13 and authorized Phase 14.


## Phase 14 verification evidence

T021 extends existing unit/HTTP cases for one/100-character normalized slugs, malformed
formats, cross-state duplicate rejection, and immutable slugs. Collision and rejected-edit
checks compare complete SQL/audit/history/public state in draft/published/unpublished states.
Existing lifecycle/restore/restart cases now verify both the stored slug and writer lookup.

The existing competing-create case uses the approved test-only advisory-lock pattern:
pause the first uncommitted insert after insertion, observe the second backend's uniqueness check
waiting on the first transaction, then release. Three distinct PIDs establish actual overlap;
exactly one 201 and one 409 SLUG_CONFLICT leave a single unsuffixed article. Locks, requests,
and fixture DDL are cleaned before reset.

Real Chrome/SQL verifies collision messages and input retention in all states, recovery,
one/100-character creation/redirect/lookup/save, immutable slug URLs/display across lifecycle
actions and reload, and the maximum-length slug at 390px, without runtime/hydration errors.
Build, Nuxt/test typechecks, and 99 unit + 143 PostgreSQL/HTTP cases pass (242 total).
No application code, contract, schema, migration, dependency, architecture, or Markdown policy
change was needed. Disposable resources were removed; normal resources were preserved.
The user subsequently approved Phase 14 and authorized execution through Phase 17.


## Phases 15–17 final verification — November 8, 2026

T026 passed integrated production Chrome acceptance and repeated four-action two-tab
conflict/reload/resubmit checks, with no runtime/hydration errors or application defects.
T027 passed clean-copy default startup from a Linux arm64 Docker CLI container using the
Docker Desktop Linux daemon: private database, loopback app, migrations before serving,
failed-migration non-serving/recovery, and full named-volume SQL/public persistence through
normal down/up. A standalone native Linux host was not separately exercised.

T029 passed Docker-free macOS development with pinned Node/pnpm and local PostgreSQL 18.6:
locked install/migrations, UTF8 writer/public data, in-page HMR, loopback binding, and exact
SQL/public state after dev-server restart. Temporary HMR changes were restored and processes
stopped. T028 remains unchecked because no Windows execution environment is available.

T030–T032 completed the FR/SC evidence map, final developer suite/typechecks/build, README
and artifact/roadmap reconciliation. Unit tests pass without a DB or working Docker socket;
the full 242-test suite provisions/migrates/resets/cleans only its own integration resources.
No new application code, tests, migration, architecture, dependency, or Markdown policy was
needed. FR-013/SC-005 remain partially verified because Windows runtime acceptance is open.
The user authorized this run through Phase 17; The user subsequently authorized Phase 18 review; its evidence is recorded below.


## Phase 18 review evidence — November 8, 2026

Clean-copy default startup/build and the entire README demo plus four two-tab recovery
checks pass without runtime/hydration errors. Runtime/config/test source matches the
workspace byte-for-byte; prior final 242-test/typecheck/build evidence remains applicable.
No application fix or architectural change was needed. Rehearsal resources were removed.

Raw repository-object review confirms spec/plan/tasks/constitution checkpoint `c1249f9`
before first application commit `c9edadd`, with 44 commits reachable from audited HEAD
`32ba2436`. A local review ZIP preserves existing reachable objects/refs while excluding
local configuration/hooks/secrets/generated files. Handoff notes and manifest/checksum
support human review. No git commands, commits, history rewrite, remote write, or submission
were performed. Windows T028 remains open; final review is approved; commits and submission remain human-owned.
