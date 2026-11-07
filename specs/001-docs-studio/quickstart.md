# Quickstart and Verification Guide

**Date**: 2026-11-07
**Status**: Planned procedures for the completed implementation. Application files,
package scripts, lockfile, Dockerfile, Compose services, and tests do not exist yet.
Commands below have not been executed as application verification during planning.

## Reviewer startup

Prerequisite: Docker Engine or Docker Desktop with a working Compose plugin and Linux
containers. The same startup line is intended for Linux shells and Windows PowerShell:

```sh
docker compose up --build
```

Open `http://localhost:3000`. The root lists published articles; writer pages begin at
`/writer/articles`. No authentication setup or mandatory `.env` copy is required.

Expected startup: build the runtime image, start PostgreSQL, wait for its TCP readiness,
apply versioned migrations with `pnpm exec drizzle-kit migrate`, then start the production
Nuxt server. Migration failure exits without serving. No separate migration service runs.

## Local configuration and storage

| Setting | Planned default |
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
through `.env.example` during implementation; keep database credentials and DATABASE_URL
consistent, URL-encoding reserved credential characters when supplying a URL. DATABASE_URL
is server-only. Reviewer startup requires Docker, not host Node or pnpm.

PostgreSQL 18 stores data beneath `/var/lib/postgresql/18/docker`; mount the parent
`/var/lib/postgresql` as documented by the [official image](https://github.com/docker-library/docs/blob/master/postgres/README.md).
Normal stop/restart retains the named application volume. Tests have a different project,
network, and disposable volume; they never reset the application database.

## Local development without Docker

This workflow runs the Nuxt UI and API directly on the host with hot reload. It requires
Node `24.22.2`, pnpm `12.18.0`, and a running PostgreSQL `18.6` instance reachable from
the host. For a completely Docker-free setup, install PostgreSQL locally and create the
development database/user first. These examples assume database/user `northbeam`, password
`northbeam_local`, and PostgreSQL listening on loopback port 5432.

After the manifest and lockfile exist, install dependencies:

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

The planned `dev` package script runs `nuxt dev --host 127.0.0.1 --port 3000`, serving
both UI and API at `http://localhost:3000`. The connection URL uses the host database
address; Compose's `db` hostname is internal to Docker. Stop any other app using port
3000 before starting. Host development does not automatically provision PostgreSQL or
apply migrations. It uses the same schema, services, and renderer as the Docker workflow.

This command is planned, not implemented or executed yet. Integration tests retain their
isolated Docker/PostgreSQL workflow; Docker-free development does not change that requirement.

Reference: [Nuxt development command](https://github.com/nuxt/cli/blob/main/docs/dev.md).

## Developer verification

Additional prerequisites: Node `24.22.2` and pnpm `12.18.0`. The implemented checkout will
contain the approved manifest and lockfile. Install its dependencies with:

```sh
pnpm install --frozen-lockfile
```

| Command | Expected coverage |
| --- | --- |
| `pnpm dev` | Host Nuxt development server; configured PostgreSQL and applied migrations required |
| `pnpm run test:unit` | Database-free validation, Markdown rendering, pure helpers |
| `pnpm run test:integration` | Automatic isolated Compose database, migrations, built HTTP server, PostgreSQL assertions |
| `pnpm test` | Both suites; nonzero result if either fails |
| `pnpm exec nuxt typecheck` | Application/Vue typechecking with the approved toolchain |
| `pnpm run build` | Production Nuxt build |

The scaffold task first establishes the manifest, lockfile, passing build, and runnable
verification entry points. These commands are not currently runnable in this documentation-only state.
After scaffolding, task completion requires the production build and existing suite;
maintain required type checks and update affected documentation.

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
4. Launch the built Nuxt server with test configuration; wait for an actual ready response.
5. Run Vitest integration cases sequentially. Reset only `articles` and `article_versions`
   together between cases, preserving schema, constraints, triggers, and migration journal.
6. Complete requests/transactions and stop the server. Attempt test-project cleanup on
   success and handled failures/interruptions; retain failure status and report cleanup failures.
7. Remove the disposable test volume and release ownership. A subsequent run starts fresh.

The runner uses Docker's explicit project option for every resource operation. Avoid fixed
global volume/container names that bypass project isolation. Keep coordination owned until
cleanup ends. Handle stale-run diagnostics without treating an active run as disposable.
Concrete code and platform behavior must be verified in the orchestration task.

Concurrency cases coordinate locks and observe distinct database connections before
releasing contenders; a pair of promises alone is not proof of overlap. A temporary
database failure can force publication rollback after snapshot insertion; remove temporary
fixture DDL before later cases. The restart case stops/restarts the built application
process with the same test database and verifies stored state through HTTP.

## Required automated evidence

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

## Acceptance coverage

SC-001 is demonstrated by the writer walkthrough; SC-002 by public visibility/isolation
checks; SC-003 by the lifecycle/rollback suite; SC-004 by coordinated revision races;
SC-005 by fresh-start and restart checks on the recorded platforms; SC-006 by the final
README review. FR-012's writer controls, preview, and conflict feedback use manual browser
verification alongside the tested HTTP operations.

## Manual walkthrough and platform record

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

## Design handoff

Review [plan.md](plan.md), [data-model.md](data-model.md), and [contracts](contracts/http-api.md).
After final design approval, generate `tasks.md` through Spec Kit. The human records the
required specification/plan/task git checkpoint before application implementation. AI
creates no commits. No application build, test, restart, or Windows/Linux support result
has been claimed by this planning guide.
