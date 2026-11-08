# Northbeam Docs Studio

An article-publishing application for writing on any topic. Public readers see articles
explicitly published by writers.

Phase 12 adds deletion of eligible historical snapshots. Phases 1–11 are approved;
Phase 12 is verified and awaits human review.
Cross-feature concurrency and final acceptance remain in later phases of
[tasks.md](specs/001-docs-studio/tasks.md).

## Run with Docker

Prerequisites: Docker Engine or Docker Desktop, the Compose plugin, Linux containers,
and a free local port 3000. From the project directory, on Linux or Windows PowerShell:

```sh
docker compose up --build
```

Open http://localhost:3000 and choose Public or Writer in the entry popup. Compose starts PostgreSQL, waits for its healthcheck, applies
versioned migrations from the app container, then starts the production Nuxt application.
Migration failure prevents the application from serving. Completed migrations are not
reapplied on restart. No host Node/pnpm installation or mandatory `.env` step is needed.

The database has no published host port. The application uses `db:5432` within Compose;
its browser port is bound to loopback. Database/user default to `northbeam`, with local
password `northbeam_local`. Optional `.env` settings are documented in `.env.example`.
`APP_DATABASE_URL` overrides the Docker app connection independently of the host-development
`DATABASE_URL`; URL-encode reserved credential characters when providing an override.

The project-scoped `postgres_data` volume is mounted at `/var/lib/postgresql`, the parent
of PostgreSQL 18's data directory. Normal stop/start or `docker compose down` retains it.
To open a database terminal with defaults:

```sh
docker compose exec db psql -U northbeam -d northbeam
```

Use the configured database/user if overridden. To stop the normal application:

```sh
docker compose down
```

## Develop without Docker

Use Node **24.22.2**, pnpm **12.18.0**, and a running host-accessible PostgreSQL **18.6**
instance with a development database/user. Install project dependencies:

```sh
pnpm install --frozen-lockfile
```

Set a connection URL in the same terminal. Linux/POSIX shell:

```sh
export DATABASE_URL='postgresql://northbeam:northbeam_local@127.0.0.1:5432/northbeam'
```

