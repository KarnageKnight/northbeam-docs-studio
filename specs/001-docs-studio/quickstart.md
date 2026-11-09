# Quickstart and Verification Guide

**Date**: 2026-11-07
**Status**: Phases 1–14 approved. The user authorized execution through Phase 17 on
2026-11-08. Integrated acceptance and final audit/documentation are verified. Linux-client
Docker acceptance and macOS host development pass; Windows acceptance T028 remains open.
Phase 18 is unstarted. See the final acceptance evidence below.

**Last verified**: 2026-11-08.

## Current commands and evidence

With Node 24.22.2 and pnpm 12.18.0: `pnpm install --frozen-lockfile`, `pnpm dev`,
`pnpm run test:unit`, `pnpm run test:integration`, `pnpm test`, `pnpm exec nuxt typecheck`,
and `pnpm run build` are available. Full verification passes 99 database-free unit cases
and 143 real PostgreSQL/HTTP integration cases (242 total), plus typecheck and production build.
Docker startup builds the application, applies migrations, and serves the writer feature.
See [README.md](../../README.md) for prerequisites, configuration, and cleanup procedures.

Verified 2026-11-07 on macOS arm64 with Linux containers: the database foundation,
creation normalization/defaults/errors, unique-slug conflicts, exact list/detail projections,
UUID validation, generic production failures, unchanged read audits, and reopening drafts
after built-server restart. Chrome walkthrough passed create/list/open/reload, validation,
collision/input retention, failed submission, missing draft, and responsive 320/390/1440px
screens with no runtime exceptions/hydration warnings. The separate validation app used
port 3300; normal settings and existing development resources were preserved.
This paragraph records the earlier foundation checkpoint. Current platform and complete
lifecycle verification are recorded in the final acceptance section below.

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

Phase 13 lifecycle concurrency cases coordinate locks and observe distinct database connections before
releasing contenders; a pair of promises alone is not proof of overlap. A temporary
database failure can force publication rollback after snapshot insertion; remove temporary
fixture DDL before later cases. The restart case stops/restarts the built application
process with the same test database and verifies stored state through HTTP.

## Required automated evidence

This table summarizes the lifecycle test targets. The final FR/SC evidence map below
records their implemented verification and the remaining Windows platform gap.

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
portal switching do not reopen it. Editing/preview/save, Publish, Unpublish, and read-only history inspection are available;
Restore and eligible Delete are available from inspected history. Preview escapes raw HTML and rejects unsafe links.

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


## History inspection walkthrough

Open a never-published draft: history says No published versions yet. Publish, save changed
content, then publish again; history updates newest first by version number. Inspect an
older snapshot and the current snapshot separately from the draft form. Confirm exact
title/tags and shared safe Markdown, Current published label, and unchanged unsaved local
inputs. Unpublish and repeat inspection: history remains readable and the retained
reference is labeled Last published. Refresh history explicitly for external changes.
Failed list/inspection requests show separate retry feedback instead of an empty success.

Existing real HTTP/SQL cases verify empty history, valid non-v4 IDs, exact projections,
version-number ordering against conflicting UUID/time order, published/unpublished content,
missing/wrong-owner errors, unchanged article/history/public state, and restart persistence.
Inspection creates or mutates no snapshot. Phase 11 adds the separate Restore action;
Phase 12 now adds eligible Delete.


**Phase 10 browser evidence**: Real Chrome/SQL against a fresh production Docker app at
loopback 3300 passed empty draft history, publish-driven refresh, newest-first numbers,
old/current inspection with safe shared Markdown, retained history/last-reference label
after unpublish, and unchanged unsaved local title/body/tags plus stored/public state.
Separate list/inspection network failures showed retry/loading; input typed during a
paused history read survived. A controlled isolated SQL deletion of an eligible old
snapshot verified missing-version feedback and refresh without a Delete API/control.
At 320/390/1440px history fit with 44px action targets; reopening reset inspection and
loaded the saved draft. Initial article/history fetches are created together before
awaiting, preserving Nuxt context and SSR payload hydration. Final walkthrough had no
runtime exceptions/hydration warnings. Build/typechecks and all 206 tests pass (98 unit +
108 integration); pinned-type audit found no deprecations in 42 files/nine Vue scripts.
Disposable resources were removed; normal resources were preserved. Restore/Delete remain
later work.


