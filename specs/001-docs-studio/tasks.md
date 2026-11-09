# Tasks: Northbeam Docs Studio

**Feature**: `001-docs-studio` · **Created**: 2026-11-07
**Status**: Phases 1–14 approved. The user authorized one-shot execution through Phase 17
on 2026-11-08, including intermediate phase gates. Phase 15 and Phase 17 work is verified;
Phase 16 is partially verified with Windows T028 open. On 2026-11-08 the user authorized
Phase 18 delivery review. T033/T034 review work is verified and the handoff is prepared;
Windows T028 and final human approval remain open.
**Input**: [specification](spec.md), [plan](plan.md), [research](research.md),
[data model](data-model.md), [HTTP contract](contracts/http-api.md),
[UI/service contract](contracts/ui-and-services.md), [quickstart](quickstart.md),
and [constitution](../../.specify/memory/constitution.md).

The specification/plan/task checkpoint was verified against recorded repository objects
before application code, without git commands; the files matched that checkpoint. Analysis
findings were resolved and rechecked. The user approved Phases 1–2 and requested the next implementation, then approved
Phase 3 design, subsequently updated at the user's request to Write/Preview tabs. Later phases retain their own review gates.
AI creates no commits; changes remain for human review. Check task boxes only after implementation
and required verification; phase approval is recorded separately.

## Execution and completion rules

- Follow constitution v1.5.0: implement one small task at a time, verify it, and explain
  changes, results, and limitations at its boundary. Keep subsequent tasks separate unless
  the user explicitly requests the task set in the same prompt. Leave changes uncommitted
  for human review and approval. Obtain human approval before architecture/pattern changes
  and satisfy the required spec-first checkpoint before implementation.
  Aim for 30–60 minutes including review; split an oversized task before implementing it,
  preserving its prerequisites and acceptance evidence.
- Human approval is required at the end of every phase, including the UI design phase. Finish the
  phase's tasks and required checks, present changes, acceptance evidence, documentation
  updates, and remaining issues, then stop. Wait for explicit approval of that phase before
  starting any task in the next phase. Passing checks, approval of this task list, silence,
  or a broad implementation request do not approve a completed phase. Keep approval status
  separate from task checkboxes and record it in that phase's review gate only after the
  human responds. Requested fixes remain in the current phase and require renewed verification
  and review. Within a phase, individual tasks follow the constitution's existing workflow.
- Each checkbox is a complete change with its tests. First inspect relevant existing tests;
  extend or parameterize them where clear. Within a behavior task, establish a failing
  assertion before the implementation, then make the complete existing suite pass. Do not
  mark a separate failing-test-only step complete.
- After scaffolding, every task requires a passing production build, the complete existing
  automated suite, relevant typechecking, and affected documentation updates. Report commands
  and results; do not claim unavailable checks passed. T001 establishes a real database-free
  suite; `pnpm test` runs it until T005 adds the integration suite. From T005 onward,
  `pnpm test` must run both suites and fail if either or test cleanup fails. Do not create
  empty successful integration placeholders or skip required cases to obtain a pass.
- Use the exact approved pins and P001–P077 decisions. Native Nuxt handlers, Zod inputs,
  Drizzle transactions, shared renderer, and local editor state follow the existing contracts.
  Add helpers with their first use; no unused skeletons, speculative layers, or new frameworks.
- Tests use isolated PostgreSQL, never the application database. Integration cases are
  sequential; racing operations within a case use distinct connections with observed lock
  contention. Finish requests/transactions before resetting both application tables.
- Keep comments sparse and useful. Update affected documents in the same task, recording
  what is implemented and what has actually been verified. No stretch features are scheduled.
- All stories are P1. Deliver one usable feature at a time: its API/persistence, UI,
  success/error states, and meaningful tests belong in the same phase. Demonstrate the
  feature through the browser before requesting phase approval. Add only its current
  controls; later features extend the same pages/components without premature stubs.
  US12 interface work is distributed across its owning feature phases; its later phase
  verifies integration rather than building the writer UI for the first time.
- Existing IDs are retained for traceability, so execution order follows the phase layout,
  not numeric ID order. T036–T039 split previously bundled UI work; no product features
  or architecture choices are added. The initial shell and shared schema/test harness are
  necessary foundations, not authorization to implement all business APIs in advance.

## Phase 1: Setup

**Goal**: Buildable host shell, real unit suite, and persistent development PostgreSQL.
**Dependencies**: No feature dependencies.
**Independent test**: Start the shell, pass build/typecheck/unit checks, and restart PostgreSQL without losing a disposable probe.

- [x] T001 Establish the runnable Nuxt/Vue/TypeScript shell and Tailwind Vite integration in `package.json`, `pnpm-lock.yaml`, `nuxt.config.ts`, `tsconfig.json`, `app/app.vue`, and `app/assets/css/main.css`, using the exact P069 pins and packageManager `pnpm@12.18.0`; configure `vitest.config.ts`, implement the first reusable title rule in `server/validation/articles.ts` with its meaningful boundary/Unicode tests in `tests/unit/articles-validation.test.ts`, and provide `pnpm dev`, `test:unit`, `test`, and build entry points. Verify host startup, `pnpm exec nuxt typecheck`, production build, and the existing unit suite; document the scaffold's current capabilities in `README.md` without claiming Docker/integration readiness.
- [x] T002 Add the PostgreSQL service, readiness healthcheck, and project-scoped persistent volume in `compose.yaml`, following P064/P076: project `northbeam-docs-studio`, `postgres:18.6-bookworm`, private `db:5432`, no host database port, and `postgres_data` mounted at `/var/lib/postgresql`; document local defaults/optional overrides in `.env.example` and `README.md`. Verify the database starts and retains a disposable development probe across a normal restart without deleting existing data; the complete app startup contract is completed in T004.

**Verification (2026-11-07, macOS arm64)**: Frozen dependency install, `pnpm test`
(15 title-validation cases), `pnpm exec nuxt typecheck`, and `pnpm run build` passed.
`pnpm dev` returned HTTP 200 with server-rendered shell content and compiled Tailwind CSS.
`docker compose config --quiet` and database readiness passed. PostgreSQL 18.6 used the
project-scoped parent-directory volume with no host port; a uniquely named probe survived
restart, then was removed. Only the current scaffold/database are verified; no application
migrations, lifecycle APIs, full app container, integration suite, or Windows/Linux host
execution is claimed. The verification dev server was stopped; development PostgreSQL remains running.

**Phase approval**: Approved by the user on 2026-11-07. Phase 2 implementation authorized; later phases still require their own approval.

## Phase 2: Foundational persistence and test harness

**Goal**: Migrations, immutable storage protections, Docker startup, and isolated real HTTP/SQL verification.
**Dependencies**: Setup phase approved.
**Independent test**: Fresh migrations, constraints/trigger assertions, production startup ordering, isolated test reset/cleanup, and full suite pass.

**Migration sequence (U1)**: T003 prepares/reviews schema and migration files without a
live database. T004 builds the app image and applies/verifies them inside Compose; T005
automates those checks against isolated test PostgreSQL. Host migration access to the
private Compose database is not required, and no host port or additional service is added.

- [x] T003 Implement the 19 approved columns, named constraints, and snapshot update-rejecting trigger in `server/db/schema.ts` and reviewed SQL/journal files under `drizzle/`; configure `drizzle.config.ts` for PostgreSQL, schema `server/db/schema.ts`, output `drizzle/`, and private DATABASE_URL, and add the reusable pool/client in `server/db/client.ts`. Preserve the model's exact rules: articles are "All columns are NOT NULL except the publication reference and publication date"; snapshots are "All columns are NOT NULL"; status is "`draft`; allowed values: draft, published, unpublished"; revision defaults to `0`, next_version_number to `1`, draft_body to "Empty string", draft_tags to "Empty array", publication fields to NULL, and all three audit defaults to `CURRENT_TIMESTAMP`. Use application UUIDv4 keys, UUID foreign keys, text content, text-array tags, integer counters, and timestamptz dates as mapped in `data-model.md`; snapshot content has no empty defaults. Enforce `UNIQUE(slug)`, `UNIQUE(article_id, version_number)`, supporting `UNIQUE(article_id, id)`, restrictive ownership/current-reference foreign keys, and "BEFORE UPDATE row trigger rejects every snapshot update, including audit fields". Generate and review SQL/migration metadata without connecting to PostgreSQL; schema/config loading for generation must not initialize the application pool or require a live DATABASE_URL connection. Complete this task with schema typechecking, migration-file review/generation, and the existing build/unit checks; do not claim database enforcement is verified yet. Keep the allowed-status database CHECK permitting only `draft`, `published`, and `unpublished` (P023); do not add cross-field publication-state CHECKs (P037), counter-range CHECKs (P042), or a UUID extension. First migration application and direct constraint/trigger checks occur in T004 after the app image exists; automate those assertions in T005.
- [x] T004 Complete production container startup in `Dockerfile`, `.dockerignore`, `compose.yaml`, and `.env.example`: use `node:24.22.2-bookworm-slim`, provision pinned pnpm with npm, copy `pnpm-workspace.yaml` with the manifest/lockfile for the required esbuild script approval, install the frozen lockfile, build production output, and retain Drizzle Kit/config/schema/migrations in the runtime target. Make app startup wait for healthy PostgreSQL, run `pnpm exec drizzle-kit migrate`, and serve Nuxt only after success; expose `127.0.0.1:3000:3000`. This is the first database application/verification of T003's migrations: start a fresh development validation project with `docker compose up --build`; the app container runs the installed CLI against `db:5432` on the Compose network. Verify named uniqueness/ownership/reference constraints and the snapshot update trigger directly using PostgreSQL tools inside the db container (`docker compose exec db psql` with the configured database/user), then automate those assertions in T005. Record the fresh validation project and preserve any existing development data/volumes. Verify startup needs no mandatory .env step, migration failure prevents serving, and restart reapplies no completed migrations; keep secrets/generated output out of the build context. Update the actual run instructions in `README.md` and the implementation status in `quickstart.md`.
- [x] T005 Establish automatic integration verification in `scripts/test-integration.mjs`, `vitest.config.ts`, `tests/integration/helpers.ts`, `tests/integration/database.test.ts`, `package.json`, `Dockerfile`, and `compose.yaml`. Use the test build target, profile services `test-db`/`test-runner`, fixed project `northbeam-docs-studio-test`, a fresh database/volume per run, and atomic overlap rejection before resource mutation. Set test DATABASE_URL before migration/server initialization, migrate with the installed CLI, start the built HTTP server and await readiness, and run files/cases sequentially. Reset `articles` and `article_versions` together without CASCADE, preserving the schema/journal; automate T003's uniqueness/ownership/reference/immutability assertions and an HTTP readiness smoke check. Verify independent test/app resources, a second run starts empty, overlap rejection leaves the active run untouched, and owned cleanup handles success/failure/interruption while preserving failure status. Add the real `test:integration` entry point and make `pnpm test` run both suites. Provide only the HTTP/SQL/process helpers used by these checks; document prerequisites and cleanup behavior in `README.md`.

