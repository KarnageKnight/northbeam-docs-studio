# Tasks: Northbeam Docs Studio

**Feature**: `001-docs-studio` · **Created**: 2026-11-07
**Status**: Generated for human review; no implementation task has started.
**Input**: [specification](spec.md), [plan](plan.md), [research](research.md),
[data model](data-model.md), [HTTP contract](contracts/http-api.md),
[UI/service contract](contracts/ui-and-services.md), [quickstart](quickstart.md),
and [constitution](../../.specify/memory/constitution.md).

The request to generate tasks authorizes this planning artifact. Before application code,
review these tasks, run `speckit-analyze`, resolve material findings, and have the human
record the required specification/plan/task git checkpoint. AI runs no git commands and
creates no commits. All task boxes remain unchecked until implementation and required
verification are complete; leave changes for human review and approval.

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

- [ ] T001 Establish the runnable Nuxt/Vue/TypeScript shell and Tailwind Vite integration in `package.json`, `pnpm-lock.yaml`, `nuxt.config.ts`, `tsconfig.json`, `app/app.vue`, and `app/assets/css/main.css`, using the exact P069 pins and packageManager `pnpm@12.18.0`; configure `vitest.config.ts`, implement the first reusable title rule in `server/validation/articles.ts` with its meaningful boundary/Unicode tests in `tests/unit/articles-validation.test.ts`, and provide `pnpm dev`, `test:unit`, `test`, and build entry points. Verify host startup, `pnpm exec nuxt typecheck`, production build, and the existing unit suite; document the scaffold's current capabilities in `README.md` without claiming Docker/integration readiness.
- [ ] T002 Add the PostgreSQL service, readiness healthcheck, and project-scoped persistent volume in `compose.yaml`, following P064/P076: project `northbeam-docs-studio`, `postgres:18.6-bookworm`, private `db:5432`, no host database port, and `postgres_data` mounted at `/var/lib/postgresql`; document local defaults/optional overrides in `.env.example` and `README.md`. Verify the database starts and retains a disposable development probe across a normal restart without deleting existing data; the complete app startup contract is completed in T004.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 2: Foundational persistence and test harness

**Goal**: Migrations, immutable storage protections, Docker startup, and isolated real HTTP/SQL verification.
**Dependencies**: Setup phase approved.
**Independent test**: Fresh migrations, constraints/trigger assertions, production startup ordering, isolated test reset/cleanup, and full suite pass.

- [ ] T003 Implement the 19 approved columns, named constraints, and snapshot update-rejecting trigger in `server/db/schema.ts` and reviewed SQL/journal files under `drizzle/`; configure `drizzle.config.ts` for PostgreSQL, schema `server/db/schema.ts`, output `drizzle/`, and private DATABASE_URL, and add the reusable pool/client in `server/db/client.ts`. Preserve the model's exact rules: articles are "All columns are NOT NULL except the publication reference and publication date"; snapshots are "All columns are NOT NULL"; status is "`draft`; allowed values: draft, published, unpublished"; revision defaults to `0`, next_version_number to `1`, draft_body to "Empty string", draft_tags to "Empty array", publication fields to NULL, and all three audit defaults to `CURRENT_TIMESTAMP`. Use application UUIDv4 keys, UUID foreign keys, text content, text-array tags, integer counters, and timestamptz dates as mapped in `data-model.md`; snapshot content has no empty defaults. Enforce `UNIQUE(slug)`, `UNIQUE(article_id, version_number)`, supporting `UNIQUE(article_id, id)`, restrictive ownership/current-reference foreign keys, and "BEFORE UPDATE row trigger rejects every snapshot update, including audit fields". Apply migrations to fresh development PostgreSQL and verify constraints/trigger directly; do not add state/range CHECKs or a UUID extension. Automate these SQL assertions in T005.
- [ ] T004 Complete production container startup in `Dockerfile`, `.dockerignore`, `compose.yaml`, and `.env.example`: use `node:24.22.2-bookworm-slim`, provision pinned pnpm with npm, install the frozen lockfile, build production output, and retain Drizzle Kit/config/schema/migrations in the runtime target. Make app startup wait for healthy PostgreSQL, run `pnpm exec drizzle-kit migrate`, and serve Nuxt only after success; expose `127.0.0.1:3000:3000`. Verify `docker compose up --build` needs no mandatory .env step, migration failure prevents serving, and restart reapplies no completed migrations; keep secrets/generated output out of the build context. Update the actual run instructions in `README.md` and the implementation status in `quickstart.md`.
- [ ] T005 Establish automatic integration verification in `scripts/test-integration.mjs`, `vitest.config.ts`, `tests/integration/helpers.ts`, `tests/integration/database.test.ts`, `package.json`, `Dockerfile`, and `compose.yaml`. Use the test build target, profile services `test-db`/`test-runner`, fixed project `northbeam-docs-studio-test`, a fresh database/volume per run, and atomic overlap rejection before resource mutation. Set test DATABASE_URL before migration/server initialization, migrate with the installed CLI, start the built HTTP server and await readiness, and run files/cases sequentially. Reset `articles` and `article_versions` together without CASCADE, preserving the schema/journal; automate T003's uniqueness/ownership/reference/immutability assertions and an HTTP readiness smoke check. Verify independent test/app resources, a second run starts empty, overlap rejection leaves the active run untouched, and owned cleanup handles success/failure/interruption while preserving failure status. Add the real `test:integration` entry point and make `pnpm test` run both suites. Provide only the HTTP/SQL/process helpers used by these checks; document prerequisites and cleanup behavior in `README.md`.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 3: US12 — UI design and approval (P1)