## Restore walkthrough

Inspect an old version, choose Restore into draft, and confirm replacement if local inputs
are dirty. Cancel must keep all local text and make no request. Success changes only saved
draft content/revision/update time and says not published. Inspect and restore current,
last-published after Unpublish, and identical snapshots as well. Confirm no history or
public content/availability/date/reference/counter changes; publish remains explicit.

A stale second-tab Restore must preserve local text and offer explicit reload/resubmit.
Missing/wrong-owner targets return SNAPSHOT_NOT_FOUND after the locked revision check;
a stale token wins before target eligibility. Errors and delayed responses preserve local
text, including newer typing while a request is pending. Existing strict-action tests now
include Restore and focused HTTP/SQL cases prove old/current/identical restores in both
publication states, unchanged history/public metadata, rollback/recovery, and restart.


**Phase 11 browser evidence**: Real Chrome/SQL against a fresh production Docker app at
loopback 3300 passed old/current/identical Restore with exact draft/revision and not-published
feedback, unchanged live reference/content/date/history, and last-published/identical Restore
after Unpublish without restoring public access. Dirty confirmation names the target;
cancel makes no write and keeps local text. Successful delayed Restore preserves newer
local typing; subsequent explicit Save uses the returned revision, and Publish remains
separate. Two-tab stale rejection preserved local text; reload cancel/confirm and explicit
resubmission worked. Network failure/retry and a controlled isolated SQL missing-target
fixture preserved draft/revision; stale inspection cleared and refresh recovered. At
320/390/1440px Restore/confirmation controls fit with 44px targets; reopening showed the
persisted restored draft. No runtime exceptions/hydration warnings or Delete controls
were observed. Typechecks/build and all 210 tests pass (98 unit + 112 integration);
pinned-type audit found no deprecations in 44 files/nine Vue scripts. Disposable resources
were removed while normal resources were preserved. Delete remains Phase 12 work.


## Delete walkthrough

Inspect an eligible old snapshot and choose Delete version. The inline prompt names the
version; Cancel delete must make no request or change. Confirm delete returns empty 204,
removes the row/inspection, and refreshes history while preserving unsaved local inputs
and the article's saved revision. Inspection/Restore of the deleted snapshot returns 404.

Inspect the current snapshot: show Protected — current published version and no Delete.
After Unpublish, show Protected — last published version and continue rejecting direct API
deletion. Eligible history remains deletable in either state. Recheck unchanged draft,
audit fields, publication reference/date/counter, and public content/availability. Next
publication must allocate a new number rather than reuse any deleted number. Missing,
wrong-owner, and protected targets return explicit errors without mutations or lost text.
Existing HTTP/SQL tests verify these rules, rollback/retry, and restart persistence.


**Phase 12 browser evidence**: Real Chrome/SQL against a fresh production Docker app at
loopback 3300 passed current/retained protection labels and independent API rejection,
eligible Delete with named cancel/confirm, empty 204 and refreshed history, unchanged
article/audits/public/reference/date/counter, local inputs before/during a delayed response,
next Save using the unchanged revision, and deleted-target inspection/Restore rejection.
Eligible deletion after unpublish preserved visibility/date/reference; later publication
did not reuse removed numbers. Network failure and deliberate retry retained text/state.
A controlled isolated SQL reference fixture verified authoritative protected error,
explicit reload/cancel and stored counter preservation after highest eligible deletion;
external API deletion verified missing-target feedback/refresh without losing local text.
At 320/390/1440px Delete/Restore/confirmation controls fit with 44px targets. No runtime
exceptions/hydration warnings occurred. Typechecks/build and all 216 tests pass (98 unit +
118 integration); pinned-type audit found no deprecations in 46 files/nine Vue scripts.
Disposable resources were removed while normal resources were preserved. Coordinated
concurrency was subsequently verified in Phase 13; see its evidence below.

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
feature-level feedback, conflict preservation, or verification. Phases 1–14 are approved.
The user authorized one-shot execution through Phase 17, including intermediate gates.
T001–T027, T029–T032, and T035–T039 are verified (36 tasks). T028 remains open for Windows;
T033/T034 in Phase 18 are unstarted.