**Verification (2026-11-07, macOS arm64 with Linux containers)**: T003 generated two
versioned migrations without a live database, passed schema drift review/typecheck/build,
and retained explicit types for the circular table relationship. T004's runtime image
applied both migrations, served HTTP 200, retained two journal entries after app restart,
and did not serve after a migration connection failure. Direct SQL verified uniqueness,
status/ownership/reference protections, and snapshot update rejection; fixtures rolled back.
Port 3000 was occupied, so only the isolated validation project used a temporary port-3300
override; the committed default remains loopback 3000.

`pnpm test` passes 15 unit and 32 real PostgreSQL/HTTP integration cases; typecheck and
production build pass. Repeated runs begin empty and remove test containers/network/volume.
A disposable source copy verified failing-suite exit 1 and cleanup, SIGTERM exit 143 and
cleanup, and overlap rejection without changing the active owner/resources. Repository
tests and normal application containers were untouched by these negative probes. Runtime
excludes Vitest; unit tests remain database-free. The temporary validation project was
removed after review checks; existing development PostgreSQL and the port-3000 process
were preserved. Windows/Linux host runs, lifecycle APIs, and UI features remain future work.

**Phase approval**: Approved by the user on 2026-11-07 by requesting the next implementation after the Phase 2 review. Phase 3 design preparation authorized; later phases retain their own gates.

## Phase 3: US12 — UI design and approval (P1)

**Goal**: Human-approved wireframes before the first feature screen.
**Dependencies**: Foundation approved; approved spec and UI/service contract.
**Independent test**: Review all five screen layouts and required feedback states in ui-design.md; explicitly approve design before T022 or any subsequent feature screen.

- [x] T035 [US12] Produce `specs/001-docs-studio/ui-design.md` with simple wireframes and offline rendered mockups/screenshots in `specs/001-docs-studio/design-preview/` for writer listing, creation, editor/history/preview, public listing, and public article detail. Document basic typography, spacing, colors, responsive layout, and loading/empty/validation/success/error/conflict/protected-deletion states using the approved Tailwind approach. Map screens to the existing routes/components and preserve explicit save-before-publish, retained-reference protection, and unsaved-text conflict behavior. Keep design/review within a 30–60 minute target; propose visual choices for human selection without adding UI libraries, application routes/features, or application implementation code. The isolated mockup uses sample data only. Review against the specification and `contracts/ui-and-services.md`, present the wireframes and rationale, and stop for explicit human approval. Keep this task unchecked and do not start feature-screen work in T022, T013, T023–T026, or T036–T039 until the design is approved; later UI implementation must follow it or obtain approval for changes.

**Approved design**: [ui-design.md](ui-design.md) defines all five wireframes, shared styling,
responsive behavior, and required feedback states. The user selected Write/Preview tabs in one full-width panel at all
widths, with history below. Unused layouts and superseded screenshots have been removed. Tab changes preserve unsaved content and never save or publish. Approved routes/components and lifecycle rules are preserved. No application
code, dependencies, or tests were added.

**Draft verification (2026-11-07)**: Reviewed five screens and all required feedback
states against FR-012 and the existing route/component/API projections. Local Markdown
links/fences, stable task IDs, checklist state, and approval gates validated.
`pnpm exec nuxt typecheck`, `pnpm run build`, and `pnpm test` passed (15 unit + 32
PostgreSQL/HTTP cases); owned test resources were removed. These checks preserve the
existing application baseline and do not claim browser/UI implementation or visual approval.

**Rendered-preview follow-up**: At the user's request, added an offline HTML preview
and screenshots for the approved tabbed design, all five screens, and mobile sizing. The toolbar
exercises applicable loading/empty/validation/success/conflict/protection/error states.
Headless Chrome verified the current 48 desktop/mobile screen-state combinations without
JavaScript exceptions or horizontal page overflow, plus key review controls. These are visual
prototype checks; application code and dependencies remain unchanged. Existing passing
47-test/typecheck/build evidence is retained; no application lifecycle implementation is claimed.
The subsequent user requests select Write/Preview tabs and a more polished
Deloitte-inspired black/white/green palette. Only the approved tabbed layout and current
screenshots are retained. Tab keyboard behavior and local edit preservation are verified
with the rendered follow-up: 48 desktop/mobile screen-state checks pass without JavaScript
exceptions or horizontal page overflow; keyboard and typed-content retention checks pass
at 320px, 390px, and 1440px. The requested black/white/green restyle passes the same
checks; primary, link, header, and muted-text colour pairs also pass 4.5:1 contrast checks.
The user also requested a top-header Public / Writer switch, linking to the existing
portal lists with current-portal highlighting on desktop/mobile. All 15 portal navigation
scenarios pass across five screens at 320px, 390px, and 1440px, with 44px-high targets;
the existing 48 screen-state and editor keyboard/text-retention checks also pass. The user clarified that public content is published articles on any topic. Public
headings, navigation, empty states, sample content, and the shell tagline use article
language. Current five-screen
and mobile screenshots are linked from ui-design.md. The user requested removal of unused wireframes: 12 superseded screenshots and the
legacy split/stacked layout controls/code were removed. All 9 current screenshots remain
unchanged; document links and approved-preview behavior were verified. No application
feature implementation is added.

**Article-copy follow-up (2026-11-07)**: Public headings/back links/empty states and
all current article examples use generic article language. The existing shell tagline
now says “A home for your articles.” Updated the specification and affected design/plan
notes; the product name is retained. Refreshed current screenshots and passed public-copy,
48 screen-state, 15 portal-navigation, and editor keyboard/text-retention browser checks.
`pnpm exec nuxt typecheck`, `pnpm run build`, and `pnpm test` pass (15 unit + 32
PostgreSQL/HTTP cases), with isolated test resources cleaned up. No lifecycle API or
feature-screen implementation was started.

**Phase approval**: Final rendered Deloitte-inspired black/white/green design with
Write/Preview tabs explicitly approved by the user on 2026-11-07 after reviewing the
previews and verification results. T035 is complete; the user authorized Phase 4 implementation on 2026-11-07.

## Phase 4: US1 — Create and open a draft (P1)

**Goal**: Create/list/open a persistent draft through the browser.
**Dependencies**: UI design phase approved; foundations ready.
**Independent test**: Create title/slug with empty defaults, see validation/collision feedback, reopen the read-only draft, and retain it across app restart; SQL proves no snapshots/publication fields. Public-route exclusion is additionally checked when public reading exists.

- [x] T006 [US1] Extend `tests/unit/articles-validation.test.ts` and start `tests/integration/articles.test.ts` before implementing create input validation in `server/validation/articles.ts`, `server/services/articles/createArticle.ts`, `server/services/articles/toWriterArticle.ts`, `server/utils/api-errors.ts`, and `server/api/writer/articles/index.post.ts`. Quote and enforce the model rules: title "Nonblank; at most 200 Unicode code points"; slug "Trim/lowercase; 1–100 characters; lowercase ASCII alphanumeric groups separated by single hyphens"; body "At most 100,000 Unicode code points; empty allowed for draft creation/save"; tags "Array of strings; trim/lowercase, drop empty values, deduplicate in first-occurrence order" and "At most 10; each at most 30 code points; same character/hyphen format as slugs". Preserve title/body text; omitted/null creation body/tags normalize to empty values; reject wrong types/unknown fields/malformed JSON with 400 VALIDATION_ERROR. Return the exact 201 WriterArticle with UUIDv4, revision 0, draft status, null publication fields, counter 1, and no snapshot. Map the named normalized-slug violation to 409 SLUG_CONFLICT without a precheck race or automatic suffix; keep unexpected errors native/generic.
- [x] T007 [US1] Extend `tests/integration/articles.test.ts` and its existing process helpers for writer list/load, missing/malformed IDs, unchanged read audit/revision, and draft reopening after a built-server restart using the same test DB; implement the needed projections in `server/services/articles/queries.ts`, `shared/types/articles.ts`, `server/api/writer/articles/index.get.ts`, and `server/api/writer/articles/[articleId]/index.get.ts`. Writer list returns draft title/status and empty `[]`; detail returns only the approved WriterArticle fields. Enforce "Valid UUID syntax; not restricted to UUIDv4 input", distinguishing 400 malformed from 404 valid missing IDs. Use native helpers consistently from `nuxt/server`; do not expose audit fields or allocation counters.
- [x] T022 [US1] Implement `app/pages/writer/articles/index.vue` `app/pages/writer/articles/new.vue`, and a minimal read-only `app/pages/writer/articles/[slug]/edit.vue` using native Nuxt fetching and existing HTTP types. Show draft-title/status summaries, empty/loading/error feedback, navigation, and a focused title/slug creation form; surface field/slug errors and navigate to `/writer/articles/:slug/edit` after successful creation using approved empty body/tags defaults. Let the destination load and display the newly created saved draft, with missing/error states; editing/preview controls arrive in the next feature. Manually verify create → list → open → reload against the real API and keep automated request behavior in `tests/integration/articles.test.ts` rather than adding a browser framework.

