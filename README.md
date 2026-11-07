# Northbeam Docs Studio

The current implementation is the Phase 1 Nuxt application shell, title-validation
unit suite, and persistent Docker PostgreSQL service. Article APIs, writer/public screens,
migrations, and integration tests are planned in [tasks.md](specs/001-docs-studio/tasks.md).

## Local development

Use Node **24.22.2** and pnpm **12.18.0**. From the project directory:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. The command runs the UI/server shell on loopback with hot reload.
The current shell has no database connection. Database configuration and migrations will
be required when persistence is implemented in Phase 2.

Direct dependencies use the approved exact versions; `pnpm-lock.yaml` records transitive
resolution. `pnpm-workspace.yaml` permits the required esbuild installation script.
Additional approved packages will be installed with their first implementation task.

## Development PostgreSQL

With Docker Desktop or Docker Engine and Compose available, start the database:

```sh
docker compose up -d --wait db
```

Defaults are database/user `northbeam` and password `northbeam_local`. No `.env` copy is
required; `.env.example` documents optional overrides. PostgreSQL has no published host
port and is reachable as `db:5432` within Compose. Host `pnpm dev` currently serves only
the shell and does not connect to this database.

The project-scoped `postgres_data` volume is mounted at `/var/lib/postgresql` for
PostgreSQL 18. Normal `docker compose stop`/`docker compose start` or `docker compose down`
retains the data volume. To open a database terminal with the default credentials:

```sh
docker compose exec db psql -U northbeam -d northbeam
```

Use your configured user/database if overridden. The complete one-line deployment
`docker compose up --build`, including app image and automatic migrations, is planned
for T004; the current Compose file contains only the database service.

## Verification

```sh
pnpm test
pnpm exec nuxt typecheck
pnpm run build
```

`pnpm test` currently runs the database-free unit suite; `pnpm run test:unit` runs the
same suite explicitly. Title tests cover blank/type rejection, text preservation, and
200-code-point limits including non-BMP characters. PostgreSQL integration testing will
be added in T005, when `pnpm test` will run both suites. There is no passing integration
placeholder. Reviewers are not required to run tests.

Verified on macOS arm64 on 2026-11-07 with the pinned toolchain: frozen install, all 15
unit cases, typecheck, production build, rendered development HTTP response, compiled
Tailwind CSS, Compose configuration/readiness, and PostgreSQL data surviving restart.
The disposable probe was removed. Windows/Linux host execution is not yet verified.

## Design and delivery

The [plan](specs/001-docs-studio/plan.md), [data model](specs/001-docs-studio/data-model.md),
and [contracts](specs/001-docs-studio/contracts/http-api.md) describe the approved final
design, rather than features already implemented. Development proceeds one feature at a
time, with human approval between phases. The final README will document the implemented
lifecycle, complete startup procedure, actual tradeoffs, and platform verification.