## Design handoff

Review [plan.md](plan.md), [data-model.md](data-model.md), and [contracts](contracts/http-api.md).
Analysis and the spec-first checkpoint were verified before the authorized Phase 1
implementation. The [tabbed design](ui-design.md) and Phase 4 create/list/open are approved;
the user subsequently authorized integrated acceptance and execution through Phase 17. AI creates no commits. Full application behavior and
Windows/Linux host support remain unverified.

## Writer slug URLs — Phase 12 review change

Open an article from the writer list, or create one through `/writer/articles/new`.
The editor URL is now `/writer/articles/:slug/edit`, for example
`/writer/articles/finding-inspiration/edit`. An article with slug `new` uses
`/writer/articles/new/edit`, so the creation form remains reachable. Direct links
and reloads resolve all publication states through the writer-only slug lookup.
Unknown slugs show Article not found. Old UUID browser URLs are replaced by slug URLs;
lifecycle/history APIs continue using UUIDs returned by the lookup. There is no schema migration.

Verification passed: Nuxt typecheck, production build, explicit integration-test typecheck,
and `pnpm test` (98 unit + 119 real PostgreSQL/HTTP cases, 217 total). Existing cases
now cover exact writer projections by slug in all publication states, read-only lookup,
SSR editor/list links, missing slugs, creation-route separation for slug `new`, and
reopening after a server restart. A production Chrome walkthrough confirmed creation
redirects, direct reloads, client navigation between articles, Save/Publish/Unpublish/
history/Restore/Delete using resolved UUIDs, stale-save local text preservation and
explicit reload, and failed initial lookup Retry with subsequent history/publication.
No runtime exceptions, malformed history requests, or hydration warnings occurred.
The pinned-type deprecation audit checked 47 source files/nine Vue scripts with no findings.
The prior phase counts above remain historical. Disposable verification resources were
removed; the normal application and database were preserved. The user subsequently
approved Phase 12 and authorized Phase 13; its evidence follows.


## Phase 13: rejection and concurrency verification

Verified on 2026-11-07, macOS arm64 with PostgreSQL 18.6 in isolated Linux containers.
No application behavior, architecture, schema, dependencies, or test orchestration changed.
The existing unit cases already cover strict expectedRevision types; the HTTP cases now
exercise all four revision-checked actions, invalid payloads, malformed/missing identifiers,
large safe stale revisions, stale-before-body/state/target ordering, no-op advancement,
and generic production errors. Rejections compare complete SQL/audit/history/public state.

The contention helper holds the article row on a controller connection, starts the first
HTTP request and observes its blocked backend, then starts the second request and observes
it queued behind the first. Three distinct PIDs demonstrate overlap on independent
connections. Only then does the controller release its row lock. Requests settle before
fixture reset, and failure cleanup releases the barrier.