**T006 evidence (2026-11-07)**: Extended the existing unit suite before implementation;
missing creation validation failed as expected. Creation now validates/normalizes input,
returns the exact WriterArticle projection, and maps named slug collisions through native
Nuxt errors. Database assertions confirm default state, unchanged conflicting rows, and no
snapshots. Typecheck/build/full suite pass (47 integration cases plus the expanded unit
suite). The shared WriterArticle type was introduced here because the creation projection
needs it; T007 reuses it. T007 is next; Phase 4 approval remains pending.

**T007 evidence (2026-11-07)**: New read scenarios failed before implementation.
List/detail now use explicit projections and native Nuxt errors; valid non-v4 UUIDs
are accepted, malformed IDs return 400, and missing valid IDs return 404. Reads preserve
stored audit/revision fields; built-server restart preserves the created draft and no
snapshots are created. Existing readiness/cleanup moved from the runner into shared
integration process helpers so the same controlled server can be restarted. Sequential
test files each own/start/stop their server; Docker ownership/reset isolation is unchanged.
Typecheck/build/full suite pass: 48 unit and 59 PostgreSQL/HTTP integration cases.
T022 is next; later phases remain unstarted.

**T022 / Phase 4 verification (2026-11-07)**: Approved black/white/green header, portal
navigation, writer list, title/slug creation, and read-only draft detail are implemented.
Initially app/pages/index.vue preserved the root shell when enabling NuxtPage routing;
the later user-requested entry chooser replaces that landing action with an Articles placeholder. Editing/preview/publication/history controls are not exposed.
Chrome against a fresh isolated Compose application at loopback 3300 passed empty-list,
field-validation, create/list/open/reload, normalized-collision/input-retention, failed
submission, missing-draft, and 320/390/1440px responsive checks, with no runtime exceptions
or hydration warnings. Typecheck, explicit test-file typecheck, production build, and
`pnpm test` pass: 48 unit + 60 PostgreSQL/HTTP integration cases. The suite includes
production generic-500 verification and built-server restart persistence. Integration
containers/network/volume are cleaned up; browser validation resources are also removed,
preserving existing development PostgreSQL. Phase 5 remains unstarted.

**Query-review follow-up**: After Phase 4 verification, the user requested less verbose
column selection. Single-article reads now select the full row and reuse toWriterArticle
as the explicit API allowlist, matching creation. The mapper accepts the inferred full
row type instead of a repeated field-name Pick. The four-column summary query remains
small to avoid fetching bodies for lists. Other select/returning sites were reviewed;
no schema, column names, or response shape changed. The existing full suite passes again
(48 unit + 60 integration), along with typecheck/build; no new tests were needed.
The user confirmed “Keep current names; simplify queries” on 2026-11-07. Column naming
is resolved with existing names retained; Phase 5 has not started.

**Entry-chooser follow-up (2026-11-07)**: The user selected “Add chooser now; keep
public list in Phase 7”. A native modal now precedes fresh root-page entry. Writer opens
the implemented draft list; Public or Escape opens an Articles placeholder. Client
navigation retains the choice and direct writer links bypass the chooser. Removed the
Open writer workspace landing action. Public-list API/UI remains unimplemented (T011
unchecked). Real Chrome checks at 320/390/1440px passed both choices, autofocus, modal
focus containment, Escape, repeat/client-navigation behavior, deep links, and mobile fit
without runtime exceptions or hydration warnings. Typecheck/build and all 108 tests
(48 unit + 60 integration) pass. Temporary test/browser resources were removed; Phase 4
remains pending human approval and Phase 5 has not started.

**Phase approval**: Approved by the user on 2026-11-07 by requesting the next phase.
Phase 5 editing/preview implementation is authorized; later phases retain their gates.

## Phase 5: US2 — Edit a draft with Markdown preview (P1)

**Goal**: Edit/save/reopen draft content with safe preview and immediate conflict feedback.
**Dependencies**: Create/open draft approved.
**Independent test**: Edit title/body/tags, preview safe Markdown, save and reopen after restart; unchanged save advances revision, invalid save does not, and two-tab stale save preserves local text with explicit reload/resubmit.

- [x] T008 [US2] First extend the existing validation and HTTP/SQL cases in `tests/unit/articles-validation.test.ts` and `tests/integration/articles.test.ts`, then add the complete-save schema in `server/validation/articles.ts`, `server/services/articles/withArticleTransaction.ts`, `server/services/articles/saveDraft.ts`, and `server/api/writer/articles/[articleId]/draft.put.ts`. Require title/body/tags and expectedRevision with no coercion/null defaults or slug updates; the token rule is "Nonnegative safe integer JSON number; no coercion". Begin Read Committed transaction, lock article FOR UPDATE, return 404 if missing, compare revision before mutation, then replace only draft fields and increment revision once/update updated_at with CURRENT_TIMESTAMP. Return WriterArticle after success; unchanged saves also advance revision. Verify 409 STALE_REVISION makes no changes, creation timestamp/slug/counter/publication/history survive saves, and transaction queries use the callback transaction rather than the shared pool.
- [x] T013 [US2] Add `shared/utils/markdown.ts` and `app/components/MarkdownContent.vue` for the editor preview, first creating meaningful cases in `tests/unit/markdown.test.ts`. Render standard Markdown, show raw HTML literally, and allow only HTTP/HTTPS/mailto/relative-path/#heading links; unsafe schemes never become clickable, including encoded/case variations. Preserve universal rendering and use this same renderer/component for the later public detail page in T039. Verify rendering through the preview in T023; do not build a public page or add a new library here.
- [x] T023 [US2] Extend the read-only editor into an editable feature with per-invocation state/actions in `app/composables/useArticleEditor.ts`, present the form in `app/components/ArticleEditorForm.vue`, and compose them in `app/pages/writer/articles/[slug]/edit.vue`. Implement load/save for title/Markdown/tags, immutable displayed slug, and Write/Preview tabs in one panel, rendering the current local Markdown through `app/components/MarkdownContent.vue` without saving; keep editable content separate from the saved baseline/revision. Implement visible save-conflict feedback and explicit reload/resubmit now; preserve local text on 409 and edits made while a response is in flight, with no silent retry/rebase. Manually verify title/body/tags, shared preview, dirty/loading/pending states, validation feedback, unchanged saves, restart/reopen, and a two-tab stale-save conflict. Reuse existing unit/HTTP cases if a discovered server defect needs a regression; add no Pinia or module-global editor singleton.

**T008 evidence (2026-11-07)**: Extended existing unit/HTTP cases before implementation;
missing save validation failed as expected. Save requires all draft fields and a safe
nonnegative revision, locks the article in Read Committed, checks revision, and updates
only draft fields/revision/audit time through the transaction callback. Exact HTTP/SQL
assertions cover normalized save, restart persistence, unchanged-save increments, stale/
invalid/missing requests, publication/history/counter preservation, and rollback/recovery.
Typecheck/build/full suite pass. T013 rendering is next; later phases remain unstarted.

**T013 evidence (2026-11-07)**: Added the approved markdown-it 15.0.3 pin and shared
renderer/component after missing-renderer tests failed. Standard Markdown renders; raw
HTML is escaped. Allowed link schemes/relative paths/headings work; unsafe, entity/percent-
encoded schemes and scheme-relative URLs remain unclickable. Existing and renderer tests,
Nuxt typecheck, and production build pass. T023 editor/browser integration is next.

**T023 / Phase 5 evidence (2026-11-07)**: Editable title/body/tags, keyboard-accessible
Write/Preview tabs, explicit Save, and per-invocation editor state are implemented.
Success updates the saved revision; errors and stale responses preserve local text.
Reload requires confirmation when dirty; cancellation keeps edits. Newer text entered
while a save response is pending survives the response and can be saved with its new revision.
Production Chrome checks passed safe unsaved preview, validation, unchanged saves,
two-tab conflicts, reload/cancel/resubmit, delayed-response retention, network failure,
article-state isolation, and 320/390/1440px layouts without runtime/hydration errors.
Nuxt typecheck, explicit changed-test typecheck, production build, and the full suite pass:
97 unit + 75 PostgreSQL/HTTP tests. Disposable browser/test resources were removed,
preserving the development database. Phase 6 publishing and Phase 7 public lists remain unstarted.

**Phase approval**: Approved by the user by requesting the next phase.
Phase 6 publishing is authorized; later phases retain their review gates.

## Phase 6: US3 — Publish saved content (P1)

**Goal**: Publish and republish from the writer UI with atomic immutable snapshots.
**Dependencies**: Editing/preview approved; no dependency on a later public-page task.
**Independent test**: Browser first publish/republish reports correct status/reference/original date, dirty draft requires explicit save, blank/stale publish is rejected; HTTP/SQL prove immutability, counters, rollback and crash atomicity. Public-reader rendering is its own subsequent feature.