Windows PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://northbeam:northbeam_local@127.0.0.1:5432/northbeam'
```

Apply migrations before the first start and after adding migrations, then start with hot reload:

```sh
pnpm exec drizzle-kit migrate
pnpm dev
```

The server runs at http://localhost:3000 on loopback. Compose's private `db` hostname is
not reachable from the host. The writer pages now use the configured PostgreSQL database
for draft creation, reads, and revision-checked saves.

## Create, edit, save, and publish an article

1. Open `/writer/articles` directly, or choose **Writer** in the entry popup or header.
2. Choose **New article**, enter title and slug, then choose **Create draft**.
   Creation and list links open `/writer/articles/:slug/edit` (for example,
   `/writer/articles/finding-inspiration/edit`). The creation form stays at
   `/writer/articles/new`; an article with slug `new` opens at `/writer/articles/new/edit`.
3. Edit title, body, and comma-separated tags. Switch between **Write** and **Preview**.
4. Choose **Save draft**, then reopen or reload to see the saved content.
5. For conflict review, open the same article in two tabs. Save in one, then try saving
   the older revision in the other. Its local text stays intact; use **Reload saved article**
   and confirm before replacing local edits, or cancel to keep them.
6. Save a nonblank title and body, then choose **Publish**. The header shows published
   status, the first publication date, and the current snapshot reference. Choose **Publish**
   again to create another snapshot, even without content changes.

Title is required (up to 200 Unicode code points). Slugs trim/lowercase and must contain
letters/numbers separated by single hyphens (up to 100 characters); collisions are rejected
without automatic suffixes. The form starts body/tags empty; the API also accepts validated
body/tags on creation. Failed submissions keep entered values. Preview uses unsaved body
text without saving; raw HTML stays literal and unsafe links are not clickable. Saves
normalize tags, advance revision even for unchanged content, and retain newer edits typed
while a response is pending. Reload is explicit; stale saves are never automatically retried.
Publish remains unavailable while dirty or while saved title/body is blank, with an
adjacent explanation. It never saves implicitly. Saving later draft changes preserves the
live snapshot until the next explicit Publish. **Unpublish** is available while published,
even with local edits: it removes public access without saving or discarding those edits.
Status changes to Unpublished while the last snapshot reference and first date remain.
Version history below the editor lists published snapshots newest first; Inspect loads
read-only content separately from local edits. Restore into draft is available for any
retained owned version. Delete version is offered only for an unreferenced snapshot,
with a version-specific confirmation. Current/last-published references remain protected.
The **Public** choice opens the published article list at `/`. The chooser appears on fresh root-page visits, keeps the choice during client
navigation, and leaves direct writer links uninterrupted. Escape dismisses to Public.
There is no separate “Open writer workspace” landing page or persistent role selection.

Current API: `POST /api/writer/articles`, `GET /api/writer/articles`,
`GET /api/writer/articles/by-slug/:slug`, `GET /api/writer/articles/:articleId`, `PUT /api/writer/articles/:articleId/draft`,
`POST /api/writer/articles/:articleId/publish`, `POST /api/writer/articles/:articleId/unpublish`,
`GET /api/public/articles`, `GET /api/public/articles/:slug`, `GET /api/writer/articles/:articleId/versions`, and
`GET /api/writer/articles/:articleId/versions/:versionId`, and
`POST /api/writer/articles/:articleId/versions/:versionId/restore`, and
`DELETE /api/writer/articles/:articleId/versions/:versionId`.
Writer browser links use immutable slugs; the writer lookup resolves the internal UUID
used by lifecycle and history requests. No database migration is needed.
A save requires complete `title`, `body`, `tags`, and `expectedRevision`; it returns the
updated WriterArticle. Publish and Unpublish accept only `expectedRevision` and return WriterArticle.
See the [HTTP contract](specs/001-docs-studio/contracts/http-api.md).


## Browse published articles

Choose Public in the entry popup or header. The list shows only published snapshot titles,
tags, and original publication dates; draft-only and unpublished articles are excluded.
Saving draft edits leaves the public list unchanged until explicit republish. Empty,
loading, and error/retry states are provided. Titles are rendered as text.

Title/Read article links open `/articles/:slug`, showing only live title, tags, original
publication date, and Markdown body. The page shares the editor preview renderer: embedded
HTML stays literal and unsafe links are not clickable. Draft saves leave public list/detail
content unchanged until republish. Missing, draft-only, and unpublished articles return
HTTP 404 with “Article not found” and an All articles link. Failed fetches offer Retry.
No authentication, search, pagination, or ordering promise is added.


## Unpublish and republish

Choose Unpublish in a published article's writer editor. Public list access disappears
and its public detail returns 404. Draft content, immutable snapshots, the retained
reference, original first-publication date, and version counter remain intact. Local
unsaved title/body/tags remain in the editor; Unpublish never saves them implicitly.
Save any edits explicitly before publishing again. Republish creates a new snapshot and
retains the original date. Stale/state conflicts preserve text and require explicit reload.


## Inspect version history

Open a writer article and find Version history below the editor. Published snapshot
numbers appear newest first; choose Inspect for the saved title, tags, and safe rendered
Markdown. Inspection is read-only and preserves unsaved local title/body/tags. The current
publication reference is labeled Current published, or Last published after Unpublish.
Drafts without publications show No published versions yet. Refresh history and separate
list/inspection retry feedback are provided; Publish refreshes the list automatically.
Neither inspection nor refresh changes revisions, stored content, or public visibility.


## Restore into draft

Inspect a snapshot, then choose Restore into draft. If local edits are unsaved, the inline
prompt names the version and offers Confirm restore or Cancel restore. Success loads the
snapshot's title/body/tags into the saved draft and advances revision, including identical
restores. It never publishes or changes history, live reference, first date, or counter.
Current and last-published snapshots can also be restored. Errors preserve local text;
conflicts require explicit reload/resubmission. New text typed while a restore response
is pending stays local and unsaved. Publish remains a separate deliberate action.


## Delete a historical version

Inspect an unreferenced snapshot and choose Delete version, then Confirm delete or Cancel
delete in the prompt naming its version. Success permanently removes only that snapshot,
clears inspection, and refreshes history. Draft/revision/audit times, public content,
publication reference/date, version counter, and unsaved local edits stay unchanged.
Current and retained last-published snapshots show a protection reason instead of Delete;
the API independently rejects their deletion. Deleted versions cannot be inspected or
restored, and later publication never reuses their numbers. The request needs no revision.

## Verify

Development verification requires the pinned Node/pnpm versions. The full suite and
integration command also require Docker/Compose; unit tests require no database or Docker.

```sh
pnpm test
pnpm exec nuxt typecheck
pnpm run build
```

For a focused suite:

```sh
pnpm run test:unit
pnpm run test:integration
```

The integration command builds the test target, starts only `test-db`/`test-runner` under
fixed project `northbeam-docs-studio-test`, applies the same migrations, waits for the built
production server, and runs sequential HTTP/SQL tests. Each test file uses shared process
helpers to start/await/stop its built server; restart tests reuse the same database. It uses its own network and disposable
volume, clears both application tables between cases, and preserves the schema/migration
journal. Completion, test failure, and handled interruption clean up only that test project.
Test/cleanup failures produce a nonzero result. No database installation is needed on the host.

Only one integration run can own the fixed test project at a time. The runner prints the
lock path when rejecting overlap; `owner.json` identifies its process. If a run was forcibly
killed, check that the owner is no longer active before removing a leftover lock. Never
remove another active run's lock. Normal application resources are outside test cleanup.
Reviewers are not required to execute tests.

Verified on macOS arm64 on 2026-11-07:

- 98 unit tests for title/create/save/publish validation and safe Markdown; 119 real PostgreSQL/HTTP integration tests (217 total).
- Writer slug links, direct reloads, slug `new` versus creation, and restart reopening;
  Chrome also verified existing editor actions, article-to-article navigation, and failed
  lookup Retry without runtime exceptions or hydration warnings.
- Save normalization, stale/no-op revisions, publication/snapshot preservation, transaction
  rollback/recovery, and draft persistence after restart.
- Real Chrome editor checks: unsaved preview, keyboard tabs, validation, two-tab stale saves,
  reload/cancel/resubmit, network failure, and preservation of text typed during a delayed
  save response. Responsive checks passed at 320/390/1440px without runtime/hydration errors.
- Publication copies only saved content, creates sequential per-article snapshots, preserves
  the first publication date and earlier history, and rejects blank/stale requests.
- Forced post-insert failures roll back first publish and republish. SIGKILL at an observed
  PostgreSQL lock barrier rolls back an uncommitted publication; restart recovers cleanly
  and the next publication uses the expected version number.
- Real Chrome publishing checks: dirty/blank guards, first publication, unchanged republish,
  retained date/reference, two-tab stale publish, explicit reload/resubmit, in-flight text
  retention, network failure, and responsive controls. SQL confirms live snapshot isolation.
- Public API/server-rendering checks cover the exact live-only summary, private-content
  exclusion, literal title text, links, unchanged read audits, and restart persistence.
- Real Chrome public-list checks cover chooser/portal navigation, empty/list/tag states,
  save/republish isolation, error/retry/loading, and 320/390/1440px maximum-content layouts.
- Public-detail API/server-page checks cover exact live-only fields, unavailable-state
  HTTP 404, safe shared Markdown, draft isolation, unchanged read audits, and restart.
- Real Chrome reader checks cover list/detail/back navigation, matching writer preview,
  save/republish/date behavior, friendly 404, network retry/loading, and 320/390/1440px
  long-title/code layouts. Return-link targets meet 44px; no runtime/hydration errors.
- Unpublish checks cover retained draft/history/reference/date/counter, public removal/404,
  stale-before-state rejection, invalid states, rollback/recovery, restart, and republish.
- Real Chrome Unpublish checks cover dirty/in-flight text retention, two-tab conflicts,
  reload/cancel/resubmit, public navigation, network retry, and responsive three-action layouts.
- History API checks cover exact fields, newest-number ordering, empty history, valid UUIDs,
  wrong-owner/missing targets, unchanged SQL/public state, and restart persistence.
- Real Chrome history checks cover safe read-only inspection, retained reference labels,
  unsaved/in-flight text retention, refresh/retry/loading, missing versions, and mobile layouts.
  No runtime exceptions or hydration warnings were observed.
- Restore checks cover old/current/last-published/identical copies, revision-before-target
  errors, exact draft-only changes, rollback, restart, and unchanged public/history state.
- Real Chrome Restore checks cover dirty confirmation/cancel, delayed-response text retention,
  two-tab conflicts with explicit reload/resubmit, network/missing-target feedback, Save/Publish
  afterward, and responsive controls without runtime/hydration errors.
- Delete checks cover eligible removal, empty 204, current/retained API protection, wrong-owner/
  missing targets, unchanged article/audit/public/counter state, rollback, restart, and number
  preservation on republish. Browser checks cover confirmation/cancel, dirty/in-flight text,
  protected/missing/network recovery and responsive controls without runtime/hydration errors.
- Creation normalization/defaults, malformed input, slug collisions, exact read projections,
  valid/malformed/missing UUIDs, unchanged read audits, and draft persistence after app restart.
- Unexpected database failures return generic production 500 responses.
- Real Chrome walkthrough: create/list/open/reload, field and collision feedback, failed
  submission text retention, missing drafts, Public/Writer navigation, and 320/390/1440px layouts.
  No browser runtime exceptions or hydration warnings were observed.
- Nuxt typecheck, production build, and the installed pinned toolchain.
- Fresh Docker migration/startup, production HTTP rendering, and migration idempotence.
- Migration failure prevents serving; runtime excludes the Vitest development dependency.
- Test runs start empty and preserve database protections across per-case resets.
- Intentionally failing and interrupted runs clean up; overlap is rejected without changing
  the active run or application containers. Negative probes used a disposable source copy.

Port 3000 was occupied during earlier Docker validation, so the isolated validation app used a
local-only port 3300 override. The committed mapping remains `127.0.0.1:3000:3000`.
Windows/Linux host execution remains unverified; the containers use the approved Linux images.

## Schema and migrations

`articles` stores stable metadata and the editable draft together. `article_versions`
stores immutable published snapshots. Named uniqueness constraints protect slugs and
per-article version numbers; a composite foreign key enforces ownership of the current
snapshot and restricts its deletion. A database trigger rejects all snapshot updates.
Save locks the article in a Read Committed transaction and compares the expected revision
before mutation. Publish uses the same transaction helper, inserts the snapshot, and updates
status/reference/date/counters atomically. The first publication date is preserved on
republish. Remaining lifecycle operations follow in their owning feature phases.

Generate SQL from the TypeScript schema without connecting to PostgreSQL:

```sh
pnpm exec drizzle-kit generate
```

Review generated SQL and metadata in `drizzle/` before applying it. The custom snapshot
trigger is a separate versioned migration. Runtime startup applies migrations using the
installed Drizzle Kit CLI; it does not download tools or generate schema changes.

Nuxt's Node TypeScript project includes `drizzle.config.ts` with Node types enabled, so
the editor and `pnpm exec nuxt typecheck` cover the migration configuration.

Direct dependencies are pinned and the lockfile records transitive resolution.
`pnpm-workspace.yaml` permits the required esbuild installation script. The Dockerfile
separates build/test dependencies from the production runtime, which retains migration tooling.

The current testing tradeoff is sequential cases and one disposable database per run,
keeping fixture reset and cleanup straightforward at the cost of overlapping/parallel runs.
Remaining acceptance audits, coordinated database races, and final platform
verification will be added with their owning feature phases. See the [plan](specs/001-docs-studio/plan.md),
[data model](specs/001-docs-studio/data-model.md), and [contracts](specs/001-docs-studio/contracts/http-api.md).

The approved Phase 3 [UI design](specs/001-docs-studio/ui-design.md) contains five screen
wireframes and a Deloitte-inspired black/white/green visual theme. The editor uses
Write/Preview tabs in one panel at every width,
with history planned below. A top-header Public / Writer switch links the two portals.
Switching tabs preserves local edits without saving or publishing. Phases 1–11 are approved;
Phase 12 Delete is verified and awaits human review.

For visual review, open [the offline design preview](specs/001-docs-studio/design-preview/index.html)
in a browser. It shows only the approved tabbed editor across all five screens, mobile sizing, and feedback
states using sample content; it does not run application features or write data.