| Coordinated overlap | Verified result |
| --- | --- |
| Save/save | First succeeds; second gets 409 STALE_REVISION; exactly one revision advance and winning draft |
| Publish/save, in both orders | First succeeds; second gets 409 STALE_REVISION; publication exists only if Publish wins |
| Unpublish/restore, in both orders | First succeeds; second gets 409 STALE_REVISION; coherent state, unchanged history/date/reference/counter |
| Publish then delete retained snapshot | 200/204; new owned reference exists and the superseded snapshot is deleted |
| Delete retained snapshot then publish | 409 SNAPSHOT_PROTECTED/200; protected snapshot survives and publication creates the next version |
| Restore then delete historical snapshot | 200/204; copied draft remains valid after source deletion; live snapshot is unchanged |
| Delete historical snapshot then restore | 204/404 SNAPSHOT_NOT_FOUND; draft/revision/audits/public output stay unchanged |

All nine overlap cases finish without deadlocks or partial state. Assertions include full
article/audit rows, unchanged prior snapshots, exact revision/counter changes, ownership,
first publication dates, and public list/detail output.

Two Chrome tabs separately verify stale Save/Publish/Unpublish/Restore. Text entered while
the rejected response is paused survives the 409; SQL and public output remain unchanged.
Each action makes one write request, with no automatic retry. Reload cancellation retains
text; confirmed reload loads the winner's draft/revision; explicit resubmission succeeds.
There were no runtime exceptions or hydration warnings.

`pnpm exec nuxt typecheck`, explicit strict integration-test typecheck, `pnpm build`, and
`pnpm test` pass. Final suite: 98 unit + 131 real PostgreSQL/HTTP cases (229 total).
The pinned-type deprecation audit checked 47 files/nine Vue scripts with no findings.
All test-runner resources and the separate Phase 13 browser-check project/volume were
removed; existing application resources/data were preserved. The user subsequently approved
Phase 13 and authorized Phase 14. Windows/Linux host execution remains unverified.


## Phase 14: slug lifecycle verification

Verified on 2026-11-07, macOS arm64 with PostgreSQL 18.6 in isolated Linux containers.
T021 extends existing tests; slug validation and lifecycle behavior needed no application fix.

| Evidence | Result |
| --- | --- |
| One/100-character slugs with uppercase and outer spaces | Normalize before length validation; exact lowercase value is stored and accessible through writer lookup |
| Empty/whitespace, leading/trailing/repeated hyphens, underscore/non-ASCII/slash, 101 characters | 400 VALIDATION_ERROR without article creation |
| Exact and normalized duplicates against draft/published/unpublished articles | 409 SLUG_CONFLICT; complete SQL/audit/history/public state unchanged; no suffix or extra row |
| Save supplying a slug field in every publication state | 400 VALIDATION_ERROR; original slug/state and lookup preserved |
| Save/Publish/republish/Unpublish/Restore/server restart | Stored slug remains fixed; original writer lookup resolves the same article |
| Observed competing creates with normalized-identical slugs | Exactly one 201 and one 409 SLUG_CONFLICT; one unsuffixed article and no snapshots |

The competing-create fixture pauses the first uncommitted row in an AFTER INSERT trigger
on a test-only advisory lock. The second HTTP backend is observed blocked on that first
transaction's unique-index entry. Three distinct backend PIDs establish real overlap.
Release permits the first creation to commit and the duplicate to fail; cleanup settles
requests, releases locks, and removes the trigger/function before later cases. No application
hooks or schema changes were added.

Production Chrome/SQL checks verify collision field messages and retained title/slug input
in all three states, then successful recovery with a new slug. One/100-character slugs
normalize and redirect to their writer editor; load/save work. The slug is displayed as
fixed without an editable input, and SQL, lookup, URL, and display remain stable across
Save/Publish/republish/Unpublish/Restore/reload. The maximum-length slug fits a 390px viewport.
No runtime exceptions or hydration warnings occurred.

`pnpm exec nuxt typecheck`, explicit strict unit/integration-test typecheck, `pnpm build`,
and `pnpm test` pass: 99 unit + 143 real PostgreSQL/HTTP cases (242 total).
The pinned-type deprecation audit checked 47 source files/nine Vue scripts with no findings.
Test-runner and separate Phase 14 browser-verification resources were removed; normal data was preserved.
No production code, API, migration, dependency, or architecture change was needed.
The user subsequently approved Phase 14 and authorized execution through Phase 17. Windows/Linux host execution remains
unverified.