- [x] T009 [US3] Extend `tests/integration/articles.test.ts` before implementing `server/services/articles/publishArticle.ts`, its request schema in `server/validation/articles.ts`, and `server/api/writer/articles/[articleId]/publish.post.ts`. Enforce "Saved title and body must be nonblank" after article lock/revision comparison; blank saved content gives 400 VALIDATION_ERROR with no mutation. Generate snapshot UUIDv4, allocate its positive per-article number from the locked counter, insert saved title/body/tags, and atomically advance counter/revision, set published status/new owned reference, set published_at only on first publication using CURRENT_TIMESTAMP, and update updated_at. Return WriterArticle; verify repeated/unchanged publication creates new immutable rows and preserves first date, draft, slug, and earlier snapshot content.
- [x] T010 [US3] Extend the publish scenarios in `tests/integration/articles.test.ts` using existing SQL/process helpers in `tests/integration/helpers.ts` to inject a temporary isolated-DB failure after snapshot insertion but before publication completes; remove fixture DDL reliably. Reuse a database lock barrier to terminate the built app during an uncommitted publish, restart against the same DB, and inspect persisted state; no production test hooks. For failure and crash, prove snapshot insertion, counter allocation, reference/status/date/revision, and audit changes roll back, and the next successful publish uses the uncommitted allocation correctly. Retain the existing direct snapshot-update rejection assertions without duplication. Fix only demonstrated lifecycle/transaction defects in `server/services/articles/publishArticle.ts` or `server/services/articles/withArticleTransaction.ts` if needed.
- [x] T024 [US3] Extend `app/composables/useArticleEditor.ts`, `app/components/ArticleEditorForm.vue`, and `app/pages/writer/articles/[slug]/edit.vue` with a separate Publish action, current status/reference/date, success/error feedback, and explicit reload after conflict. Require a successful explicit save of dirty content before publish; never auto-save, silently rebase, or auto-retry with a newer revision. Refresh saved revision from successful responses, serialize conflicting actions while pending, and preserve unsaved text on 409 or responses arriving after newer edits. Walk through first publication, unchanged republish, blank-body rejection, and stale publish with explicit reload/resubmit using real API/SQL evidence. Unpublish is added with its own feature in T036; no unimplemented action controls.

**T009 evidence**: Extended existing validation/HTTP suites first; the missing publish
schema failed before implementation. The native publish handler reuses the locked
transaction helper, validates saved content after the revision check, inserts a UUIDv4
snapshot with the locked per-article number, and atomically updates publication state.
First publish/unchanged republish, save/live isolation, retained dates, separate article
numbering, restart persistence, invalid bodies/IDs, and stale precedence pass. Existing
immutable-row checks remain in place. Typecheck/build/full suite pass: 98 unit + 90
PostgreSQL/HTTP cases. T010 failure/crash evidence is next; writer Publish controls follow T024.

**T010 evidence**: Existing HTTP/SQL scenarios now force an article-update failure after
the transaction has inserted its snapshot, for first publication and republish. Both
rollback article fields/audit/counters and all new history; the next publication uses the
expected number. A test-only AFTER INSERT trigger pauses at an advisory lock held by an
independent connection; observed PostgreSQL lock contention precedes SIGKILL of the app.
After restart, there is no partial snapshot/article state and the next publication uses
version 1. All fixture DDL/locks are cleaned up. No production test hook was added.
Typecheck/build/full suite pass: 98 unit + 93 PostgreSQL/HTTP cases. T024 writer controls
and browser verification are next.

**T024 / Phase 6 evidence**: A separate Publish button requires clean, nonblank saved
content and explains why it is disabled. It sends only expectedRevision, never auto-saves
or silently retries, and shares pending/conflict handling with Save. Success shows saved
status, first date, and current snapshot reference. New edits made while a response is
pending stay local; a subsequent save uses the returned revision.
A fresh isolated production Docker app passed real Chrome checks for blank-body rejection,
explicit save/publish, unchanged republish/date retention, saved/live isolation, stale
publish with in-flight edits, reload/cancel/resubmit, delayed successful responses,
network failure, reopening metadata, and 320/390/1440px layouts with 44px action targets.
No runtime exceptions or hydration warnings were observed. SQL checks confirmed each
publication creates a snapshot and later saves leave the live snapshot unchanged.
Nuxt typecheck, explicit changed-test typecheck, production build, and full suite pass:
98 unit + 93 PostgreSQL/HTTP tests (191 total). Disposable test/browser resources were
removed; normal application/development resources were preserved. No schema/migration
or dependency changes were needed. Phase 7 public lists remain unstarted.

**Phase approval**: Approved by the user by requesting the next task.
Phase 7 public list is authorized; later phases retain their review gates.

## Phase 7: US9 — Public article list (P1)

**Goal**: Anonymous live-only article listing in API and UI.
**Dependencies**: Publishing phase approved for real fixtures.
**Independent test**: List published title/tags/original date, exclude draft-only records, handle empty list, and prove saved draft edits do not change live list content. Use an isolated SQL unpublished fixture until real unpublish is added and retested in that phase.

- [x] T011 [US9] Extend `tests/integration/articles.test.ts` for direct public list projections, draft isolation after save, empty arrays, and status exclusion before implementing the public list query in `server/services/articles/queries.ts`, types in `shared/types/articles.ts`, `server/api/public/articles/index.get.ts`, and `app/pages/index.vue`. Use one SQL statement joining published articles to their owned current snapshot; expose only slug/title/tags/publishedAt, with original date, and make the anonymous universal-rendered page show an understandable empty state and detail links. Inspect rendered output through the existing HTTP harness and manually verify the page; add no auth, ordering promise, search, pagination, or caching.

**T011 / Phase 7 evidence**: Extended existing integration cases before implementation;
the three new public API/SSR cases failed while the prior 93 integration cases passed.
The public query joins published articles to their owned current snapshot in one statement,
returning only slug, snapshot title/tags, and original publication date. Anonymous reads,
empty arrays, draft/unpublished exclusion, unchanged read audits, safe server-rendered
text/links/date, save/republish isolation, and restart persistence pass. Unpublished fixtures
use isolated SQL until real Unpublish is delivered in its own phase.
The public page replaces the earlier placeholder, retains the entry chooser/header switch,
and follows the approved rows with tags/date and title/Read article links. It handles
loading/empty/error/retry without a new component library, auth, search, or pagination.
Real Chrome checks passed chooser-to-empty/list, exact public fields, literal HTML-looking
titles, empty-tag groups, live/draft isolation, republish/date retention, client portal
switching, network failure/retry/loading, and 320/390/1440px maximum-title/tag layouts.
Links meet 44px action targets; no runtime exceptions or hydration warnings were observed.
Nuxt typecheck, changed-test typecheck, production build, and the full suite pass: 98 unit
+ 96 PostgreSQL/HTTP tests (194 total). Disposable test/browser resources were removed;
normal app/development resources were preserved. No schema/dependency change was needed.
Detail links use the approved /articles/:slug destination; those pages remain unimplemented
until Phase 8. No detail endpoint/page or later lifecycle control was added.

**Phase approval**: Approved by the user by requesting the next phase.
Phase 8 public detail is authorized; later phases retain their review gates.

## Phase 8: US10 — Public article detail (P1)

**Goal**: Read published articles through the public page and shared safe renderer.
**Dependencies**: Public list and editor renderer approved; publications available.
**Independent test**: Navigate from public list, inspect live title/tags/date/Markdown, verify draft-only/missing/unpublished-fixture 404, unchanged public content after draft saves, and updated live content after republish. Real unpublish is verified in its own phase.

- [x] T012 [US10] Extend `tests/integration/articles.test.ts` for public detail before implementing the one-statement owned-snapshot query in `server/services/articles/queries.ts`, response types in `shared/types/articles.ts`, and `server/api/public/articles/[slug].get.ts`. Return slug/title/body/tags/publishedAt with Markdown source and no internal/draft metadata. Missing, draft-only, and unpublished articles return 404 ARTICLE_NOT_FOUND; draft edits leave public list/detail unchanged and republish changes both while preserving publishedAt.
- [x] T039 [US10] Implement `app/pages/articles/[slug].vue` against the public detail API, reusing `app/components/MarkdownContent.vue` and `shared/utils/markdown.ts` from the editor. Display live title/tags/original publication date/body with universal rendering, missing/unpublished 404, and appropriate loading/error states. Extend `tests/integration/articles.test.ts` for rendered published body and HTTP 404 where clear; manually prove draft edits leave public content unchanged, republishing changes the live view, and raw HTML/unsafe links follow the already-tested shared policy. Add no second renderer or new UI dependency.

**T012 evidence**: Extended existing public-read cases for exact detail fields,
save/republish isolation, preserved publication date, read audit stability, and restart
persistence. Three parameterized unavailable states verify identical 404 ARTICLE_NOT_FOUND
responses without content leakage or mutation. Missing endpoint assertions failed first.
The native endpoint now reads a published article joined to its owned current snapshot in
one statement and returns only slug/title/body/tags/publishedAt. Typecheck/build/full suite
pass: 98 unit + 99 PostgreSQL/HTTP cases. T039 reader page/browser verification is next.

**T039 / Phase 8 evidence**: Extended the existing public-read cases for server-rendered
live Markdown/title/tags/date, escaped raw HTML, safe/unsafe links, private draft exclusion,
and friendly HTTP 404 pages; the page assertions failed before implementation. The new
reader page reuses MarkdownContent unchanged and Nuxt native fetching/status helpers.
It provides All articles navigation, a readable single-column layout, loading/error/Retry,
and the same missing-state message for absent/draft-only/unpublished articles.
Real Chrome checks passed list → detail → list without reopening the chooser, exact
anonymous detail fields, safe browser/server Markdown, identical writer-preview output,
save/republish isolation with original date, unavailable-state page/API 404, retry/loading,
and 320/390/1440px long-title/code layouts. An observed undersized return-link target was
fixed locally to meet 44px; the full checks and browser walkthrough passed again. No runtime
exceptions or hydration warnings were observed. Code scrolls inside its block; empty tag
groups and writer actions are absent. Nuxt/changed-test typechecks, production build, and
full suite pass: 98 unit + 99 PostgreSQL/HTTP cases (197 total). Disposable resources were
removed; normal application/development resources were preserved. No schema, migration,
dependency, or Markdown-policy change was needed. Phase 9 Unpublish remains unstarted.