**Goal**: Human-approved wireframes before the first feature screen.
**Dependencies**: Foundation approved; approved spec and UI/service contract.
**Independent test**: Review all five screen layouts and required feedback states in ui-design.md; explicitly approve design before T022 or any subsequent feature screen.

- [ ] T035 [US12] Produce `specs/001-docs-studio/ui-design.md` with simple wireframes for writer listing, creation, editor/history/preview, public listing, and public article detail. Document basic typography, spacing, colors, responsive layout, and loading/empty/validation/success/error/conflict/protected-deletion states using the approved Tailwind approach. Map screens to the existing routes/components and preserve explicit save-before-publish, retained-reference protection, and unsaved-text conflict behavior. Keep design/review within a 30–60 minute target; propose visual choices for human selection without adding UI libraries, routes, features, or implementation code. Review against the specification and `contracts/ui-and-services.md`, present the wireframes and rationale, and stop for explicit human approval. Keep this task unchecked and do not start feature-screen work in T022, T013, T023–T026, or T036–T039 until the design is approved; later UI implementation must follow it or obtain approval for changes.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 4: US1 — Create and open a draft (P1)

**Goal**: Create/list/open a persistent draft through the browser.
**Dependencies**: UI design phase approved; foundations ready.
**Independent test**: Create title/slug with empty defaults, see validation/collision feedback, reopen the read-only draft, and retain it across app restart; SQL proves no snapshots/publication fields. Public-route exclusion is additionally checked when public reading exists.