## Final acceptance and evidence audit — November 8, 2026

The user authorized Phases 15–17 together, including intermediate review gates. No
application defect was found, so this run changed documentation/status only. The pinned-type
deprecation audit checked 47 source files/nine Vue scripts with no findings. All 242
existing tests pass (99 unit, 143 real PostgreSQL/HTTP), with no skipped cases. Nuxt
and strict test-source typechecks and the production build pass. `test:unit` also passes
with DATABASE_URL unset and DOCKER_HOST pointing to a nonexistent socket, demonstrating
that it requires neither a database nor a working Docker connection. The integration run
provisioned/migrated/reset its dedicated project and removed its containers/network/volume.
Earlier failure/interruption/overlap probes remain recorded above; normal app data was preserved.

### Requirement evidence map

Test names below are in [articles.test.ts](../../tests/integration/articles.test.ts),
[database.test.ts](../../tests/integration/database.test.ts),
[articles-validation.test.ts](../../tests/unit/articles-validation.test.ts), and
[markdown.test.ts](../../tests/unit/markdown.test.ts). The earlier phase sections retain
the detailed API/SQL/browser results; the integrated acceptance below repeats the combined UI.

| Requirement | Evidence | Result |
| --- | --- | --- |
| FR-001 | Creation/default/normalization/invalid-input HTTP cases; title/body/tag Unicode/length/type unit cases; UI creation | Verified |
| FR-002 | Complete-save/restart/no-op/stale/rollback cases; draft/live isolation; all editor fields | Verified |
| FR-003 | Atomic publish/republish, blank saved content, numbered immutable snapshots, first-date and counter assertions; post-insert failure/SIGKILL rollback | Verified |
| FR-004 | Unpublish retained state, invalid-state/stale ordering, rollback/recovery/restart; public exclusion/404 and later republish | Verified |
| FR-005 | Newest-number history, exact owned detail, empty/missing/wrong-owner cases and unchanged SQL; UI inspection | Verified |
| FR-006 | Old/current/last/identical restore, revision-before-target, rollback, non-destructive publication/history checks; dirty confirmation | Verified |
| FR-007 | Eligible/protected deletion in both publication states, owned targets, empty 204, rollback, deleted-number non-reuse and delete races | Verified |
| FR-008 | Shared rejection matrix, safe revisions, no-op advancement; five coordinated same-revision overlaps and both delete-race orders; four two-tab UI conflicts | Verified |
| FR-009 | Exact anonymous live-only list, draft/private field exclusion, rendering and restart cases; chooser/list navigation | Verified |
| FR-010 | Published-only detail and identical missing/draft/unpublished 404; safe shared Markdown unit/HTTP/browser checks | Verified |
| FR-011 | One/100-character boundaries, invalid formats, normalized collisions and rejected edits in all states, observed competing inserts, immutable lookup through lifecycle/restart | Verified |
| FR-012 | Integrated Chrome writer/public walkthrough and four two-tab recovery checks; controls at 320/390/1440px | Verified |
| FR-013 | Clean-copy Linux-client default startup/migrations/failure/restart and macOS Docker-free dev checks below | Partial: Windows T028 unverified |
| FR-014 | Full developer test command, typechecks/build, exact coverage audit and final README setup/model/rationale/tradeoffs/limits/demo | Verified with platform gap disclosed |
| SC-001 | Integrated journey performs every writer action via UI, without direct database edits | Verified |
| SC-002 | Live-only projection/visibility cases plus integrated save-without-publish and unpublish 404 | Verified |
| SC-003 | Database immutability/reference constraints; lifecycle/rollback/date/restore/deletion assertions | Verified |
| SC-004 | Observed independent backend locks/PIDs and exact one-success/one-stale results; local text retained in UI | Verified |
| SC-005 | Linux-client one-command startup and full named-volume state preservation; Windows runtime absent | Partial: Windows T028 unverified |
| SC-006 | Final README includes commands, model/rationale, actual scope tradeoffs, limits, and reviewer demo; tests optional for reviewers | Verified |

