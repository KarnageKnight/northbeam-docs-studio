# Quickstart and Verification Guide

**Date**: 2026-11-07
**Status**: Phases 1–8 approved. Phase 9 Unpublish is implemented and verified,
pending human approval. History features have not started.

## Current commands and evidence

With Node 24.22.2 and pnpm 12.18.0: `pnpm install --frozen-lockfile`, `pnpm dev`,
`pnpm run test:unit`, `pnpm run test:integration`, `pnpm test`, `pnpm exec nuxt typecheck`,
and `pnpm run build` are available. Full verification passes 98 database-free unit cases
and 103 real PostgreSQL/HTTP integration cases, plus typecheck and production build.
Docker startup builds the application, applies migrations, and serves the writer feature.
See [README.md](../../README.md) for prerequisites, configuration, and cleanup procedures.

Verified 2026-11-07 on macOS arm64 with Linux containers: the database foundation,
creation normalization/defaults/errors, unique-slug conflicts, exact list/detail projections,
UUID validation, generic production failures, unchanged read audits, and reopening drafts
after built-server restart. Chrome walkthrough passed create/list/open/reload, validation,
collision/input retention, failed submission, missing draft, and responsive 320/390/1440px
screens with no runtime exceptions/hydration warnings. The separate validation app used
port 3300; normal settings and existing development resources were preserved.
Windows/Linux host workflows and later lifecycle behavior remain unverified.

## Reviewer startup

Prerequisite: Docker Engine or Docker Desktop with a working Compose plugin and Linux
containers. Ensure host port 3000 is free. The same startup line applies to Linux shells and Windows PowerShell;
these host workflows have not yet been exercised:

```sh
docker compose up --build
```

Open `http://localhost:3000`, choose Writer in the entry popup, or visit `/writer/articles` to
create/list/edit/save/publish articles. Choose Public for the published article list;
open any published article to read its live Markdown. No authentication setup or mandatory
`.env` copy is required.

Expected startup: build the runtime image, start PostgreSQL, wait for its TCP readiness,
apply versioned migrations with `pnpm exec drizzle-kit migrate`, then start the production
Nuxt server. Migration failure exits without serving. No separate migration service runs.

## Local configuration and storage

| Setting | Default |
| --- | --- |
| Normal Compose project | `northbeam-docs-studio` |
| App host binding | `127.0.0.1:3000:3000` |
| Database service/port | `db:5432`, private to Compose |
| App database/user | `northbeam` / `northbeam` |
| Local database password | `northbeam_local` |
| App connection | `postgresql://northbeam:northbeam_local@db:5432/northbeam` |
| PostgreSQL image | `postgres:18.6-bookworm` |
| Node image | `node:24.22.2-bookworm-slim` |
| App volume | Project-scoped `postgres_data` at `/var/lib/postgresql` |

The password above is a provided local default. Optional `.env` overrides are documented
in `.env.example`. Compose derives the app connection from its database credentials;
optional `APP_DATABASE_URL` overrides it and becomes the container's server-only
`DATABASE_URL`. Host development uses `DATABASE_URL` directly; it does not override Compose.
Keep URLs consistent with database credentials and URL-encode reserved credential characters. Reviewer startup requires Docker, not host Node or pnpm.