- [ ] T006 [US1] Extend `tests/unit/articles-validation.test.ts` and start `tests/integration/articles.test.ts` before implementing create input validation in `server/validation/articles.ts`, `server/services/articles/createArticle.ts`, `server/services/articles/toWriterArticle.ts`, `server/utils/api-errors.ts`, and `server/api/writer/articles/index.post.ts`. Quote and enforce the model rules: title "Nonblank; at most 200 Unicode code points"; slug "Trim/lowercase; 1–100 characters; lowercase ASCII alphanumeric groups separated by single hyphens"; body "At most 100,000 Unicode code points; empty allowed for draft creation/save"; tags "Array of strings; trim/lowercase, drop empty values, deduplicate in first-occurrence order" and "At most 10; each at most 30 code points; same character/hyphen format as slugs". Preserve title/body text; omitted/null creation body/tags normalize to empty values; reject wrong types/unknown fields/malformed JSON with 400 VALIDATION_ERROR. Return the exact 201 WriterArticle with UUIDv4, revision 0, draft status, null publication fields, counter 1, and no snapshot. Map the named normalized-slug violation to 409 SLUG_CONFLICT without a precheck race or automatic suffix; keep unexpected errors native/generic.
- [ ] T007 [US1] Extend `tests/integration/articles.test.ts` and its existing process helpers for writer list/load, missing/malformed IDs, unchanged read audit/revision, and draft reopening after a built-server restart using the same test DB; implement the needed projections in `server/services/articles/queries.ts`, `shared/types/articles.ts`, `server/api/writer/articles/index.get.ts`, and `server/api/writer/articles/[articleId]/index.get.ts`. Writer list returns draft title/status and empty `[]`; detail returns only the approved WriterArticle fields. Enforce "Valid UUID syntax; not restricted to UUIDv4 input", distinguishing 400 malformed from 404 valid missing IDs. Use native helpers consistently from `nuxt/server`; do not expose audit fields or allocation counters.
- [ ] T022 [US1] Implement `app/pages/writer/articles/index.vue` `app/pages/writer/articles/new.vue`, and a minimal read-only `app/pages/writer/articles/[articleId].vue` using native Nuxt fetching and existing HTTP types. Show draft-title/status summaries, empty/loading/error feedback, navigation, and a focused title/slug creation form; surface field/slug errors and navigate to `/writer/articles/:articleId` after successful creation using approved empty body/tags defaults. Let the destination load and display the newly created saved draft, with missing/error states; editing/preview controls arrive in the next feature. Manually verify create → list → open → reload against the real API and keep automated request behavior in `tests/integration/articles.test.ts` rather than adding a browser framework.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 5: US2 — Edit a draft with Markdown preview (P1)

**Goal**: Edit/save/reopen draft content with safe preview and immediate conflict feedback.
**Dependencies**: Create/open draft approved.
**Independent test**: Edit title/body/tags, preview safe Markdown, save and reopen after restart; unchanged save advances revision, invalid save does not, and two-tab stale save preserves local text with explicit reload/resubmit.

- [ ] T008 [US2] First extend the existing validation and HTTP/SQL cases in `tests/unit/articles-validation.test.ts` and `tests/integration/articles.test.ts`, then add the complete-save schema in `server/validation/articles.ts`, `server/services/articles/withArticleTransaction.ts`, `server/services/articles/saveDraft.ts`, and `server/api/writer/articles/[articleId]/draft.put.ts`. Require title/body/tags and expectedRevision with no coercion/null defaults or slug updates; the token rule is "Nonnegative safe integer JSON number; no coercion". Begin Read Committed transaction, lock article FOR UPDATE, return 404 if missing, compare revision before mutation, then replace only draft fields and increment revision once/update updated_at with CURRENT_TIMESTAMP. Return WriterArticle after success; unchanged saves also advance revision. Verify 409 STALE_REVISION makes no changes, creation timestamp/slug/counter/publication/history survive saves, and transaction queries use the callback transaction rather than the shared pool.
- [ ] T013 [US2] Add `shared/utils/markdown.ts` and `app/components/MarkdownContent.vue` for the editor preview, first creating meaningful cases in `tests/unit/markdown.test.ts`. Render standard Markdown, show raw HTML literally, and allow only HTTP/HTTPS/mailto/relative-path/#heading links; unsafe schemes never become clickable, including encoded/case variations. Preserve universal rendering and use this same renderer/component for the later public detail page in T039. Verify rendering through the preview in T023; do not build a public page or add a new library here.
- [ ] T023 [US2] Extend the read-only editor into an editable feature with per-invocation state/actions in `app/composables/useArticleEditor.ts`, present the form in `app/components/ArticleEditorForm.vue`, and compose them in `app/pages/writer/articles/[articleId].vue`. Implement load/save for title/Markdown/tags, immutable displayed slug, and preview through `app/components/MarkdownContent.vue`; keep editable content separate from the saved baseline/revision. Implement visible save-conflict feedback and explicit reload/resubmit now; preserve local text on 409 and edits made while a response is in flight, with no silent retry/rebase. Manually verify title/body/tags, shared preview, dirty/loading/pending states, validation feedback, unchanged saves, restart/reopen, and a two-tab stale-save conflict. Reuse existing unit/HTTP cases if a discovered server defect needs a regression; add no Pinia or module-global editor singleton.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 6: US3 — Publish saved content (P1)

