# Northbeam Docs Studio

A Nuxt/Vue article-publishing application backed by PostgreSQL. Writers edit drafts,
publish immutable snapshots, inspect history, restore content, and delete eligible versions.
Public readers see only explicitly published content.

Integrated acceptance, Linux-client Docker startup/persistence, macOS host development,
and the final verification audit are recorded in the [verification guide](specs/001-docs-studio/quickstart.md).
**Windows acceptance remains unverified (T028).** Final delivery review is prepared;
see the [delivery review](specs/001-docs-studio/quickstart.md#phase-18-delivery-rehearsal-and-history-review--november-8-2026). Final review was approved on November 8, 2026; commits and submission remain human-owned.

## Planned idempotent publishing (003)

The approved [003 plan](specs/003-idempotent-publish/plan.md) is not implemented or verified.
Current Publish still creates a snapshot every time. The planned reviewer demo will publish
once, repeat unchanged Publish with no new version or persisted changes, save changed content
and publish one new version, then unpublish/republish unchanged content using the retained
version. Exact title/body and normalized tag membership define equality; tag order is ignored.
The existing WriterArticle response stays unchanged; the editor will distinguish all three
outcomes. See [planned validation](specs/003-idempotent-publish/quickstart.md). Windows T028
remains unverified; the human-approved deferral now includes 003.

## Run with Docker

Prerequisites: Docker Engine or Docker Desktop, the Compose plugin, Linux containers,
and a free local port 3000. From the project directory:

```sh
docker compose up --build
```

This is the documented command for Linux shells and Windows PowerShell. Linux-client
execution is verified; Windows execution remains open. Open http://localhost:3000 and
choose Public or Writer. You can switch portals using the header.

Compose builds the production app, starts PostgreSQL, waits for database readiness,
applies migrations, then serves Nuxt. Migration failure prevents serving. No host Node,
pnpm, or mandatory `.env` step is needed. Defaults are database/user `northbeam` and
local password `northbeam_local`. Optional overrides are listed in [.env.example](.env.example).
`APP_DATABASE_URL` overrides the Docker app connection; URL-encode reserved credential characters.

The app binds to `127.0.0.1:3000`; PostgreSQL has no published host port. The app reaches
`db:5432` on the Compose network. The project-scoped `postgres_data` volume is mounted at
`/var/lib/postgresql`, the parent of PostgreSQL 18's data directory.

```sh
docker compose down
```

Normal stop/start and `down` retain the database volume. Adding `--volumes` deletes its data.
To inspect the default database:

```sh
docker compose exec db psql -U northbeam -d northbeam
```

Use your configured database/user if overridden.

## Develop without Docker

Prerequisites: Node **24.22.2**, pnpm **12.18.0**, and host-accessible PostgreSQL **18.6**
with a development database/user. Install locked dependencies:

```sh
pnpm install --frozen-lockfile
```

Set the connection URL in the same terminal. Linux/POSIX shell:

```sh
export DATABASE_URL='postgresql://northbeam:northbeam_local@127.0.0.1:5432/northbeam'
```

Windows PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://northbeam:northbeam_local@127.0.0.1:5432/northbeam'
```

Use your actual host, port, credentials, and database. Compose's private `db` hostname is
not reachable from the host. Apply migrations before the first start and after adding migrations:

```sh
pnpm exec drizzle-kit migrate
pnpm dev
```

Nuxt serves UI/API at http://localhost:3000 with hot reload and loopback binding.
This workflow was verified on macOS arm64 with local PostgreSQL 18.6, including Unicode
content, browser HMR without reload, and persistence after dev-server restart.
The PowerShell example is documented but has not been executed on Windows.

## Review the application

1. Choose Writer, then New article. Supply a title and permanent slug; body/tags start empty.
2. Edit title, Markdown body, and comma-separated tags. Write/Preview tabs preserve local
   content without saving. Slugs normalize on creation and cannot subsequently change.
3. Save the draft, then Publish. Publishing requires a saved, nonblank title/body; dirty
   local content must be explicitly saved first. Each publication creates a new version.
4. Choose Public to inspect the list and published article. Save different draft content;
   the public view stays unchanged until another explicit Publish.
5. Inspect history. Restore copies a snapshot into the draft without publishing or changing
   history. Unsaved edits require confirmation; Cancel preserves them.
6. Delete an unreferenced historical snapshot using its version-specific confirmation.
   The current/last-published reference remains protected, including after Unpublish.
   Deleted version numbers are never reused. The retained-reference policy is documented
   in the [assumptions register](specs/001-docs-studio/assumptions.md).
7. Unpublish to remove public access while retaining history/reference/date and local edits.
   Republish to make the saved draft public again; the first publication date stays fixed.
8. Open the same editor in two tabs. Save in one, then attempt a revision-checked action
   in the older tab. The stale action fails visibly and retains local text. Reload saved
   article offers Cancel/Confirm; explicitly resubmit after reloading.

Writer editors use `/writer/articles/:slug/edit`; creation stays at `/writer/articles/new`,
so slug `new` is valid at `/writer/articles/new/edit`. Public detail uses `/articles/:slug`.
Internal lifecycle/history APIs retain UUIDs resolved by the writer-only slug lookup.
Unknown/draft-only/unpublished public articles return 404. Writer lookups can load every state.
The root chooser appears on fresh root visits, retains its choice during client navigation,
and leaves deep links uninterrupted; Escape chooses Public.

There is one shared trusted writer workspace, with no authentication or user identities.
Multiple tabs or trusted people can write concurrently; revision checks reject stale changes.

### Compare a saved draft with a version

After publishing a version, edit and explicitly Save the draft. In Version history, choose
**Compare versions**, select the baseline version, then **Compare**. The read-only panel
shows title and Markdown source in one continuous diff, with line numbers, changed words,
original newline labels, and tag membership changes. Current and last-published snapshots
remain eligible after Unpublish. Identical sources explicitly show “No differences”.

Unsaved edits, pending writes, or conflicts block a new draft comparison. Comparison never
saves or reloads automatically. Later typing preserves the displayed saved-revision capture;
Save and **Refresh comparison** to include it. Cancel, Close, and source changes preserve
editor input. Version sources are fetched afresh, so a deleted source fails without substitution.
To compare history without saving unrelated edits, choose **Two versions**, select the
baseline and target, then **Compare**. Any retained pair is allowed, including the same
version. **Reverse** swaps roles and starts a fresh comparison. Historical comparison
preserves unsaved or conflicted draft fields; an active lifecycle write must finish first.
Deleting a selected snapshot in another tab is recognized on the next comparison attempt.

The engine runs in a cancellable browser Worker. The complete article appends automatically
in rendering batches, with no pagination, collapsed context, or truncation. A real tradeoff:
the tested 100,000-row output took about 40–50 seconds to finish rendering on the recorded
M2 Pro/Chrome environment; Cancel and Close remained usable during rendering. These are
observations, not latency guarantees. Further DOM optimization could reduce this cost while
preserving the full single-scroll design. The [validation guide](specs/002-version-diff/quickstart.md)
records all nine maximum-size browser fixtures in both historical directions, source identities, actual timings, and
coverage limits. Both modes passed keyboard-only acceptance using Tab, Enter, and native
collapsed-select typeahead followed by Tab in Chrome 157 on macOS. Other browsers and
Windows remain unverified; this is not formal accessibility certification. Final validation
passed 315 tests, Nuxt typecheck and build, development/production Worker checks, and
Compose app/database restart persistence.

## Verify during development

Reviewers are not required to run tests. Developers use the pinned Node/pnpm toolchain;
full/integration tests also require Docker/Compose:

```sh
pnpm test
pnpm exec nuxt typecheck
pnpm run build
```

Focused suites:

```sh
pnpm run test:unit
pnpm run test:integration
```

Unit tests need neither PostgreSQL nor Docker. The integration runner builds the production
test target, starts an isolated PostgreSQL database, applies the same migrations, and runs
sequential HTTP/SQL cases. It resets application rows between cases while preserving the
schema/journal and removes only its own containers/network/volume afterward. Failures and
handled interruptions retain a nonzero exit status.

Only one integration run owns fixed project `northbeam-docs-studio-test` at a time. The
runner rejects overlap before resource mutation and prints its lock path; `owner.json`
identifies the owner. Remove a stale lock only after confirming that owner is no longer
active. Normal application data is outside test cleanup.

Latest verification, **November 8, 2026**:

- **242 passing tests:** 99 unit and 143 real PostgreSQL/HTTP integration cases; no skips.
- Production build, Nuxt typecheck, and strict test-source typecheck pass.
- Lifecycle checks cover isolation, immutable snapshots, first dates, restoration, protected
  deletion, stale requests, rollback/crash recovery, restart persistence, and generic errors.
- Observed lock waits on independent connections verify competing writes, both delete-race
  orders, and normalized duplicate creates. Rejections preserve complete SQL/public state.
- Chrome acceptance covers the full writer/public journey, two-tab recovery, safe preview,
  and responsive controls, without runtime exceptions or hydration warnings.
- Clean-copy Linux CLI startup verifies private DB/loopback app, migration ordering and
  failure, idempotence, full named-volume restart persistence, and recovery.
- Docker-free macOS development verifies locked install, local PostgreSQL 18.6, HMR, and restart.

The Linux CLI ran in a Linux arm64 container using Docker Desktop's Linux daemon on macOS;
a standalone native Linux host was not separately exercised. Windows startup, test cleanup,
and persistence remain open under T028. See the [FR/SC evidence map and platform results](specs/001-docs-studio/quickstart.md)
for exact scope and remaining checks.

## Design and tradeoffs

The application is one Nuxt monolith: native server handlers validate requests, small
lifecycle service functions perform transactions, and Vue components/composables manage
local editor state. TypeScript, Drizzle's SQL-oriented API, and PostgreSQL are used throughout.

| Table | Responsibility |
| --- | --- |
| `articles` | UUID/unique immutable slug, editable draft, status, revision, allocation counter, current snapshot reference, first publication date, and audit timestamps |
| `article_versions` | Owned immutable title/body/tags snapshots with per-article version numbers and creation time |

A relational model fits owned versions, a current reference, foreign keys, unique numbers,
and atomic multi-row publication. Public reads join only a published article to its owned
current snapshot, so draft fields do not enter public responses. A trigger rejects snapshot
updates; restrictive ownership/reference constraints protect current snapshots.

Save/Publish/Unpublish/Restore start a Read Committed transaction, lock the article, compare
`expectedRevision`, then act and commit. Stale requests return 409 before operation eligibility.
Publish inserts a snapshot and updates reference/state/counters/date/revision atomically;
failures roll back. Delete follows the same article-first lock order, checks ownership and
reference eligibility, and changes no article revision/audit fields.

Markdown uses one shared renderer for local preview, history, and public content. Raw HTML
is escaped. Links allow HTTP/HTTPS, mailto, relative paths, and heading fragments; unsupported
schemes and protocol-relative destinations are rejected.

Actual scope tradeoffs: article metadata and draft content share one row to reduce joins and
coordination within the take-home budget. They could be separated if independent workflows
later require it. Native per-editor Vue/Nuxt state avoids a store dependency; Pinia can be
introduced if shared state grows. Tests run sequentially against one disposable database
for straightforward reset/cleanup; future CI parallelism would need isolated project names.
Authentication, roles/tenancy, autosave, rich editing/uploads, search/pagination, production
hosting, and CI/CD are outside the required scope.

Schema changes use reviewed migrations:

```sh
pnpm exec drizzle-kit generate
```

Generation does not connect to PostgreSQL. Review SQL/metadata before applying it. Runtime
startup applies migrations rather than generating them. Direct dependencies and transitive
resolution are pinned in the manifest/lockfile.

The [specification](specs/001-docs-studio/spec.md), [plan](specs/001-docs-studio/plan.md),
[data model](specs/001-docs-studio/data-model.md), [contracts](specs/001-docs-studio/contracts/http-api.md),
and [verification guide](specs/001-docs-studio/quickstart.md) record the decisions and evidence.
The [user decision inventory](specs/001-docs-studio/decision-inventory.md) groups all recorded
product/architecture selections and distinguishes agreed non-functional requirements from
unspecified load, availability, performance, and recovery targets.
For the approved sample-only visual preview, open
[design-preview/index.html](specs/001-docs-studio/design-preview/index.html).


## Delivery review

The [delivery review record](specs/001-docs-studio/quickstart.md#phase-18-delivery-rehearsal-and-history-review--november-8-2026)
is the authoritative record of the November 8 approval, history checkpoints, archive scope,
and platform limitations. Windows acceptance remains unverified; commits, merges, and
submission are human-owned. The historical review ZIP must be regenerated after changes.