**Phase approval**: Approved by the user by requesting the next task.
Phase 9 Unpublish is authorized; later phases retain their review gates.

## Phase 9: US4 — Unpublish (P1)

**Goal**: Remove public access through the writer UI while retaining publication history/state.
**Dependencies**: Publishing and public list/detail approved.
**Independent test**: Unpublish in browser, verify actual list exclusion/detail 404, retained draft/snapshots/reference/date, invalid/stale rejection, and republish preserving the original date.

- [x] T014 [US4] After T011/T012, extend `tests/integration/articles.test.ts` and implement `server/services/articles/unpublishArticle.ts`, its action schema in `server/validation/articles.ts`, and `server/api/writer/articles/[articleId]/unpublish.post.ts` using the shared transaction helper. Compare revision before state eligibility; reject never-published/already-unpublished state with 409 INVALID_PUBLICATION_STATE. On success change status/revision/updated_at only; preserve draft, counter, snapshots, reference, created_at, and first published_at. Prove public exclusion/404, stale requests make no changes, and later republish preserves the date.
- [x] T036 [US4] Extend `app/composables/useArticleEditor.ts`, `app/components/ArticleEditorForm.vue`, and `app/pages/writer/articles/[slug]/edit.vue` with Unpublish and its pending/success/error states. Use the saved revision, preserve unsaved local text on conflicts, retain the reference/date after success, and show invalid-state feedback consistently with the API. Walk through publish → unpublish → public list exclusion/detail 404 → republish with the original date, plus stale-unpublish rejection; extend existing HTTP cases only for uncovered behavior. Follow the approved wireframes and retain separate Save/Publish/Unpublish actions.

**T014 evidence**: Extended existing strict publication-action validation/revision cases
and added focused unpublish state/preservation/rollback scenarios. Missing schema tests
failed before implementation. Unpublish now reuses the article-first Read Committed helper,
checks revision before state, and changes only status/revision/updated_at. Real public
list/detail exclusion and page 404, retained history/reference/date/counter/draft, stale/
invalid/missing requests, rollback/recovery, restart, and republish pass. Earlier public
unpublished SQL fixtures now use the real API. Typecheck, changed-test typecheck, build, and the
full suite pass: 98 unit + 103 PostgreSQL/HTTP cases. T036 writer/browser work is next.

**T036 / Phase 9 evidence**: Added a separate Unpublish action only while published.
It uses the saved revision and shared pending/conflict handling, always retains local
title/body/tags, and updates only the saved baseline/publication metadata after success.
Dirty content does not disable Unpublish or get saved implicitly. Retained references are
labeled Last published snapshot. State errors offer explicit reload; no automatic rebase
or newer-token retry is added.
Real Chrome/SQL checks passed publish → dirty Unpublish → public list exclusion/detail
404 → explicit save/republish with original date. Text entered before and during a paused
Unpublish response survived. Two-tab stale rejection, cancel/confirm reload/resubmit,
client portal navigation without stale list data, network failure/deliberate retry, and
controlled matching-revision invalid-state feedback/reload passed. At 320/390/1440px all
three action buttons fit with 44px targets; no runtime/hydration errors or later history
controls were observed. Typecheck, changed-test typecheck, build, and full suite pass:
98 unit + 103 PostgreSQL/HTTP cases (201 total). Pinned-type deprecation audit: 39 files,
eight Vue scripts, no findings. Disposable test/browser resources were removed; normal
resources were preserved. No schema, migration, dependency, or architecture change was
needed. Phase 10 history inspection remains unstarted.

**Phase approval**: Approved by the user by requesting the next phase.
Phase 10 history inspection is authorized; later phases retain their review gates.

## Phase 10: US5 — Inspect version history (P1)

**Goal**: List and inspect retained snapshots through API and editor history panel.
**Dependencies**: Publish/unpublish and editor approved.
**Independent test**: Inspect newest-first saved versions and full content, empty history, and history after unpublish; reject wrong-owner/missing snapshots and prove read-only state.

- [x] T015 [US5] Extend `tests/integration/articles.test.ts` and add history/owned-detail queries in `server/services/articles/queries.ts`, types in `shared/types/articles.ts`, `server/api/writer/articles/[articleId]/versions/index.get.ts`, and `server/api/writer/articles/[articleId]/versions/[versionId]/index.get.ts`. Return VersionSummary array newest first by versionNumber and exact VersionDetail on inspection; never order by UUID/audit timestamp. Validate both UUIDs, distinguish missing article from snapshot, use 404 SNAPSHOT_NOT_FOUND for missing/wrong-owner snapshots, and preserve all revisions/audit/publication/history values on reads, including after unpublish.
- [x] T025 [US5] Add `app/components/ArticleHistory.vue` and connect listing/inspection through `app/composables/useArticleEditor.ts` and `app/pages/writer/articles/[slug]/edit.vue`. Show newest-first numbers and inspected title/body/tags, label the current/retained reference, and provide empty/loading/error feedback. Verify read-only history in published/unpublished states and that inspection changes no draft/publication/history data. Restore and delete controls are introduced only with their own feature phases T037/T038; use existing real API coverage and no browser automation dependency.

**T015 evidence**: Five new cases in the existing integration suite failed before the
history endpoints existed; the prior 103 integration cases passed. The native list/detail
handlers now validate UUIDs before lookup, distinguish article/snapshot absence, and reject
wrong-owner targets. Queries return exact VersionSummary/VersionDetail projections and
order by descending version number even when UUID/time ordering disagrees. Tests prove
empty draft history, valid non-v4 IDs, published/unpublished read-only inspection, unchanged
SQL/public state/audits, and restart persistence. Typecheck, changed-test typecheck, build,
and full suite pass: 98 unit + 108 PostgreSQL/HTTP cases. T025 UI/browser work is next.

**T025 / Phase 10 evidence**: Added the separate read-only history component and
per-editor listing/inspection state. Rows show newest-first version numbers and current/
last-published reference labels; selection loads exact title/body/tags with shared safe
Markdown. Publish refreshes history; explicit Refresh history and separate list/inspection
loading/error/retry states preserve local inputs. Initial native article/history fetches
are created before awaiting and hydrate from their server payloads; existing missing-page
tests and real-browser checks verify Nuxt context and hydration correctness.
Production Chrome/SQL checks passed empty draft history, automatic post-publish refresh,
old/current inspection, raw HTML/unsafe link policy, dirty/local typing retention, unchanged
stored/public state, and retained inspection after unpublish. Network list/detail failures,
loading/retry recovery, controlled missing-version feedback/refresh, reopening state, and
320/390/1440px history layouts with 44px targets passed. No runtime exceptions or hydration
warnings occurred. No Restore/Delete control or endpoint was added.
Nuxt/changed-test typechecks, production build, and full suite pass: 98 unit + 108 real
PostgreSQL/HTTP cases (206 total). Pinned-type audit: 42 files/nine Vue scripts, no findings.
Disposable test/browser resources were removed; normal resources were preserved. No schema,
migration, dependency, architecture, or Markdown-policy change was needed. Phase 11 Restore
remains unstarted.

**Phase approval**: Approved by the user by requesting the next phase.
Phase 11 Restore is authorized; later phases retain their review gates.

## Phase 11: US6 — Restore into draft (P1)

**Goal**: Restore selected history into the editable draft without publication.
**Dependencies**: History inspection approved.
**Independent test**: Restore old/current/last-published/identical snapshots from UI; check returned draft/revision and feedback, unchanged live state/history, stale-preserved local text, and rejected invalid targets.

- [x] T016 [US6] Extend `tests/integration/articles.test.ts` before adding `server/services/articles/restoreDraft.ts`, its request schema in `server/validation/articles.ts`, and `server/api/writer/articles/[articleId]/versions/[versionId]/restore.post.ts`. Lock article and compare revision before resolving snapshot eligibility; then copy owned title/body/tags into draft and increment revision/update updated_at even for identical content. Preserve slug, status, reference, counter, first date, created_at, every snapshot, and public output/availability. Accept current/last-published snapshots; missing/wrong-owner snapshots give 404 SNAPSHOT_NOT_FOUND, while an otherwise valid stale request gives 409 STALE_REVISION first, with no changes.
- [x] T037 [US6] Add Restore to `app/components/ArticleHistory.vue` and route it through `app/composables/useArticleEditor.ts` and `app/pages/writer/articles/[slug]/edit.vue`. A successful explicit restore loads returned draft/revision without publishing; use the saved revision and preserve local text on rejection. Show pending/success/error feedback and verify old/current/last-published/identical restores, missing/wrong-owner targets, stale restores, unchanged public state/history, and explicit save/publish rules afterward. Reuse existing integration coverage and record the browser walkthrough in `quickstart.md`.

**T016 evidence**: Extended existing strict-action revision/body cases to Restore and
added focused old/current/identical published/unpublished restoration, rejected target/
precedence, and rollback/recovery scenarios. Missing schema checks failed first. Restore
uses the shared article-lock/revision transaction; owned snapshot lookup uses the callback
transaction, then copies only title/body/tags and advances revision/update time. Exact
HTTP/SQL assertions prove retained publication/reference/date/counter/audits/history,
unchanged public output/visibility, stale-before-target errors, rollback, and restart.
Typechecks/build/full suite pass: 98 unit + 112 PostgreSQL/HTTP cases. T037 UI/browser work
is next; no Delete endpoint/control is added.