**Goal**: Publish and republish from the writer UI with atomic immutable snapshots.
**Dependencies**: Editing/preview approved; no dependency on a later public-page task.
**Independent test**: Browser first publish/republish reports correct status/reference/original date, dirty draft requires explicit save, blank/stale publish is rejected; HTTP/SQL prove immutability, counters, rollback and crash atomicity. Public-reader rendering is its own subsequent feature.

- [ ] T009 [US3] Extend `tests/integration/articles.test.ts` before implementing `server/services/articles/publishArticle.ts`, its request schema in `server/validation/articles.ts`, and `server/api/writer/articles/[articleId]/publish.post.ts`. Enforce "Saved title and body must be nonblank" after article lock/revision comparison; blank saved content gives 400 VALIDATION_ERROR with no mutation. Generate snapshot UUIDv4, allocate its positive per-article number from the locked counter, insert saved title/body/tags, and atomically advance counter/revision, set published status/new owned reference, set published_at only on first publication using CURRENT_TIMESTAMP, and update updated_at. Return WriterArticle; verify repeated/unchanged publication creates new immutable rows and preserves first date, draft, slug, and earlier snapshot content.
- [ ] T010 [US3] Extend the publish scenarios in `tests/integration/articles.test.ts` using existing SQL/process helpers in `tests/integration/helpers.ts` to inject a temporary isolated-DB failure after snapshot insertion but before publication completes; remove fixture DDL reliably. Reuse a database lock barrier to terminate the built app during an uncommitted publish, restart against the same DB, and inspect persisted state; no production test hooks. For failure and crash, prove snapshot insertion, counter allocation, reference/status/date/revision, and audit changes roll back, and the next successful publish uses the uncommitted allocation correctly. Retain the existing direct snapshot-update rejection assertions without duplication. Fix only demonstrated lifecycle/transaction defects in `server/services/articles/publishArticle.ts` or `server/services/articles/withArticleTransaction.ts` if needed.
- [ ] T024 [US3] Extend `app/composables/useArticleEditor.ts`, `app/components/ArticleEditorForm.vue`, and `app/pages/writer/articles/[articleId].vue` with a separate Publish action, current status/reference/date, success/error feedback, and explicit reload after conflict. Require a successful explicit save of dirty content before publish; never auto-save, silently rebase, or auto-retry with a newer revision. Refresh saved revision from successful responses, serialize conflicting actions while pending, and preserve unsaved text on 409 or responses arriving after newer edits. Walk through first publication, unchanged republish, blank-body rejection, and stale publish with explicit reload/resubmit using real API/SQL evidence. Unpublish is added with its own feature in T036; no unimplemented action controls.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 7: US9 — Public article list (P1)

**Goal**: Anonymous live-only article listing in API and UI.
**Dependencies**: Publishing phase approved for real fixtures.
**Independent test**: List published title/tags/original date, exclude draft-only records, handle empty list, and prove saved draft edits do not change live list content. Use an isolated SQL unpublished fixture until real unpublish is added and retested in that phase.

- [ ] T011 [US9] Extend `tests/integration/articles.test.ts` for direct public list projections, draft isolation after save, empty arrays, and status exclusion before implementing the public list query in `server/services/articles/queries.ts`, types in `shared/types/articles.ts`, `server/api/public/articles/index.get.ts`, and `app/pages/index.vue`. Use one SQL statement joining published articles to their owned current snapshot; expose only slug/title/tags/publishedAt, with original date, and make the anonymous universal-rendered page show an understandable empty state and detail links. Inspect rendered output through the existing HTTP harness and manually verify the page; add no auth, ordering promise, search, pagination, or caching.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 8: US10 — Public article detail (P1)

**Goal**: Read published articles through the public page and shared safe renderer.
**Dependencies**: Public list and editor renderer approved; publications available.
**Independent test**: Navigate from public list, inspect live title/tags/date/Markdown, verify draft-only/missing/unpublished-fixture 404, unchanged public content after draft saves, and updated live content after republish. Real unpublish is verified in its own phase.