### Integrated browser acceptance — T026

Fresh production Chrome/SQL checks cover chooser → Writer → create/open, title/body/tags,
Write/Preview, escaped raw HTML/rejected unsafe links, explicit Save/Publish, public list/
detail and navigation, and saved-draft isolation until republish. History inspection,
restore cancel/confirm with dirty local text, draft-only restoration, delete cancel/confirm,
unpublish preserving local text while removing public access, republish preserving the
first date, version-number non-reuse, and missing writer/public pages pass. At 320/390/1440px,
controls fit without horizontal overflow and editor actions retain 44px targets.

Four repeated two-tab cases cover Save/Publish/Unpublish/Restore: the first tab changes the
saved revision; the second receives 409 while more text is typed into its local buffer.
The buffer survives, SQL/public state remains unchanged, no automatic write retry occurs,
Cancel reload keeps text, Confirm reload fetches saved content/revision, and explicit
resubmission succeeds. No runtime exceptions or hydration warnings occurred. No UI fix was needed.

### Platform acceptance — T027–T029

| Environment | Actual checks | Status |
| --- | --- | --- |
| Linux arm64 Docker CLI container, Docker Desktop Linux daemon on macOS | Clean source copy and documented Compose startup with default loopback port 3000/private DB; two migrations before serving; normal down/up preserves full article/version/audit/revision/counter/reference/date/journal/public state; failed migration prevents serving; recovery preserves data | T027 verified within this environment; standalone native Linux host not separately exercised |
| Windows PowerShell with Linux containers | No Windows OS/PowerShell environment available | T028 remains unchecked; startup, tests/signals/paths/cleanup and restart persistence still require execution |
| macOS arm64, host Node 24.22.2/pnpm 12.18.0 and local PostgreSQL 18.6/UTF8 | Clean-copy frozen install, migration CLI, `pnpm dev` on loopback, Unicode writer/public data, actual browser HMR without reload, and exact SQL/public persistence after Nuxt restart | T029 verified; Windows host-dev example remains unexecuted |

The Linux check used an isolated project, not the normal app. The database volume survived
normal down/up and retained exactly two migration journal rows. A deliberately unreachable
migration connection caused a nonzero app exit with no Listening message/HTTP serving;
restoring the URL recovered the same state. Temporary projects/volumes were then removed.

The host check built PostgreSQL 18.6 into a temporary directory and used a temporary UTF8
database on loopback port 55438; it did not use Docker for the database or dev server.
Only the temporary source copy was edited for the HMR marker, then restored byte-for-byte.
The dev and PostgreSQL processes were stopped after verification. Existing Postgres.app
and application data were untouched. PowerShell environment-assignment syntax is documented;
syntax review is not a substitute for a Windows execution result.

### Audit and handoff boundary — T030–T032

The audit found no missing automated lifecycle assertion requiring another test. Existing
cases were retained; the final suite/build/typechecks pass. README now describes actual
behavior, trusted concurrent sessions, safe Markdown, model/transaction rationale, real
scope tradeoffs, commands, a reviewer demo, and precise platform limits. Artifact status,
paths, pins, projections, field limits, error ordering, and test/startup instructions were
reconciled without changing architecture or requirements.

Phases 15 and 17 work are verified under the one-shot authorization. Phase 16 remains
partially verified because T028 is unavailable; FR-013/SC-005 cannot be called fully verified.
Phase 18 rehearsal/submission review (T033/T034) is unstarted. No git commands, AI commits,
submission, CI/deployment changes, or stretch features were introduced.
