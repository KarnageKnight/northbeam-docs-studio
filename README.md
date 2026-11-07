# Northbeam Docs Studio

An article-publishing application for writing on any topic. Public readers see articles
explicitly published by writers.

Phase 2 provides the Nuxt/Vue/TypeScript shell, PostgreSQL schema and migrations,
production Docker startup, and isolated integration testing. Article lifecycle APIs and
writer/public feature screens are subsequent work in [tasks.md](specs/001-docs-studio/tasks.md).

## Run with Docker

Prerequisites: Docker Engine or Docker Desktop, the Compose plugin, Linux containers,
and a free local port 3000. From the project directory, on Linux or Windows PowerShell:

```sh
docker compose up --build
```

Open http://localhost:3000. Compose starts PostgreSQL, waits for its healthcheck, applies
versioned migrations from the app container, then starts the production Nuxt shell.
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
not reachable from the host. The current shell has no article API/database reads yet;
the shared connection module is ready for those feature tasks.

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
production server, and runs sequential HTTP/SQL tests. It uses its own network and disposable
volume, clears both application tables between cases, and preserves the schema/migration
journal. Completion, test failure, and handled interruption clean up only that test project.
Test/cleanup failures produce a nonzero result. No database installation is needed on the host.

Only one integration run can own the fixed test project at a time. The runner prints the
lock path when rejecting overlap; `owner.json` identifies its process. If a run was forcibly
killed, check that the owner is no longer active before removing a leftover lock. Never
remove another active run's lock. Normal application resources are outside test cleanup.
Reviewers are not required to execute tests.

Verified on macOS arm64 on 2026-11-07:

- 15 unit tests for title validation and 32 real PostgreSQL/HTTP integration tests.
- Nuxt typecheck, production build, and the installed pinned toolchain.
- Fresh Docker migration/startup, production HTTP rendering, and migration idempotence.
- Migration failure prevents serving; runtime excludes the Vitest development dependency.
- Test runs start empty and preserve database protections across per-case resets.
- Intentionally failing and interrupted runs clean up; overlap is rejected without changing
  the active run or application containers. Negative probes used a disposable source copy.

Port 3000 was occupied during Docker validation, so the isolated validation app used a
local-only port 3300 override. The committed mapping remains `127.0.0.1:3000:3000`.
Windows/Linux host execution remains unverified; the containers use the approved Linux images.

## Schema and migrations

`articles` stores stable metadata and the editable draft together. `article_versions`
stores immutable published snapshots. Named uniqueness constraints protect slugs and
per-article version numbers; a composite foreign key enforces ownership of the current
snapshot and restricts its deletion. A database trigger rejects all snapshot updates.
Publication-state consistency, counter ranges, revision checks, and lifecycle transactions
remain application responsibilities for subsequent feature phases.

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
Lifecycle tests, coordinated races, complete writer/public screens, and final platform
verification will be added with their owning feature phases. See the [plan](specs/001-docs-studio/plan.md),
[data model](specs/001-docs-studio/data-model.md), and [contracts](specs/001-docs-studio/contracts/http-api.md).

The approved Phase 3 [UI design](specs/001-docs-studio/ui-design.md) contains five screen
wireframes and a Deloitte-inspired black/white/green visual theme. The editor uses
Write/Preview tabs in one panel at every width,
with history below. A top-header Public / Writer switch links the two portals. Switching tabs preserves local edits without saving or publishing. Phases 1–3 are approved; feature-screen implementation is next.

For visual review, open [the offline design preview](specs/001-docs-studio/design-preview/index.html)
in a browser. It shows the tabbed editor and earlier alternatives across all five screens, mobile sizing, and feedback
states using sample content; it does not run application features or write data.