- [ ] T012 [US10] Extend `tests/integration/articles.test.ts` for public detail before implementing the one-statement owned-snapshot query in `server/services/articles/queries.ts`, response types in `shared/types/articles.ts`, and `server/api/public/articles/[slug].get.ts`. Return slug/title/body/tags/publishedAt with Markdown source and no internal/draft metadata. Missing, draft-only, and unpublished articles return 404 ARTICLE_NOT_FOUND; draft edits leave public list/detail unchanged and republish changes both while preserving publishedAt.
- [ ] T039 [US10] Implement `app/pages/articles/[slug].vue` against the public detail API, reusing `app/components/MarkdownContent.vue` and `shared/utils/markdown.ts` from the editor. Display live title/tags/original publication date/body with universal rendering, missing/unpublished 404, and appropriate loading/error states. Extend `tests/integration/articles.test.ts` for rendered published body and HTTP 404 where clear; manually prove draft edits leave public content unchanged, republishing changes the live view, and raw HTML/unsafe links follow the already-tested shared policy. Add no second renderer or new UI dependency.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 9: US4 — Unpublish (P1)

**Goal**: Remove public access through the writer UI while retaining publication history/state.
**Dependencies**: Publishing and public list/detail approved.
**Independent test**: Unpublish in browser, verify actual list exclusion/detail 404, retained draft/snapshots/reference/date, invalid/stale rejection, and republish preserving the original date.

- [ ] T014 [US4] After T011/T012, extend `tests/integration/articles.test.ts` and implement `server/services/articles/unpublishArticle.ts`, its action schema in `server/validation/articles.ts`, and `server/api/writer/articles/[articleId]/unpublish.post.ts` using the shared transaction helper. Compare revision before state eligibility; reject never-published/already-unpublished state with 409 INVALID_PUBLICATION_STATE. On success change status/revision/updated_at only; preserve draft, counter, snapshots, reference, created_at, and first published_at. Prove public exclusion/404, stale requests make no changes, and later republish preserves the date.
- [ ] T036 [US4] Extend `app/composables/useArticleEditor.ts`, `app/components/ArticleEditorForm.vue`, and `app/pages/writer/articles/[articleId].vue` with Unpublish and its pending/success/error states. Use the saved revision, preserve unsaved local text on conflicts, retain the reference/date after success, and show invalid-state feedback consistently with the API. Walk through publish → unpublish → public list exclusion/detail 404 → republish with the original date, plus stale-unpublish rejection; extend existing HTTP cases only for uncovered behavior. Follow the approved wireframes and retain separate Save/Publish/Unpublish actions.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 10: US5 — Inspect version history (P1)

**Goal**: List and inspect retained snapshots through API and editor history panel.
**Dependencies**: Publish/unpublish and editor approved.
**Independent test**: Inspect newest-first saved versions and full content, empty history, and history after unpublish; reject wrong-owner/missing snapshots and prove read-only state.

- [ ] T015 [US5] Extend `tests/integration/articles.test.ts` and add history/owned-detail queries in `server/services/articles/queries.ts`, types in `shared/types/articles.ts`, `server/api/writer/articles/[articleId]/versions/index.get.ts`, and `server/api/writer/articles/[articleId]/versions/[versionId]/index.get.ts`. Return VersionSummary array newest first by versionNumber and exact VersionDetail on inspection; never order by UUID/audit timestamp. Validate both UUIDs, distinguish missing article from snapshot, use 404 SNAPSHOT_NOT_FOUND for missing/wrong-owner snapshots, and preserve all revisions/audit/publication/history values on reads, including after unpublish.
- [ ] T025 [US5] Add `app/components/ArticleHistory.vue` and connect listing/inspection through `app/composables/useArticleEditor.ts` and `app/pages/writer/articles/[articleId].vue`. Show newest-first numbers and inspected title/body/tags, label the current/retained reference, and provide empty/loading/error feedback. Verify read-only history in published/unpublished states and that inspection changes no draft/publication/history data. Restore and delete controls are introduced only with their own feature phases T037/T038; use existing real API coverage and no browser automation dependency.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 11: US6 — Restore into draft (P1)

**Goal**: Restore selected history into the editable draft without publication.
**Dependencies**: History inspection approved.
**Independent test**: Restore old/current/last-published/identical snapshots from UI; check returned draft/revision and feedback, unchanged live state/history, stale-preserved local text, and rejected invalid targets.