**T037 / Phase 11 evidence**: Added Restore into draft to the inspected snapshot region.
Dirty inputs require an inline confirmation naming the captured target version, with
cancel preserving text and making no write. Restore uses saved expectedRevision and shared
pending/error/conflict handling, updates the saved draft/revision on success, and reports
not published. Newer local input typed during a response survives; a subsequent explicit
save uses the returned revision. Missing snapshots clear stale inspection and ask for
history refresh; rejected restores preserve local text with no automatic rebase/retry.
Production Chrome/SQL checks passed old/current/identical and last-published unpublished
restores, dirty cancel/confirm, delayed successful response retention, explicit Save/Publish
afterward, two-tab stale rejection with reload/cancel/resubmit, network failure/retry,
controlled missing-target feedback, persistence on reopening, and unchanged public/history/
reference/date state. At 320/390/1440px Restore/confirmation controls fit with 44px targets;
no runtime exceptions/hydration warnings or Delete controls were observed.
Typechecks, production build, and full suite pass: 98 unit + 112 PostgreSQL/HTTP cases
(210 total). Pinned-type audit: 44 files/nine Vue scripts, no findings. Disposable test/
browser resources were removed; normal resources were preserved. No schema, migration,
dependency, architecture, or Markdown-policy change was needed. Phase 12 Delete remains
unstarted.

**Phase approval**: Approved by the user by requesting the next task.
Phase 12 snapshot deletion is authorized; later phases retain their review gates.

## Phase 12: US7 — Delete eligible history (P1)

**Goal**: Delete eligible snapshots from history while protecting retained references.
**Dependencies**: History/restore approved; publishing available to prove non-reuse.
**Independent test**: Delete eligible history in browser, reject current/retained reference in published/unpublished states, keep article revision/audit/local edits unchanged, and publish without reusing a deleted number.

- [x] T017 [US7] Extend `tests/integration/articles.test.ts` before implementing `server/services/articles/deleteSnapshot.ts` and `server/api/writer/articles/[articleId]/versions/[versionId]/index.delete.ts`. Use a transaction and article-first lock without a caller revision, verify owner/existence, and reject the current/retained reference with 409 SNAPSHOT_PROTECTED; retain the restrictive FK as database protection. Return empty 204 on eligible deletion; malformed IDs give 400, missing article 404 ARTICLE_NOT_FOUND, missing/wrong-owner snapshot 404 SNAPSHOT_NOT_FOUND. Prove article fields/revision/audit/counter and public output remain unchanged, the highest eligible historical number is never reused on later publication, and deleted snapshots cannot be inspected/restored.
- [x] T038 [US7] Add Delete to `app/components/ArticleHistory.vue` and connect it through `app/composables/useArticleEditor.ts` and `app/pages/writer/articles/[slug]/edit.vue`. Visibly protect the current/retained reference in published/unpublished states; the API remains authoritative. Eligible deletion refreshes history without changing article revision or unsaved text; surface stale/missing/protected-target feedback from the actual API. Walk through eligible deletion, retained-reference rejection after unpublish, and subsequent publication without number reuse. Reuse existing HTTP/SQL evidence and record the browser results in `quickstart.md`.

**T017 evidence**: Six new cases in the existing integration suite failed before the
DELETE endpoint existed; the prior 112 cases passed. The native handler validates both
UUIDs and returns empty 204 after an article-first Read Committed transaction validates
ownership/reference eligibility. No caller revision is required. Existing restrictive
FK protection remains intact. Tests prove eligible deletion in published/unpublished states,
protected retained references, malformed/missing/wrong-owner targets, unchanged article/
audit/counter/public output, failed-delete rollback/retry, restart, missing inspection/
restore after deletion, and publication without deleted-number reuse. Typechecks/build/
full suite pass: 98 unit + 118 PostgreSQL/HTTP cases. T038 UI/browser work is next.

**T038 / Phase 12 evidence**: Inspected eligible snapshots now offer Delete version with
a named Confirm delete/Cancel delete prompt. Referenced snapshots instead show Protected —
current published version or Protected — last published version after unpublish. The API
independently rechecks the locked reference. Success clears inspection and refreshes history
without changing saved article/revision or local fields; missing/protected/network failures
preserve text and provide explicit refresh/reload/retry feedback, without automatic retry.
Production Chrome/SQL checks passed current/retained API rejection, eligible deletion in
both states, cancel/no write, empty 204, dirty and in-flight local input retention,
unchanged article/audit/public/reference/date/counter state, next Save using the unchanged
revision, and deleted-target inspection/restore rejection. Network failure/retry, controlled
stale-reference protected error with reload/cancel, external API missing-target recovery,
publication without number reuse, and 320/390/1440px controls with 44px targets passed.
No runtime exceptions or hydration warnings occurred.
Typechecks, build, and full suite pass: 98 unit + 118 real PostgreSQL/HTTP cases (216 total).
Pinned-type audit: 46 files/nine Vue scripts, no findings. Disposable resources were removed;
normal resources were preserved. No schema, migration, dependency, architecture, or Markdown
policy change was needed. Coordinated concurrency was subsequently verified in Phase 13 below.

**Phase approval**: Approved by the user on 2026-11-07 by requesting the next phase. Phase 13 is authorized; later phases retain their approval gates.

**Phase 12 review follow-up — writer slug URLs**: The user selected
`/writer/articles/:slug/edit`, keeping creation at `/writer/articles/new` and allowing
slug `new`. T022/T023 page references now reflect that route. The writer slug lookup
returns the existing WriterArticle; internal UUID lifecycle/history APIs and schema
remain unchanged. Direct links, creation/list navigation, missing slugs, slug `new`,
and reopening after restart pass in the extended existing integration cases. Browser
checks passed all existing editor actions, article-to-article navigation, stale-save
preservation/reload, and initial lookup failure/Retry, without runtime or hydration
errors. Typechecks/build/full suite pass: 98 unit + 119 PostgreSQL/HTTP cases (217 total);
the pinned-type audit found no deprecations in 47 files/nine Vue scripts. See quickstart
for details. The user subsequently approved Phase 12 and authorized Phase 13.

## Phase 13: US8 — Cross-feature concurrency evidence (P1)

**Goal**: Complete real-contention and rejection-precedence evidence across already-usable features.
**Dependencies**: All lifecycle and public features approved; conflicts already implemented with each write.
**Independent test**: Parameterize stale operations and exact native errors, coordinate independent connections for same-revision writes and delete races, then repeat two-tab UI rejection/reload with preserved local content. No basic conflict handling is deferred to this phase.

- [x] T018 [US8] Parameterize existing cases in `tests/integration/articles.test.ts` for save/publish/unpublish/restore stale-token behavior and extend `tests/unit/articles-validation.test.ts` where needed. Cover missing/null/string/fraction/negative/unsafe expectedRevision, strict unknown fields, a safe-integer revision beyond PostgreSQL integer range, missing articles, no-op revision advancement, and stale-before-publish-body/unpublish-state/restore-target checks. Assert exact native status/application code and unchanged SQL/public state for all rejected operations; extend generic unexpected-production-500 evidence without exposing database details. Fix only demonstrated defects in `server/validation/articles.ts`, `server/utils/api-errors.ts`, or the relevant lifecycle helper/operation.

**T018 evidence**: Existing action cases now cover Save alongside Publish/Unpublish/Restore
for missing/null/string/fraction/negative/unsafe/boolean/object revisions, unknown fields,
malformed/missing IDs/JSON, large safe stale tokens, and exact HTTP/application errors.
Every shared rejection check compares full SQL rows/audits/history and public responses;
existing stale-before-body/state/target and no-op advancement coverage remains intact.
Production failure probes also check that lifecycle errors expose no private detail/SQL/stack.
No application defect was found. Build, Nuxt/test typechecks, and the full suite pass:
98 unit + 122 real PostgreSQL/HTTP cases (220 total). T019 is next.

- [x] T019 [US8] Extend `tests/integration/articles.test.ts` and existing SQL helpers in `tests/integration/helpers.ts` with coordinated same-revision save/save and publish/save contention, plus a parameterized valid unpublish/restore contender where clear. Use real independent backend connections and an observed lock barrier, not Promise.all timing alone; release barriers in cleanup. Assert one success/one 409 STALE_REVISION, one revision advance, coherent draft/live snapshot/counter/date/audit values, and no partial history. Reuse the existing lifecycle assertions instead of duplicating entire suites.

**T019 evidence**: A shared test helper holds the article row on a controller connection,
observes the first HTTP transaction blocked on it, then observes the second queued behind
the first. Three distinct backend PIDs prove independent overlapping connections before
release; cleanup releases the barrier and settles requests before fixture reset. Five cases
cover save/save, publish/save in both orders, and valid unpublish/restore in both orders.
Each proves the first succeeds, the second returns 409 STALE_REVISION, exactly one revision
advance, complete draft/publication/audit/counter consistency, and unchanged prior snapshots.
No application changes were needed. Test typecheck and full production-build-backed suite
pass: 98 unit + 127 PostgreSQL/HTTP cases (225 total). T020 is next.

- [x] T020 [US8] Extend the existing contention cases in `tests/integration/articles.test.ts` and `tests/integration/helpers.ts` for publish/delete and restore/delete on the same article using deterministic lock coordination, exercising both operation orders. Verify each serialized outcome follows the HTTP contract: retained references cannot disappear, ownership stays valid, an eligible old snapshot may be deleted after the reference moves, and restore either copies an existing snapshot or fails without mutation if deletion wins. Complete operations before resets and prove no deadlock/partial state; change lifecycle code only for demonstrated failures.


