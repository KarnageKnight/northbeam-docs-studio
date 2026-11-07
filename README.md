# Northbeam Docs Studio

An article-publishing application for writing on any topic. Public readers see articles
explicitly published by writers.

Phase 6 adds explicit publication of saved articles and immutable numbered snapshots to
the writer editor. Phases 1–5 are approved; Phase 6 is implemented and awaits human review.
Unpublish, history actions, and public article lists/details remain in later phases of
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
live snapshot until the next explicit Publish. Unpublish and history controls arrive later.
The **Public** choice opens an Articles placeholder; the real public list remains in
Phase 7. The chooser appears on fresh root-page visits, keeps the choice during client
navigation, and leaves direct writer links uninterrupted. Escape dismisses to Public.
There is no separate “Open writer workspace” landing page or persistent role selection.

Current API: `POST /api/writer/articles`, `GET /api/writer/articles`, and
`GET /api/writer/articles/:articleId`, `PUT /api/writer/articles/:articleId/draft`, and
`POST /api/writer/articles/:articleId/publish`.
A save requires complete `title`, `body`, `tags`, and `expectedRevision`; it returns the
updated WriterArticle. Publish accepts only `expectedRevision` and also returns WriterArticle.
See the [HTTP contract](specs/001-docs-studio/contracts/http-api.md).

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

- 98 unit tests for title/create/save/publish validation and safe Markdown; 93 real PostgreSQL/HTTP integration tests.
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
Remaining lifecycle tests, coordinated database races, history/public screens, and final platform
verification will be added with their owning feature phases. See the [plan](specs/001-docs-studio/plan.md),
[data model](specs/001-docs-studio/data-model.md), and [contracts](specs/001-docs-studio/contracts/http-api.md).

The approved Phase 3 [UI design](specs/001-docs-studio/ui-design.md) contains five screen
wireframes and a Deloitte-inspired black/white/green visual theme. The editor uses
Write/Preview tabs in one panel at every width,
with history planned below. A top-header Public / Writer switch links the two portals.
Switching tabs preserves local edits without saving or publishing. Phases 1–5 are approved;
Phase 6 publication is verified and awaits human review.

For visual review, open [the offline design preview](specs/001-docs-studio/design-preview/index.html)
in a browser. It shows only the approved tabbed editor across all five screens, mobile sizing, and feedback
states using sample content; it does not run application features or write data.