- [ ] T016 [US6] Extend `tests/integration/articles.test.ts` before adding `server/services/articles/restoreDraft.ts`, its request schema in `server/validation/articles.ts`, and `server/api/writer/articles/[articleId]/versions/[versionId]/restore.post.ts`. Lock article and compare revision before resolving snapshot eligibility; then copy owned title/body/tags into draft and increment revision/update updated_at even for identical content. Preserve slug, status, reference, counter, first date, created_at, every snapshot, and public output/availability. Accept current/last-published snapshots; missing/wrong-owner snapshots give 404 SNAPSHOT_NOT_FOUND, while an otherwise valid stale request gives 409 STALE_REVISION first, with no changes.
- [ ] T037 [US6] Add Restore to `app/components/ArticleHistory.vue` and route it through `app/composables/useArticleEditor.ts` and `app/pages/writer/articles/[articleId].vue`. A successful explicit restore loads returned draft/revision without publishing; use the saved revision and preserve local text on rejection. Show pending/success/error feedback and verify old/current/last-published/identical restores, missing/wrong-owner targets, stale restores, unchanged public state/history, and explicit save/publish rules afterward. Reuse existing integration coverage and record the browser walkthrough in `quickstart.md`.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 12: US7 — Delete eligible history (P1)

**Goal**: Delete eligible snapshots from history while protecting retained references.
**Dependencies**: History/restore approved; publishing available to prove non-reuse.
**Independent test**: Delete eligible history in browser, reject current/retained reference in published/unpublished states, keep article revision/audit/local edits unchanged, and publish without reusing a deleted number.

- [ ] T017 [US7] Extend `tests/integration/articles.test.ts` before implementing `server/services/articles/deleteSnapshot.ts` and `server/api/writer/articles/[articleId]/versions/[versionId]/index.delete.ts`. Use a transaction and article-first lock without a caller revision, verify owner/existence, and reject the current/retained reference with 409 SNAPSHOT_PROTECTED; retain the restrictive FK as database protection. Return empty 204 on eligible deletion; malformed IDs give 400, missing article 404 ARTICLE_NOT_FOUND, missing/wrong-owner snapshot 404 SNAPSHOT_NOT_FOUND. Prove article fields/revision/audit/counter and public output remain unchanged, the highest eligible historical number is never reused on later publication, and deleted snapshots cannot be inspected/restored.
- [ ] T038 [US7] Add Delete to `app/components/ArticleHistory.vue` and connect it through `app/composables/useArticleEditor.ts` and `app/pages/writer/articles/[articleId].vue`. Visibly protect the current/retained reference in published/unpublished states; the API remains authoritative. Eligible deletion refreshes history without changing article revision or unsaved text; surface stale/missing/protected-target feedback from the actual API. Walk through eligible deletion, retained-reference rejection after unpublish, and subsequent publication without number reuse. Reuse existing HTTP/SQL evidence and record the browser results in `quickstart.md`.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 13: US8 — Cross-feature concurrency evidence (P1)

**Goal**: Complete real-contention and rejection-precedence evidence across already-usable features.
**Dependencies**: All lifecycle and public features approved; conflicts already implemented with each write.
**Independent test**: Parameterize stale operations and exact native errors, coordinate independent connections for same-revision writes and delete races, then repeat two-tab UI rejection/reload with preserved local content. No basic conflict handling is deferred to this phase.

- [ ] T018 [US8] Parameterize existing cases in `tests/integration/articles.test.ts` for save/publish/unpublish/restore stale-token behavior and extend `tests/unit/articles-validation.test.ts` where needed. Cover missing/null/string/fraction/negative/unsafe expectedRevision, strict unknown fields, a safe-integer revision beyond PostgreSQL integer range, missing articles, no-op revision advancement, and stale-before-publish-body/unpublish-state/restore-target checks. Assert exact native status/application code and unchanged SQL/public state for all rejected operations; extend generic unexpected-production-500 evidence without exposing database details. Fix only demonstrated defects in `server/validation/articles.ts`, `server/utils/api-errors.ts`, or the relevant lifecycle helper/operation.
- [ ] T019 [US8] Extend `tests/integration/articles.test.ts` and existing SQL helpers in `tests/integration/helpers.ts` with coordinated same-revision save/save and publish/save contention, plus a parameterized valid unpublish/restore contender where clear. Use real independent backend connections and an observed lock barrier, not Promise.all timing alone; release barriers in cleanup. Assert one success/one 409 STALE_REVISION, one revision advance, coherent draft/live snapshot/counter/date/audit values, and no partial history. Reuse the existing lifecycle assertions instead of duplicating entire suites.
- [ ] T020 [US8] Extend the existing contention cases in `tests/integration/articles.test.ts` and `tests/integration/helpers.ts` for publish/delete and restore/delete on the same article using deterministic lock coordination, exercising both operation orders. Verify each serialized outcome follows the HTTP contract: retained references cannot disappear, ownership stays valid, an eligible old snapshot may be deleted after the reference moves, and restore either copies an existing snapshot or fails without mutation if deletion wins. Complete operations before resets and prove no deadlock/partial state; change lifecycle code only for demonstrated failures.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 14: US11 — Slug lifecycle audit (P1)