**T020 evidence**: The observed-lock helper now drives publish/delete and restore/delete
in both orders. Publication-first moves the reference before old-snapshot deletion (200/204);
deletion-first rejects the retained reference before publication succeeds (409/200).
Restore-first copies historical content before deletion (200/204); deletion-first makes
restore return 404 SNAPSHOT_NOT_FOUND without changing any article/audit/public state.
All outcomes retain a valid owned live reference, exact prior snapshot content, preserved
first publication date, coherent revision/counter/audits, and no partial writes/deadlocks.
Both HTTP requests settle and barriers release before resets. No application change was
needed. Test typecheck/full suite pass: 98 unit + 131 PostgreSQL/HTTP cases (229 total).
Two-tab browser verification also passes for Save/Publish/Unpublish/Restore: stale 409
preserves in-flight local input and full SQL/public state, no automatic write retry occurs,
reload cancel/confirm works, and explicit resubmission succeeds. No runtime exceptions
or hydration warnings occurred. Disposable resources were removed; normal data was preserved.
Build/Nuxt/test typechecks pass. The user subsequently approved Phase 13 and authorized Phase 14.

**Phase approval**: Approved by the user on 2026-11-07 by requesting the next phase. Phase 14 is authorized; later phases retain their review gates.

## Phase 14: US11 — Slug lifecycle audit (P1)

**Goal**: Complete cross-state uniqueness/immutability evidence; creation validation already shipped with US1.
**Dependencies**: Lifecycle features approved.
**Independent test**: Test normalized duplicate creates across all statuses and contention; confirm UI collision feedback and fixed slug across save/publish/unpublish/restore. Extend earlier tests rather than introducing slug validation late.

- [x] T021 [US11] Extend the existing cases in `tests/unit/articles-validation.test.ts` and `tests/integration/articles.test.ts` for normalized collisions against draft/published/unpublished articles, rejected leading/trailing/repeated hyphens or invalid characters, and accepted 1/100-character boundaries. Coordinate concurrent creates whose slugs normalize identically and assert exactly one 201 and one 409 SLUG_CONFLICT with no suffix/extra article. Verify the stored slug survives every lifecycle action and save rejects a slug field. Reuse `server/validation/articles.ts` and the named constraint mapping in `server/utils/api-errors.ts`; fix only uncovered defects.

**T021 evidence**: Extended existing unit/HTTP cases rather than adding a duplicate suite.
One- and 100-character slugs normalize before validation/storage; empty/whitespace,
leading/trailing/repeated hyphens, underscore/non-ASCII/slash, and 101-character inputs
are rejected. Existing collision cases now cover draft/published/unpublished articles,
plain and trim/lowercase duplicates, and rejected slug edits, comparing complete SQL/
audit/history/public state. Lifecycle/restore cases verify the stored slug and writer lookup
remain fixed through Save/Publish/republish/Unpublish/Restore and server restart.

The existing competing-create case now pauses the first uncommitted insert in a test-only
AFTER INSERT advisory-lock fixture and observes the second backend blocked on the first.
Three distinct PIDs prove overlap; after release exactly one request returns 201 and one
409 SLUG_CONFLICT, with one unsuffixed row and no snapshots. Cleanup settles requests,
releases locks, and drops fixture trigger/function before later cases.

Chrome/SQL checks passed collision feedback/input retention in all three states, recovery
with a new slug, one/100-character creation/redirect/lookup/save, fixed SQL/URL/display
through the lifecycle and reload, and the maximum slug at 390px. No runtime or hydration
errors occurred. Build, Nuxt/test typechecks, and the full suite pass: 99 unit + 143 real
PostgreSQL/HTTP cases (242 total). No application/API/schema/migration/dependency or
architecture change was needed. Disposable resources were removed; normal data was preserved.
The user subsequently authorized one-shot execution through Phase 17 on 2026-11-08.

**Phase approval**: Approved by the user on 2026-11-08. One-shot execution through Phase 17 is authorized; unavailable checks remain open and Phase 18 retains its gate.

## Phase 15: US12 — Integrated interface acceptance (P1)

**Goal**: Review the assembled interface; every action was built in its feature phase.
**Dependencies**: All feature slices and concurrency/slug checks approved.
**Independent test**: Walk through all writer/public flows and feedback including shared Markdown, history actions, unsaved edits, and two-tab conflicts; fix observed integration defects only, with passing existing checks.

- [x] T026 [US12] Complete the integrated writer/public walkthrough and record results in `quickstart.md` and `README.md`, fixing only observed UI defects in `app/pages/writer/articles/`, `app/composables/useArticleEditor.ts`, or `app/components/`. Cover create/open, all fields, shared safe preview, separate save/publication actions, history inspect/restore/delete, visible success/failure, missing resources, and two-tab conflict preservation/reload/resubmit. Check public output remains unchanged until explicit publish. Run the existing full suite/typecheck/build; no new browser automation dependency or unrelated visual redesign.

**Evidence (2026-11-08)**: Fresh production Chrome walkthrough passed chooser, UI creation/open, all fields, safe Write/Preview, separate Save/Publish, public list/detail, draft/live isolation, history inspection, restore/delete cancel/confirm, unsaved text, unpublish/public 404, republish/date preservation, non-reused numbers, missing pages, and 320/390/1440px controls. Four two-tab checks repeated stale Save/Publish/Unpublish/Restore with in-flight local input, unchanged SQL/public state, reload cancel/confirm, and explicit resubmission. No runtime/hydration errors or UI defects. Typechecks/build/full 242-test suite pass.

**Phase progression**: Authorized by the user’s 2026-11-08 one-shot instruction through Phase 17; no additional gate requested.

## Phase 16: US13 — Local startup and persistence acceptance (P1)

**Goal**: Verify platform deployment and host development against the complete usable app.
**Dependencies**: Feature/interface phases approved; startup infrastructure already exists.
**Independent test**: Fresh Docker startup and normal restart preserve state on Linux/Windows PowerShell, and configured local PostgreSQL plus pnpm dev works without Docker; record unavailable platforms honestly and leave required unverified tasks open.

- [x] T027 [US13] Exercise `docker compose up --build` from a clean temporary copy on Linux using `Dockerfile`, `compose.yaml`, and instructions in `README.md`/`quickstart.md`. Verify default startup, private DB/loopback app access, migrations before serving, failed-migration startup behavior, and repeat startup without schema duplication. Create representative draft/history/publication data through HTTP, perform normal service down/up without volume deletion, and prove content/reference/date/counters/audit data persist. Record real environment/results and make minimal configuration/documentation fixes; preserve existing application data.
**T027 evidence (2026-11-08)**: Clean temporary copy, Linux arm64 Docker CLI container and Docker Desktop Linux daemon on macOS. Default port 3000, private DB, two migrations before serving, full SQL/draft/history/public/audit/counter persistence after down/up, migration idempotence, failed-migration no-serving and recovery passed. Native Linux host was not separately exercised.

- [ ] T028 [US13] Repeat the clean-copy reviewer startup and restart-persistence scenarios in Windows PowerShell with Linux containers, exercising `Dockerfile`, `compose.yaml`, `scripts/test-integration.mjs`, and `README.md`/`quickstart.md`. Verify the identical startup command, migration ordering, path/signal/cleanup behavior, full test command, and named-volume retention. Record actual Windows results; if no Windows environment is available, leave this task unchecked and record the gap rather than claiming support is verified.
**T028 availability**: No Windows OS/PowerShell environment is available. This task remains unchecked; Windows startup, signals/paths, tests/cleanup, and persistence must still be executed there. The one-shot authorization permits finishing independent Phase 17 audit/docs with this gap recorded.

- [x] T029 [US13] Verify P077's Docker-free host development instructions in `README.md` and `quickstart.md` against `package.json`, `drizzle.config.ts`, and `server/db/client.ts`: locally running pinned PostgreSQL, locked install, POSIX/PowerShell DATABASE_URL examples, `pnpm exec drizzle-kit migrate`, then `pnpm dev`. Confirm UI/API, hot reload, local-only access, and persistence after dev-server restart; the URL must target the reachable host DB rather than Compose's private hostname. Record exercised platforms and any unavailable platform separately; integration tests retain their isolated Docker setup.

**T029 evidence (2026-11-08)**: Clean temporary source copy, locked install, host Node 24.22.2/pnpm 12.18.0, locally built PostgreSQL 18.6 with a UTF8 database on loopback 55438, migration CLI and `pnpm dev` on loopback 3000 passed. Unicode writer/public data, actual in-page HMR, and exact SQL/public state after Nuxt restart passed. Only the temporary copy was edited for HMR, then restored. Temporary processes stopped. Windows host development remains unexecuted.

**Phase status**: Partial: T027/T029 verified in the recorded environments; T028 remains open. The user authorized progression through Phase 17 in one shot, so independent audit/documentation continues with the platform gap explicit. Full cross-platform acceptance is not claimed.

## Phase 17: US14 — Verification and reviewer documentation (P1)

**Goal**: Audit evidence and finish accurate reviewer documentation.
**Dependencies**: Feature/interface/platform phases approved for full acceptance.
**Independent test**: One full test command, separate typecheck/build, complete coverage map, and README prerequisites/configuration/model/rationale/real tradeoff/limitations; reviewers need not execute tests.

- [x] T030 [US14] Audit FR-001–FR-014 and SC-001–SC-006 against `tests/unit/`, `tests/integration/`, `quickstart.md`, and this task list; extend existing cases only for uncovered acceptance behavior and record an evidence map in `quickstart.md`. Run `pnpm test`, `pnpm exec nuxt typecheck`, and `pnpm run build` against the final state; explicitly verify `test:unit` needs no PostgreSQL/Docker and `test:integration` automatically provisions/migrates/resets/cleans only test resources. A missing required assertion, skipped suite, cleanup failure, or unavailable check remains open.
- [x] T031 [US14] Finalize `README.md` from actual implementation/results: Docker and host-dev prerequisites/configuration/startup, test commands, model and lifecycle/concurrency rationale, trusted shared writer access with concurrent sessions, safe Markdown policy, at least one actual time-pressure tradeoff and its future improvement, known omissions/unverified platforms, and the short required-flow demo. Clearly distinguish reviewer startup from developer testing; do not invent completed checks or add production/CI/auth scope.
- [x] T032 [US14] Synchronize implemented/verified status across `specs/001-docs-studio/plan.md`, `research.md`, `data-model.md`, `contracts/http-api.md`, `contracts/ui-and-services.md`, `assumptions.md`, `quickstart.md`, `tasks.md`, and `ACTION_PLAN.md`, changing only outdated claims or approved deviations. Ensure runtime projections, field limits, paths, pins, revision/error ordering, startup/test procedures, and recorded evidence agree. Keep unverified tasks unchecked and maintain the original approved requirements; propose any architectural change for human decision before dependent code.