PostgreSQL 18 stores data beneath `/var/lib/postgresql/18/docker`; mount the parent
`/var/lib/postgresql` as documented by the [official image](https://github.com/docker-library/docs/blob/master/postgres/README.md).
Normal stop/restart retains the named application volume. Tests have a different project,
network, and disposable volume; they never reset the application database.

## Local development without Docker

The Nuxt development server runs directly on the host with hot reload. The writer create/list/edit/preview/save feature
and migration commands are available; editing/publication/public reading come later. This workflow requires
Node `24.22.2`, pnpm `12.18.0`, and a running PostgreSQL `18.6` instance reachable from
the host. For a completely Docker-free setup, install PostgreSQL locally and create the
development database/user first. These examples assume database/user `northbeam`, password
`northbeam_local`, and PostgreSQL listening on loopback port 5432.

Install dependencies:

```sh
pnpm install --frozen-lockfile
```

Set the server-only connection URL in the terminal where migrations and Nuxt will run.
Linux/POSIX shell:

```sh
export DATABASE_URL='postgresql://northbeam:northbeam_local@127.0.0.1:5432/northbeam'
```

Windows PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://northbeam:northbeam_local@127.0.0.1:5432/northbeam'
```

Apply migrations before the first start and whenever new migrations are added:

```sh
pnpm exec drizzle-kit migrate
```

Start the local development server with the same command on either platform:

```sh
pnpm dev
```

The `dev` package script runs `nuxt dev --host 127.0.0.1 --port 3000`, serving
both UI and API at `http://localhost:3000`. The connection URL uses the host database
address; Compose's `db` hostname is internal to Docker. Stop any other app using port
3000 before starting. Host development does not automatically provision PostgreSQL or
apply migrations. It uses the same schema, services, and renderer as the Docker workflow.

The `pnpm dev` command uses the same writer application as the Docker build. Host development against a locally
installed PostgreSQL instance has not been exercised. Integration tests use their
isolated Docker/PostgreSQL workflow; Docker-free development does not change that requirement.

Reference: [Nuxt development command](https://github.com/nuxt/cli/blob/main/docs/dev.md).

## Developer verification

Additional prerequisites: Node `24.22.2`, pnpm `12.18.0`, and Docker/Compose for the full suite.
The checkout contains the approved manifest and lockfile. Install dependencies with:

```sh
pnpm install --frozen-lockfile
```

| Command | Current coverage |
| --- | --- |
| `pnpm dev` | Host Nuxt development server; configured PostgreSQL and applied migrations required |
| `pnpm run test:unit` | 98 database-free title/create/save/publish validation and safe Markdown cases |
| `pnpm run test:integration` | Automatic isolated Compose database, migrations, built HTTP server, PostgreSQL assertions |
| `pnpm test` | Both suites; nonzero result if either fails |
| `pnpm exec nuxt typecheck` | Application/Vue typechecking with the approved toolchain |
| `pnpm run build` | Production Nuxt build |

All commands above are implemented. Integration checks cover database protections, draft creation/reads/restart, native
HTTP errors, and production readiness; publish API checks now also prove first publish/republish, saved/live isolation, retained
dates, stale ordering, post-insert failure rollback, and SIGKILL recovery at an observed
PostgreSQL lock barrier. Remaining lifecycle coverage follows each feature.
Task completion requires the production build and existing suite;
maintain required type checks and update affected documentation.

## Initial implementation bootstrap

Before the app image exists, T003 generates/reviews the schema and SQL migration files
without a live database connection. T004 then builds the app and uses its normal startup
entry point to apply those migrations to private Compose PostgreSQL. Verify constraints
and the immutable-snapshot trigger from inside the db container using
`docker compose exec db psql` with the configured database/user. Use a fresh development
validation project and preserve existing development volumes/data. T005 turns those checks
into automated evidence against the separate disposable test database.

This sequence was completed in Phase 2 using a separate validation project. Host Node/pnpm
does not need direct access to the Compose-only database for this bootstrap;
Docker-free development uses the separate host database procedure above.

## Integration runner lifecycle

`scripts/test-integration.mjs` uses fixed project `northbeam-docs-studio-test`, with only
the `test-db` and `test-runner` services activated from the test profile. The test runner
build target includes the production server output plus its test/development dependencies.
Its DATABASE_URL targets the dedicated test service/database, not host application settings.

1. Acquire atomic coordination for the fixed test project before changing resources.
   Reject overlapping runs without touching the active run's resources.
2. Start from fresh test resources. Build the test target and start the dedicated database;
   wait for readiness. Explicitly target test services, not the normal app/db service set.
3. Apply the same versioned application migrations against the test database.
4. Shared integration process helpers start/await/stop the built Nuxt server for each
   sequential test file. Restart tests stop/start that same server against the same database.
5. Run Vitest integration cases sequentially. Reset only `articles` and `article_versions`
   together between cases, preserving schema, constraints, triggers, and migration journal.
6. Complete requests/transactions and stop the server. Attempt test-project cleanup on
   success and handled failures/interruptions; retain failure status and report cleanup failures.
7. Remove the disposable test volume and release ownership. A subsequent run starts fresh.

The runner uses Docker's explicit project option for every resource operation. Avoid fixed
global volume/container names that bypass project isolation. Keep coordination owned until
cleanup ends. Handle stale-run diagnostics without treating an active run as disposable.
The runner and its failure paths were verified on macOS arm64 with Linux containers.
See README for ownership diagnostics and stale-lock handling; Windows/Linux host runs remain unverified.

Future lifecycle concurrency cases must coordinate locks and observe distinct database connections before
releasing contenders; a pair of promises alone is not proof of overlap. A temporary
database failure can force publication rollback after snapshot insertion; remove temporary
fixture DDL before later cases. The restart case stops/restarts the built application
process with the same test database and verifies stored state through HTTP.

## Required automated evidence

The table below is the target for subsequent feature phases. It does not claim those
lifecycle/API behaviors are already implemented or tested. Current evidence is listed above.

| Requirements | Scenarios / expected outcomes |
| --- | --- |
| FR-001, FR-002, FR-011 | Required/normalized fields, Unicode limits, strict types, null creation defaults, duplicate slug rejection, fixed slug |
| FR-003 | Saved nonblank body; new immutable snapshot per publish, including unchanged content; counter/revision/reference/status/date commit together |
| FR-004 | Public visibility removed; history/reference/date retained; invalid unpublish rejected |
| FR-005, FR-006 | Newest-first history, owned inspection, restore old/current/identical content without history/public changes |
| FR-007 | Referenced deletion rejected while published/unpublished; eligible deletion succeeds without revision changes; deleted numbers never reused |
| FR-008 | Stale operations fail without changes; no-op revision advancement; coordinated competing writes and publish/delete races |
| FR-009, FR-010 | Public reads use live content only; absent/draft/unpublished 404; original publication date preserved; safe Markdown/link rendering |
| FR-003, SC-003 | Forced publish failure rolls back snapshot, counter, publication fields, revision, and audit changes |
| FR-013 | Real DB data survives application restart; manual Compose restart verifies named-volume persistence |
| FR-014 | Unit/full entry points, native HTTP error contracts, passing build/typecheck, accurate setup/test documentation |

Native HTTP tests include malformed JSON/IDs/revisions, missing/wrong-article targets,
expected conflicts and error codes, direct response projections, 204 bodies, and generic
unexpected production 500 responses. SQL assertions verify immutable rows and foreign keys.
Extend shared cases/fixtures where clear; do not duplicate lifecycle tests for private helpers.

## Current writer walkthrough

Open `/writer/articles`, create a draft with title/slug, edit title/body/tags, preview
unsaved Markdown, save, return to the list, reopen, and reload. Try blank title/invalid slug, then a normalized slug
collision; entered values remain available after errors. Body/tags start empty in the form.
The API also accepts validated body/tags at creation. Public dismisses the entry popup to the implemented published article list. Fresh root visits show the chooser; direct writer links and client
portal switching do not reopen it. Editing/preview/save, Publish, and Unpublish are available; history
actions arrive in their owning phases. Preview escapes raw HTML and rejects unsafe links.

For conflict review, open the same article in two tabs, save one, then save the older tab.
Its text remains available. Reload saved article offers confirmation/cancel for dirty text;
confirmed reload refreshes the saved revision for explicit resubmission. Unchanged saves
also advance revision. Real Chrome checks verified these flows, field errors, network
failure, separate article state, keyboard tabs, and newer edits surviving a delayed save
response at 320/390/1440px, without runtime exceptions or hydration warnings.


## Publish walkthrough

Save a nonblank title/body, then choose Publish separately. Dirty or blank saved content
disables Publish with a reason. First publish shows published status, the original date,
and a snapshot reference; unchanged republish creates another numbered snapshot while
preserving the date. Saving new draft content leaves earlier snapshots untouched.

Open the same article in two tabs. Save in one, then Publish from the older clean tab;
the older tab shows STALE_REVISION feedback without automatic retry. Local edits remain
available; reload is explicit and confirms replacement when dirty. After reload, publish
again explicitly. Edits made while a publish response is in flight must stay local and
must not become published implicitly.

HTTP/SQL checks verify first publication, unchanged/changed republish, first-date retention,
stale-before-blank ordering, strict expectedRevision input, and restart persistence.
Test-only trigger failures after snapshot insertion prove first/republish rollback.
An independent connection holds an advisory lock reached by a test-only AFTER INSERT
trigger; observed blocking precedes SIGKILL. Restart shows no partial snapshot or changed
article/counter/audit state, and the next publication uses version 1. All fixture DDL/locks
are removed; no production test hook or database migration was needed.


**Phase 6 browser evidence**: A fresh production Docker application on temporary loopback
port 3300 passed real Chrome checks for blank/dirty guards, explicit save then Publish,
unchanged republish/date retention, current snapshot reference, saved/live isolation,
two-tab stale publication, in-flight edit retention, reload/cancel/resubmit, and network
failure. Successful delayed publish responses retain newer local text; the next explicit
save uses the returned revision. SQL confirms four publications create four snapshots
while subsequent saves leave the live snapshot unchanged. Layouts at 320/390/1440px fit
without overflow, action targets meet 44px, and no runtime/hydration errors were observed.
Validation resources were removed without touching the normal app/development database.


## Public list walkthrough

Choose Public from a fresh entry popup or the header. With no published articles, expect
“No published articles yet.” Publish an article in Writer, return to Public, and confirm
its live title/tags/original date and `/articles/:slug` links. Saving a different draft
title/tags must leave the list unchanged; republish updates the list while retaining the
date. Draft-only and unpublished articles are excluded. These public-read cases now use
the real Unpublish API. Detail destinations are now implemented by Phase 8.

Existing integration tests now cover the exact anonymous four-field projection, empty
API/UI, server-rendered title/tags/date/links, literal HTML-looking title text, exclusion
of private content, unchanged read audits, save/republish isolation, and restart persistence.


**Phase 7 browser evidence**: Real Chrome against a fresh production Docker app at temporary
loopback port 3300 passed entry chooser/public navigation, empty list, live-only summaries,
empty-tag rows, literal HTML-looking titles, first dates and destination links. Saving
changed draft title/tags kept the list unchanged; republish updated it with the original
date. A blocked public fetch showed error/Retry; paused retry showed loading and then
recovered the list. At 320/390/1440px maximum-length title/tag fixtures fit without page
overflow, links met 44px targets, and no runtime exceptions/hydration warnings occurred.
The full suite passes 98 unit + 96 integration cases. Disposable validation resources were
removed; normal app/development resources were preserved. Phase 8 now implements detail destinations.


## Public detail walkthrough

Open a Read article/title link from Public. Confirm live title/tags, original date, and
rendered Markdown, then return using All articles. Raw HTML should remain visible as text;
unsafe links must not be clickable. The same body must render identically in writer Preview.
Save changed draft title/body/tags and reload the public page: the saved changes remain
private. Explicit republish updates public list/detail while preserving the first date.

Visit missing, draft-only, and SQL-fixture unpublished slugs directly. API and page return
404; the reader shows Article not found and All articles without private content. Real
Unpublish is now implemented in Phase 9. Unexpected fetch failures provide Retry.
Existing public-read integration cases now also verify exact detail fields, safe server
rendering, matching unavailable-state HTTP 404, unchanged read audits, and restart persistence.


**Phase 8 browser evidence**: A fresh production Docker app on temporary loopback 3300
passed list/detail/All articles navigation without reopening the chooser; live title/tags/
date/body and exact anonymous projection; identical writer-preview rendering; safe raw HTML
and link policy in browser/server HTML; draft privacy until republish with retained first
date; matching missing/draft-only/unpublished-fixture page/API 404; error/Retry/loading;
and 320/390/1440px reading layouts with maximum title and long code. The return link was
adjusted to a 44px target after browser review; all checks passed again. Code overflow stays
inside its block, empty tags are omitted, and no writer controls/runtime/hydration errors
were observed. The full suite passes 98 unit + 99 integration cases. Nuxt/changed-test
typechecks and production build pass; disposable resources were removed without touching
normal resources. Phase 9 now adds real Unpublish.

**Phase 8 review follow-up**: Reader missing-state detection uses Nuxt’s canonical
`error.status` property instead of its deprecated `statusCode` alias. Existing unavailable-
article API/page tests cover this behavior. The same canonical property is used in the
writer editor load/reload state and missing screen. Existing writer missing-ID cases now
also verify server-rendered not-found feedback; no additional test cases were needed.
The broader pinned-type deprecation audit also replaced the deprecated one-argument
`setResponseStatus(404)` overload with `setResponseStatus(requestEvent, 404)`, guarded by
the server request event. Existing HTTP 404 tests verify the behavior.
The installed TypeScript suggestion-diagnostic audit covers 37 source/configuration files,
including eight Vue script blocks, and reports no remaining deprecations after this fix.
Template legacy-syntax checks, Nuxt typecheck, production build, and all 197 tests pass.


## Unpublish walkthrough

Publish an article and confirm its public list/detail. Make unsaved local changes in
Writer, then choose Unpublish. Local title/body/tags must stay intact while public listing
excludes the article and detail returns 404. The header retains the first date and shows
Last published snapshot. Save deliberately, then republish; the date is unchanged and a
new snapshot is allocated. A second-tab stale unpublish preserves local text and offers
explicit reload with confirmation/cancel when dirty. No automatic rebase or retry occurs.

Existing strict-action cases now cover Publish and Unpublish. New focused HTTP/SQL cases
prove state/revision/update-time-only mutation, retained draft/reference/date/counter/history,
public exclusion/page/API 404, stale-before-state error order, invalid states, rollback,
restart persistence, and later republish. Earlier public unpublished SQL fixtures now
use the real API. All 98 unit + 103 integration cases pass alongside typecheck/build.


**Phase 9 browser evidence**: A fresh production Docker app at temporary loopback 3300
passed dirty Unpublish without implicit save, preservation of all local fields before/
during a delayed response, retained last reference/first date/history, actual public UI
exclusion/detail 404, and explicit save/republish with original date. Two-tab stale
Unpublish preserved text; cancel/confirm reload and deliberate resubmission worked.
Client Public navigation fetched current visibility without reopening the chooser.
Network failure kept local/public state intact; deliberate retry succeeded. A controlled
isolated SQL state fixture verified matching-revision INVALID_PUBLICATION_STATE feedback
and explicit reload. At 320/390/1440px the three action buttons fit with 44px targets,
with no runtime/hydration errors or later history controls. Nuxt/changed-test typechecks,
build, and full suite pass (98 unit + 103 integration); the pinned-type audit found no
deprecations across 39 files/eight Vue scripts. Disposable resources were removed,
preserving normal resources. History inspection remains Phase 10 work.

## Acceptance coverage

These are final acceptance targets; the feature walkthroughs and lifecycle checks remain pending.

SC-001 is demonstrated by the writer walkthrough; SC-002 by public visibility/isolation
checks; SC-003 by the lifecycle/rollback suite; SC-004 by coordinated revision races;
SC-005 by fresh-start and restart checks on the recorded platforms; SC-006 by the final
README review. FR-012's writer controls, preview, and conflict feedback use manual browser
verification alongside the tested HTTP operations.

## Manual walkthrough and platform record

Run these flows as their feature phases become available, then repeat for final delivery.

1. From a fresh implemented checkout, start with the reviewer command and create an article
   through the dedicated page. Enter content/tags, preview, explicitly save, then publish.
2. Compare public content to the snapshot. Edit the draft; the public view stays unchanged
   and Publish requires saving local edits first.
3. Inspect history, publish another version, restore an older/current version, and delete
   eligible history. Confirm the retained reference is protected even after unpublish.
4. Use two editor tabs: save in one, then attempt an action with the other's old revision.
   Confirm visible conflict feedback and preservation of unsaved local text.
5. Check empty lists, missing/unpublished public 404s, Markdown HTML/link policy, and action feedback.
6. Stop normal services with `docker compose down`, then start with `docker compose up --build`.
   Verify article IDs, drafts, snapshots, publication state/date, and audit data remain.
7. Run automated verification and record actual host platforms and outcomes. Verify startup
   in Linux and Windows PowerShell before claiming support; record any unverified platform.
8. Verify host development with a local PostgreSQL connection: migrations apply,
   `pnpm dev` serves UI/API, edits hot reload, and lifecycle data persists after restarting
   the development server. Record the platforms actually exercised.

The final README must cover prerequisites, these procedures, model rationale, an actual
time-pressure tradeoff, and known omissions. Reviewers are not required to execute tests.

## Feature-phase review

Implementation follows [tasks.md](tasks.md): build each feature's API and UI together,
run its existing/new meaningful checks and browser walkthrough, then present the results
for human phase approval. Do not wait until all APIs exist to exercise writer screens.
The later integrated walkthrough repeats the combined experience; it does not defer
feature-level feedback, conflict preservation, or verification. Phases 1–8 are approved.
T001–T014, T022–T024, T035–T036, and T039 are verified and checked (20 tasks).
Phase 9 awaits human approval; later tasks remain unchecked.

## Design handoff

Review [plan.md](plan.md), [data-model.md](data-model.md), and [contracts](contracts/http-api.md).
Analysis and the spec-first checkpoint were verified before the authorized Phase 1
implementation. The [tabbed design](ui-design.md) and Phase 4 create/list/open are approved;
review Phase 9 Unpublish before starting Phase 10 history inspection. AI creates no commits. Full application behavior and
Windows/Linux host support remain unverified.