**Goal**: Complete cross-state uniqueness/immutability evidence; creation validation already shipped with US1.
**Dependencies**: Lifecycle features approved.
**Independent test**: Test normalized duplicate creates across all statuses and contention; confirm UI collision feedback and fixed slug across save/publish/unpublish/restore. Extend earlier tests rather than introducing slug validation late.

- [ ] T021 [US11] Extend the existing cases in `tests/unit/articles-validation.test.ts` and `tests/integration/articles.test.ts` for normalized collisions against draft/published/unpublished articles, rejected leading/trailing/repeated hyphens or invalid characters, and accepted 1/100-character boundaries. Coordinate concurrent creates whose slugs normalize identically and assert exactly one 201 and one 409 SLUG_CONFLICT with no suffix/extra article. Verify the stored slug survives every lifecycle action and save rejects a slug field. Reuse `server/validation/articles.ts` and the named constraint mapping in `server/utils/api-errors.ts`; fix only uncovered defects.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 15: US12 — Integrated interface acceptance (P1)

**Goal**: Review the assembled interface; every action was built in its feature phase.
**Dependencies**: All feature slices and concurrency/slug checks approved.
**Independent test**: Walk through all writer/public flows and feedback including shared Markdown, history actions, unsaved edits, and two-tab conflicts; fix observed integration defects only, with passing existing checks.

- [ ] T026 [US12] Complete the integrated writer/public walkthrough and record results in `quickstart.md` and `README.md`, fixing only observed UI defects in `app/pages/writer/articles/`, `app/composables/useArticleEditor.ts`, or `app/components/`. Cover create/open, all fields, shared safe preview, separate save/publication actions, history inspect/restore/delete, visible success/failure, missing resources, and two-tab conflict preservation/reload/resubmit. Check public output remains unchanged until explicit publish. Run the existing full suite/typecheck/build; no new browser automation dependency or unrelated visual redesign.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 16: US13 — Local startup and persistence acceptance (P1)

**Goal**: Verify platform deployment and host development against the complete usable app.
**Dependencies**: Feature/interface phases approved; startup infrastructure already exists.
**Independent test**: Fresh Docker startup and normal restart preserve state on Linux/Windows PowerShell, and configured local PostgreSQL plus pnpm dev works without Docker; record unavailable platforms honestly and leave required unverified tasks open.

- [ ] T027 [US13] Exercise `docker compose up --build` from a clean temporary copy on Linux using `Dockerfile`, `compose.yaml`, and instructions in `README.md`/`quickstart.md`. Verify default startup, private DB/loopback app access, migrations before serving, failed-migration startup behavior, and repeat startup without schema duplication. Create representative draft/history/publication data through HTTP, perform normal service down/up without volume deletion, and prove content/reference/date/counters/audit data persist. Record real environment/results and make minimal configuration/documentation fixes; preserve existing application data.
- [ ] T028 [US13] Repeat the clean-copy reviewer startup and restart-persistence scenarios in Windows PowerShell with Linux containers, exercising `Dockerfile`, `compose.yaml`, `scripts/test-integration.mjs`, and `README.md`/`quickstart.md`. Verify the identical startup command, migration ordering, path/signal/cleanup behavior, full test command, and named-volume retention. Record actual Windows results; if no Windows environment is available, leave this task unchecked and record the gap rather than claiming support is verified.
- [ ] T029 [US13] Verify P077's Docker-free host development instructions in `README.md` and `quickstart.md` against `package.json`, `drizzle.config.ts`, and `server/db/client.ts`: locally running pinned PostgreSQL, locked install, POSIX/PowerShell DATABASE_URL examples, `pnpm exec drizzle-kit migrate`, then `pnpm dev`. Confirm UI/API, hot reload, local-only access, and persistence after dev-server restart; the URL must target the reachable host DB rather than Compose's private hostname. Record exercised platforms and any unavailable platform separately; integration tests retain their isolated Docker setup.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 17: US14 — Verification and reviewer documentation (P1)