**T030–T032 evidence (2026-11-08)**: Audited every FR-001–FR-014 and SC-001–SC-006 in quickstart’s final evidence map. Existing lifecycle assertions cover the required invariants; no duplicate tests or application fixes were needed. Final `pnpm test`: 99 unit + 143 real PostgreSQL/HTTP cases (242), no skips; Nuxt and strict test-source typechecks/build pass. Unit-only verification passes with DATABASE_URL unset and an unusable Docker socket; integration provisioning/migrations/resets/cleanup removed only owned resources. README now records actual setup, model/rationale, shared concurrent writer access, safe Markdown, tradeoffs, demo, and platform limits. Artifacts and roadmap were synchronized. FR-013/SC-005 remain partially verified solely because Windows T028 is unavailable.

**Phase status**: Audit/documentation work verified under the user’s one-shot authorization. Results await human review; platform T028 remains unchecked. The user subsequently authorized Phase 18 delivery review on 2026-11-08; final handoff
still requires human review and submission remains human-owned.

## Phase 18: Final delivery review

**Goal**: Clean-copy rehearsal and human-owned submission handoff.
**Dependencies**: All previous phases approved; reserve final two hours for defects/handoff.
**Independent test**: Rehearse the documented complete demo and validate final evidence, deliverables, and human-maintained history; do not submit or commit automatically.

- [x] T033 Rehearse clean-copy installation and the complete reviewer demo from `README.md` and `specs/001-docs-studio/quickstart.md`, excluding local secrets/tooling/generated output from the temporary copy and retaining required tracked migration/lockfile assets. Reuse the existing platform and lifecycle evidence; rerun full suite/typecheck/build when fixes change the resulting state. Record remaining defects/platform gaps honestly and resolve required failures before marking the rehearsal complete; do not delete unrelated services/data or create git commits.
- [x] T034 Review final deliverables against `specs/001-docs-studio/spec.md`, `plan.md`, `tasks.md`, and `README.md`: every required story has its evidence, API/UI/run commands match contracts, and actual omissions/tradeoffs are explicit. Explain the resulting design and checks for human review, confirm the human-maintained spec-before-code history/checkpoints without git commands, and prepare the requested repository/archive handoff. Leave submission and commits to the human; add no stretch work or unrelated refactoring.

**T033 evidence (2026-11-08)**: A clean temporary copy retained source, lockfile,
migrations, tests and SDD artifacts while excluding local secrets/tooling/generated data.
Default-port production Compose build/start and the full README demo passed, including
safe preview, draft/live isolation, all history actions, missing pages, responsive controls,
and four two-tab stale-action/reload/resubmit checks. No runtime/hydration errors or app
fixes were found. Rehearsed runtime/config/test files match the workspace; final existing
242-test/typecheck/build evidence is reused because that source is unchanged. Disposable
resources were removed. Windows T028 remains an explicit unavailable platform check.

**T034 evidence (2026-11-08)**: Reviewed the original Word brief plus spec/plan/tasks,
README, routes, migrations, coverage/platform map, and documented tradeoffs/assumptions.
Raw repository-object audit at HEAD `32ba2436d67c192ddfc4c8d5bbdca909b712c586` found 44
reachable commits and confirmed spec/plan/tasks/constitution checkpoint `c1249f9` before
first application commit `c9edadd`. No git commands/history changes/commits were used.
[handoff.md](handoff.md) records evidence, limits, and the human-owned submission boundary.
The review ZIP preserves reachable repository history and includes a file manifest/checksum,
while excluding local config/hooks/secrets/generated data. No application, architecture,
requirement, dependency, or stretch change was introduced. Full cross-platform signoff
remains pending Windows T028; final handoff/submission requires human review.

**Phase approval**: Pending human review. Present final evidence and wait for explicit human approval before handoff; submission remains human-owned.

## Dependencies and execution order

Execute the phases above in order. The 2026-11-08 user instruction authorized Phases 15–17
in one shot, including intermediate gates; the subsequent 2026-11-08 request authorized Phase 18 review, while final human approval
and all unavailable checks remain explicit.
Task IDs are stable references rather than a numeric execution sequence. UI tasks moved
into their owning story retain their original ID; newly split UI tasks are T036–T039.
T001–T027 and T029–T039 are verified with evidence above (38 tasks).
Phases 1–14 are approved. Phase 15 and Phase 17 work is verified; Phase 16 is partial
with Windows T028 open. Phase 18 review work is verified and awaits final human approval;
its authorization did not waive or mark unavailable Windows checks as passed.

```text
Setup T001–T002 → Foundation T003–T005 → UI design T035
 → Create/open T006,T007,T022 → Edit/preview T008,T013,T023
 → Publish T009,T010,T024 → Public list T011 → Public detail T012,T039
 → Unpublish T014,T036 → History T015,T025 → Restore T016,T037
 → Delete T017,T038 → Concurrency audit T018–T020 → Slug audit T021
 → Interface audit T026 → Platform checks T027–T029
 → Evidence/docs T030–T032 → Delivery T033–T034
```

The feature-phase acceptance gate requires that feature's existing API, UI, and checks
work together; API-only completion does not approve a phase. Later cross-feature audits
extend existing evidence, never postpone a feature's validation, conflict UI, or tests.
At early phases, SQL asserts invariants whose external consumer is a later distinct
feature; later features add real consumer assertions without weakening earlier checks.

No parallel implementation tasks are scheduled. Shared editor/query/test files are extended
serially; concurrency tests run competing database operations inside one task. Within each
phase, inspect existing tests and establish the required failing assertion before implementing
the behavior, then pass the full existing suite/build/typecheck before task completion.

## Requirement and acceptance map

| Requirement | Implementation and immediate UI | Additional evidence |
| --- | --- | --- |
| FR-001 / US1 | T006,T007,T022 | Restart T007; public exclusion T011,T012; platform T027–T029 |
| FR-002 / US2 | T008,T013,T023 | Live isolation T011,T012; two-tab conflict T023 |
| FR-003 / US3 | T009,T010,T024 | Public views T011,T012,T039; races T019,T020 |
| FR-004 / US4 | T014,T036 | Public removal in same phase; retained history/deletion T015–T017 |
| FR-005 / US5 | T015,T025 | Published/unpublished inspection and read-only assertions |
| FR-006 / US6 | T016,T037 | Wrong-owner/stale/identical restores; contention T020 |
| FR-007 / US7 | T017,T038 | Constraint T003/T005; number non-reuse; races T020 |
| FR-008 / US8 | T008,T023,T009,T024,T014,T036,T016,T037 | Cross-operation errors/races T018–T020; UI T026 |
| FR-009 / US9 | T011 | Real unpublish T014/T036; restore isolation T016/T037 |
| FR-010 / US10 | T012,T039 | Shared renderer T013; unpublish/restore phases |
| FR-011 / US11 | T003,T006,T022,T008 | Lifecycle/normalized collision audit T021 |
| FR-012 / US12 | T035,T022–T025,T036–T038 | Integrated walkthrough T026; safe preview T013 |
| FR-013 / US13 | T002–T005,T027–T029 | Fresh-copy rehearsal T033 |
| FR-014 / US14 | T001,T005,T030–T032 | Checks in every feature; final T033/T034 |
| SC-001 | Each feature's UI task | Integrated demo T026/T033 |
| SC-002 | T011,T012,T039 | Actual unpublish/restore phase checks |
| SC-003 | T003,T005,T008–T010,T014–T017 | Coverage audit T030 |
| SC-004 | Each write's stale/conflict checks | Coordinated races T018–T020; two-tab T026 |
| SC-005 | T027,T028 | Fresh-copy T033 |
| SC-006 | T031,T032 | Human delivery review T034 |

## Implementation strategy and time budget

1. Set up only the necessary runtime, shared schema, and test harness; approve the UI design.
2. Deliver create/open through the browser as the first user-visible MVP, then editing/preview.
3. Deliver publishing, public reading, unpublish, inspection, restore, and delete separately,
   each with its API, UI, tests, and phase approval. Earlier features continue working.
4. Audit cross-feature contention, slug invariants, and integrated UI; finish platform evidence,
   documentation, and handoff. These audits verify functionality already built per feature.

There are 39 tasks: 5 setup/foundation, 32 story tasks, and 2 final delivery tasks. Four new
IDs split formerly bundled UI work; they do not add product scope. Keep individual tasks
reviewable within the 30–60 minute target, and split further if needed before implementation.

| Story | Tasks | Story | Tasks |
| --- | --- | --- | --- |
| US1 | 3 | US8 | 3 |
| US2 | 3 | US9 | 1 |
| US3 | 3 | US10 | 2 |
| US4 | 2 | US11 | 1 |
| US5 | 2 | US12 | 2 |
| US6 | 2 | US13 | 3 |
| US7 | 2 | US14 | 3 |

The roughly 24 focused hours includes checks, design, and human review; this is a planning
budget, not proof that every task fits. Reassess time after each phase, minimize visual polish
and duplicate tests, and surface delays without dropping required invariants. Work ends
Wednesday night, November 11; Thursday, November 12 is submission only. No stretch goals.