**Goal**: Audit evidence and finish accurate reviewer documentation.
**Dependencies**: Feature/interface/platform phases approved for full acceptance.
**Independent test**: One full test command, separate typecheck/build, complete coverage map, and README prerequisites/configuration/model/rationale/real tradeoff/limitations; reviewers need not execute tests.

- [ ] T030 [US14] Audit FR-001–FR-014 and SC-001–SC-006 against `tests/unit/`, `tests/integration/`, `quickstart.md`, and this task list; extend existing cases only for uncovered acceptance behavior and record an evidence map in `quickstart.md`. Run `pnpm test`, `pnpm exec nuxt typecheck`, and `pnpm run build` against the final state; explicitly verify `test:unit` needs no PostgreSQL/Docker and `test:integration` automatically provisions/migrates/resets/cleans only test resources. A missing required assertion, skipped suite, cleanup failure, or unavailable check remains open.
- [ ] T031 [US14] Finalize `README.md` from actual implementation/results: Docker and host-dev prerequisites/configuration/startup, test commands, model and lifecycle/concurrency rationale, trusted shared writer access with concurrent sessions, safe Markdown policy, at least one actual time-pressure tradeoff and its future improvement, known omissions/unverified platforms, and the short required-flow demo. Clearly distinguish reviewer startup from developer testing; do not invent completed checks or add production/CI/auth scope.
- [ ] T032 [US14] Synchronize implemented/verified status across `specs/001-docs-studio/plan.md`, `research.md`, `data-model.md`, `contracts/http-api.md`, `contracts/ui-and-services.md`, `assumptions.md`, `quickstart.md`, `tasks.md`, and `ACTION_PLAN.md`, changing only outdated claims or approved deviations. Ensure runtime projections, field limits, paths, pins, revision/error ordering, startup/test procedures, and recorded evidence agree. Keep unverified tasks unchecked and maintain the original approved requirements; propose any architectural change for human decision before dependent code.

**Phase approval**: Pending human review. Demonstrate this phase, present verification results, and wait for explicit human approval before starting the next phase.

## Phase 18: Final delivery review

**Goal**: Clean-copy rehearsal and human-owned submission handoff.
**Dependencies**: All previous phases approved; reserve final two hours for defects/handoff.
**Independent test**: Rehearse the documented complete demo and validate final evidence, deliverables, and human-maintained history; do not submit or commit automatically.

- [ ] T033 Rehearse clean-copy installation and the complete reviewer demo from `README.md` and `specs/001-docs-studio/quickstart.md`, excluding local secrets/tooling/generated output from the temporary copy and retaining required tracked migration/lockfile assets. Reuse the existing platform and lifecycle evidence; rerun full suite/typecheck/build when fixes change the resulting state. Record remaining defects/platform gaps honestly and resolve required failures before marking the rehearsal complete; do not delete unrelated services/data or create git commits.
- [ ] T034 Review final deliverables against `specs/001-docs-studio/spec.md`, `plan.md`, `tasks.md`, and `README.md`: every required story has its evidence, API/UI/run commands match contracts, and actual omissions/tradeoffs are explicit. Explain the resulting design and checks for human review, confirm the human-maintained spec-before-code history/checkpoints without git commands, and prepare the requested repository/archive handoff. Leave submission and commits to the human; add no stretch work or unrelated refactoring.

**Phase approval**: Pending human review. Present final evidence and wait for explicit human approval before handoff; submission remains human-owned.

## Dependencies and execution order

Execute the phases above in order, with explicit human approval at every boundary.
Task IDs are stable references rather than a numeric execution sequence. UI tasks moved
into their owning story retain their original ID; newly split UI tasks are T036–T039.
No tasks are marked complete and no phase approval has been granted by this rewrite.

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
