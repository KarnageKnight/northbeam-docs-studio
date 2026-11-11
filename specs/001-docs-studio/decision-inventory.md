# User decisions and assumptions: final application inventory

> **003 amendment — approved 2026-11-10, implemented/verified 2026-11-11:**
> The [003 spec](../003-idempotent-publish/spec.md) and constitution 3.0.0 supersede unconditional
> snapshot creation/revision advancement with create, no-op, and reactivation outcomes.
> Original implementation descriptions and dated evidence below remain historical, not 003
> verification. Current 003 verification is in its quickstart; [003 tasks](../003-idempotent-publish/tasks.md) track the new work. Windows T028 remains
> unchecked and unverified; its approved deferral now includes 003.

Reviewed November 8, 2026 against the project documentation and implemented application source.
This is an inventory of existing decisions; it does not approve new requirements or architecture.

The records identify **17 product assumptions/interpretations (A001–A017)** and
**77 approved architecture selections (P001–P077)**. A011 is approved only as a deferred
stretch candidate. Additional product, visual, and delivery decisions appear outside those
numbered registers and are included below.

“Approved” here means the repository explicitly records your approval or selection. Some
features originated in the assignment and were approved by you as requirements; that does
not establish that you personally invented them. P069 explicitly delegates the remaining
package-version recommendations. Source code establishes what is implemented, rather than
who originally selected a behavior.

**Principal NFR finding:** you explicitly set aside further NFR discussion. The plan adopts
no numerical user-load, throughput, latency, uptime, or recovery targets. The trusted-writer
scope and concurrency rules below must not be interpreted as a measured capacity guarantee.
See [the planning summary and technical context](plan.md#technical-context).

## Product scope and approved required behavior

These are the approved baseline requirements, including requirements inherited from the
assignment. Sources: [specification](spec.md), [constitution](../../.specify/memory/constitution.md),
and [final README](../../README.md).

| Area | Approved scope or behavior |
| --- | --- |
| Product purpose | Writers publish articles on any topic. Public wording and sample content are generic articles; retain the Northbeam Docs Studio name. |
| Actors | One trusted internal writer is the intended scope, with anonymous public readers. The implementation provides one shared workspace with no user identities; the scope is not an enforced one-person connection limit. |
| Writer features | Create/list/open articles; edit and explicitly save drafts; preview Markdown; publish/unpublish; list/inspect/restore/delete eligible snapshots. FR-001–FR-008, FR-011–FR-012. |
| Reader features | Anonymous published-article list and slug-based article detail with live title, tags, original publication date, and rendered body. FR-009–FR-010. |
| Draft/live separation | Each article has one editable draft and zero or more retained snapshots. Saving or restoring a draft never changes public content. Public fields come only from the current owned snapshot of a published article. |
| Publication | Explicit Publish copies saved content into a new immutable snapshot and atomically updates publication state, reference, version counter, revision, and the first publication date when initially absent. Failure rolls back the complete transaction. |
| First publication date | Set once on first publication; preserve through republishing and unpublishing. |
| Unpublish | Remove public listing/detail access while retaining draft, snapshots, last reference, and original date. Unknown, draft-only, and unpublished public articles return 404 without draft content. |
| History and restore | Inspect immutable content; restore copies an owned snapshot into the draft without publishing or changing history. History is ordered by descending version number. |
| Deletion | Delete an eligible historical snapshot only; retain current/last-referenced snapshot protection and never reuse deleted version numbers. The required feature set has no article-deletion operation. |
| Conflict behavior | An outdated save/restore/publish/unpublish fails visibly without mutation. Preserve unsaved browser text and require explicit reload/resubmission. Competing revision-checked writes using the same starting revision yield at most one success. |
| Local delivery | One-command Compose startup, persistent PostgreSQL, developer-owned automated verification, and reviewer documentation. FR-013–FR-014. |
| Completion criteria | UI supports required actions; no draft leakage; lifecycle invariants and rollback pass; conflicts prevent silent overwrites; startup/persistence and documentation are verified with actual platform gaps disclosed. SC-001–SC-006. |

## Product assumptions you resolved

Source and individual approval history: [assumptions register](assumptions.md#product-assumptions)
and [specification clarifications](spec.md#clarifications).

| ID | Your recorded decision | Current status |
| --- | --- | --- |
| A001 | Protect the retained last-published snapshot from deletion even after Unpublish. | Implemented |
| A002 | Slugs are unique across drafts, published articles, and unpublished articles after normalization. | Implemented |
| A003 | A slug cannot change after creation. | Implemented |
| A004 | Reject slug collisions clearly; do not generate suffixes automatically. | Implemented |
| A005 | Require an explicit successful Save before publishing local edits; Save, Publish, and Unpublish remain separate. | Implemented |
| A006 | Every successful Publish creates a new snapshot, including unchanged content. | Original baseline implemented; superseded for 003 by the approved amendment, implemented and verified on 2026-11-11 |
| A007 | Drafts require a nonblank title and slug; body can be empty and tags absent. Publish also requires a nonblank body. Whitespace alone is blank. | Implemented |
| A008 | Trim/lowercase slugs; accept 1–100 characters of lowercase ASCII letters/digits with single hyphens between groups. Reject other formats without further rewriting. | Implemented |
| A009 | Reject Unpublish for never-published or already-unpublished articles, without changes; stale-revision conflicts still apply first for well-formed requests. | Implemented |
| A010 | Render standard Markdown; display raw HTML literally. Permit HTTP, HTTPS, mailto, relative-path, and fragment links only. | Implemented; protocol-relative links are also rejected |
| A011 | Consider attribute-free b/strong/i/em/br/code raw HTML as an optional later extension. | Deferred; not implemented or authorized as required functionality |
| A012 | Restore any retained snapshot owned by the article, including its current/last-published snapshot. Identical content is also allowed; public state and history stay unchanged. | Implemented |
| A013 | Reject missing or wrong-article restore/delete targets without changes. | Implemented |
| A014 | Limit titles to 200 and Markdown bodies to 100,000 Unicode code points, including spaces and Markdown syntax; reject rather than truncate. | Implemented |
| A015 | Trim/lowercase tags, discard empty results, deduplicate, and preserve first-occurrence order. | Implemented |
| A016 | After normalization, allow at most 10 tags of at most 30 Unicode code points each; reject excess values without truncation or silently dropping extra tags. | Implemented |
| A017 | Normalized tags use lowercase ASCII letters/digits and single separating hyphens; reject invalid characters and internal spaces. | Implemented |

Implementation checked: [validation](../../server/validation/articles.ts),
[lifecycle services](../../server/services/articles/withArticleTransaction.ts),
[snapshot deletion](../../server/services/articles/deleteSnapshot.ts),
[Markdown renderer](../../shared/utils/markdown.ts), and
[editor state/actions](../../app/composables/useArticleEditor.ts).

## Architecture selections you approved

Every P001–P077 entry is included once below. The [original register](assumptions.md#architecture-proposals-and-decisions)
records the selection and rationale; the [plan](plan.md) records alternatives and details.
The following tables summarize the selected outcome, not the rejected alternatives.

### Application boundary and implementation structure

| ID | Your recorded selection |
| --- | --- |
| P001 | TypeScript for the application. |
| P002 | One Nuxt monolith serves Vue UI and API; PostgreSQL is a separate Compose service. Thin HTTP handlers delegate business rules and transactions to shared lifecycle functions. |
| P003 | Drizzle ORM with the pg driver and Drizzle Kit migrations. |
| P011 | markdown-it with one shared configuration for preview and public rendering. |
| P012 | Zod runtime request validation with input types inferred from its schemas. |
| P043 | One ordinary function/file per lifecycle operation under server/services/articles; no classes or repository layer. |
| P044 | Shared transaction helper for Save/Publish/Unpublish/Restore, owning lock/revision/commit/rollback coordination. Creation and deletion retain their separate workflows. |
| P045 | Import a shared Drizzle database instance backed by a reusable connection pool; configure its private DATABASE_URL before initialization. |
| P046 | Define both related tables together in server/db/schema.ts; keep the shared client separate and the immutability trigger in SQL migrations. |
| P047 | Keep common article field rules and request schemas together in server/validation/articles.ts. |
| P048 | Per-editor local Vue reactive state and native Nuxt fetching. Keep editable content separate from saved/fetched state; omit Pinia for this scope. |
| P049 | Tailwind CSS for the writer/public UI; no selected component library. |
| P050 | Default Nuxt universal rendering: initial server HTML, browser hydration, and client navigation. |
| P051 | Reuse MarkdownContent.vue and the shared renderer for preview/public bodies; history inspection uses the same rendering boundary. |
| P070 | Official Tailwind Vite plugin through Nuxt configuration and one global CSS import. |
| P071 | Keep editor state and API actions in useArticleEditor(), local to each invocation. |
| P072 | Separate ArticleEditorForm.vue and ArticleHistory.vue presentation, connected by the editor page/composable. |
| P073 | Dedicated creation page from the writer list; collect title/slug, default body/tags empty, then open the created article's editor. |
| P074 | Routes: / for public list; /articles/:slug for public detail; /writer/articles for writer list; /writer/articles/new for creation; /writer/articles/:slug/edit for editor/history. Keep UUIDs internally. |

Checked against [Nuxt configuration](../../nuxt.config.ts), [app shell](../../app/app.vue),
[editor composable](../../app/composables/useArticleEditor.ts),
[form](../../app/components/ArticleEditorForm.vue),
[history](../../app/components/ArticleHistory.vue), and
[internal boundary contract](contracts/ui-and-services.md).

### Data model, integrity, and concurrent writes

| ID | Your recorded selection |
| --- | --- |
| P006 | Two tables: articles combines stable metadata and editable draft; article_versions stores immutable snapshots. Accept this simpler model instead of separate metadata/draft tables. |
| P007 | Lifecycle transactions lock the article row first. Save/Restore/Publish/Unpublish check expected revision before operation rules; deletion uses the same article-first lock order and checks eligibility transactionally. |
| P008 | Return revision in writer JSON; require expectedRevision on Save/Restore/Publish/Unpublish; reject stale callers with 409 and no mutation. Revision begins at 0 and advances on every successful action, including unchanged saves/restores.  **003 amendment (implemented; [final acceptance](../003-idempotent-publish/quickstart.md#final-acceptance--2026-11-11)):** unchanged published Publish preserves revision/updatedAt; reactivation advances both once. Unchanged Save/Restore still advance them. |
| P009 | Allocate per-article snapshot numbers from a counter starting at 1 inside the locked Publish transaction. Roll back failed allocation and never reset/decrement it after deletion. |
| P010 | Composite foreign key enforces that the referenced snapshot belongs to the article; supporting composite uniqueness and ON DELETE RESTRICT protect the reference, including after Unpublish. |
| P013 | PostgreSQL Read Committed isolation plus explicit article-row locks and expected-revision checks. |
| P014 | PostgreSQL UUID primary keys and matching foreign keys for articles/snapshots. |
| P015 | Generate IDs on the Nuxt server before insertion. |
| P016 | UUIDv4 through Node crypto.randomUUID(); no UUID library or timestamp-based IDs. |
| P017 | Store ordered draft/snapshot tags as native PostgreSQL text arrays; no separate tag table or JSON model. |
| P022 | Database BEFORE UPDATE trigger rejects all existing snapshot-row updates; inserts and eligible deletion remain allowed. Separate runtime/migration DB roles are future work. |
| P023 | Text status with a database CHECK allowing draft, published, unpublished. |
| P034 | PostgreSQL integer for revisions, next-version counters, and snapshot numbers; UUID IDs stay distinct. |
| P035 | Store publication timestamps as timestamptz; API returns ISO 8601 UTC. Do not retain the original input timezone. |
| P036 | Set first publishedAt using PostgreSQL CURRENT_TIMESTAMP in the publication transaction; preserve it afterward. |
| P037 | Enforce publication status/reference/date consistency in lifecycle application logic, without an additional cross-field database CHECK. |
| P038 | Store slugs/titles/bodies as PostgreSQL text; enforce approved lengths in Zod rather than bounded varchar columns. |
| P039 | Article database defaults: draft status, revision 0, next version 1, empty draft body/tags. Publication date/reference initially null. |
| P040 | All planned columns NOT NULL except article publication date/reference; canonical empty body/tags are empty string/array. |
| P041 | Database UNIQUE(article_id, version_number), alongside transactional allocation. |
| P042 | Application logic enforces nonnegative revisions and positive version/counter values; omit additional database range CHECKs. |
| P075 | Adopt the consolidated schema with article created_at/updated_at and snapshot created_at, using database transaction time. Successful article writes update updated_at; reads, failed writes, and snapshot deletion do not. Audit fields stay internal.  **003 amendment (implemented; [final acceptance](../003-idempotent-publish/quickstart.md#final-acceptance--2026-11-11)):** unchanged published Publish preserves revision/updatedAt; reactivation advances both once. Unchanged Save/Restore still advance them. |

Checked against [schema](../../server/db/schema.ts), [initial SQL](../../drizzle/0000_initial.sql),
[immutability migration](../../drizzle/0001_snapshot-immutability.sql),
[transaction helper](../../server/services/articles/withArticleTransaction.ts),
[Publish](../../server/services/articles/publishArticle.ts),
[Restore](../../server/services/articles/restoreDraft.ts), and
[data model](data-model.md).

### API contracts and failure behavior

| ID | Your recorded selection |
| --- | --- |
| P024 | JSON HTTP API using native Nuxt handlers with GET/POST/PUT/DELETE, Zod validation, and lifecycle functions. |
| P025 | Separate writer/public namespaces. Writer lifecycle/history use UUIDs; an added writer-only slug lookup supports the approved editor URLs. Public detail uses a stable slug. |
| P026 | Native Nuxt error responses with stable application codes and optional validation details; no custom response envelope or global error renderer. |
| P027 | 200 for reads/save/publish/unpublish/restore; 201 create; 204 delete; 400 invalid input; 404 missing/unavailable resource; 409 stale/state/slug/protected-delete conflict; generic 500 for unexpected failure. |
| P028 | Create requires title/slug with optional body/tags. Save supplies complete title/body/tags plus expectedRevision. Publish/Unpublish/Restore send expectedRevision only. Delete has no body. Snapshot IDs come from URLs; slug is creation-only. |
| P029 | Return the direct WriterArticle object after create/load/save/publish/unpublish/restore. Start revision at 0; advance on successful revision-checked writes. Publication fields start null and remain after Unpublish. Dates are ISO UTC; delete returns no body.  **003 amendment (implemented; [final acceptance](../003-idempotent-publish/quickstart.md#final-acceptance--2026-11-11)):** unchanged published Publish preserves revision/updatedAt; reactivation advances both once. Unchanged Save/Restore still advance them. |
| P030 | Minimal direct writer-summary, snapshot-list/detail, public-list/detail shapes; empty arrays for empty collections. Writer titles come from drafts; public content comes only from live snapshots. History newest-number first; public body remains Markdown source for the shared renderer. |
| P031 | Seven stable codes: VALIDATION_ERROR, ARTICLE_NOT_FOUND, SNAPSHOT_NOT_FOUND, STALE_REVISION, SLUG_CONFLICT, SNAPSHOT_PROTECTED, INVALID_PUBLICATION_STATE. Optional fieldErrors maps fields to message arrays; unexpected errors stay generic. |
| P032 | Explicit null and omission both default optional creation body/tags to empty string/array. This does not make Save fields nullable. |
| P033 | Strict JSON types without coercion; reject extra fields. expectedRevision must be a nonnegative safe integer. Malformed writer UUIDs return 400; syntactically valid missing IDs return 404. Preserve normalization and Unicode limits. |

Checked against [HTTP contract](contracts/http-api.md),
[shared representations](../../shared/types/articles.ts),
[query projections](../../server/services/articles/queries.ts),
[writer response mapper](../../server/services/articles/toWriterArticle.ts),
[validation](../../server/validation/articles.ts), and
[error mapping](../../server/utils/api-errors.ts).

### Runtime, dependencies, local startup, and development

| ID | Your recorded selection |
| --- | --- |
| P005 | Docker Compose for application and PostgreSQL, persistent application DB volume, same Linux/Windows startup command: docker compose up --build. |
| P021 | pnpm, pnpm-lock.yaml, and package scripts for dependencies/tests. |
| P052 | Node.js 24 LTS development/runtime baseline. |
| P053 | PostgreSQL 18 baseline for both application and integration databases. |
| P054 | Two normal Compose services. Wait for PostgreSQL health, apply pending migrations in the app entry point, and serve Nuxt only after migration success. |
| P058 | Apply committed SQL migrations through pnpm exec drizzle-kit migrate at application/test startup. Keep Drizzle Kit/pnpm/configuration/migrations in runtime; SQL generation remains a development step. |
| P059 | Official Node Debian slim images for Node-based stages, accepting the image-size tradeoff for dependency compatibility. |
| P060 | Multi-stage Docker build separates build/test tooling from final runtime while retaining runtime migration tooling/assets. |
| P061 | Exact direct dependency pins, retained transitive lockfile, frozen-lockfile Docker installs, and reviewed version updates. |
| P062 | Pin Nuxt to 4.6.4. |
| P063 | Pin Node to 24.22.2 and node:24.22.2-bookworm-slim. |
| P064 | Pin PostgreSQL to 18.6 and postgres:18.6-bookworm for app and tests. |
| P065 | Pin pnpm to 12.18.0 for host/container workflows. |
| P066 | Provision container pnpm with npm install --global pnpm@12.18.0 during image construction. |
| P067 | Pin Vue to 3.5.45. |
| P068 | Separate Nuxt typecheck using pnpm exec nuxt typecheck, TypeScript 6.0.3, and vue-tsc 3.3.14. |
| P069 | You delegated remaining recommended package-version selections and approved the dependency matrix, including Vitest 5.0.5 and Vite 8.3.5. Full direct pins are listed below. |
| P076 | Adopt working local defaults and optional .env; loopback app access/internal DB; persistent app storage; isolated disposable tests; defined runner ownership/cleanup; HTTP/SQL integration and manual UI verification. |
| P077 | Also support Docker-free host pnpm dev for the Nuxt UI/API with HMR and a host-accessible PostgreSQL instance. Developer supplies the pinned toolchain/database, installs locked dependencies, and applies migrations first. |

Checked against [package manifest](../../package.json), [lockfile](../../pnpm-lock.yaml),
[Dockerfile](../../Dockerfile), [Compose](../../compose.yaml),
[environment examples](../../.env.example), [migration configuration](../../drizzle.config.ts),
and [runtime guide](quickstart.md).

Current direct pins, recording project choices rather than making a claim about the latest releases:

| Runtime dependency | Version | Development dependency | Version |
| --- | --- | --- | --- |
| drizzle-kit | 0.31.11 | @tailwindcss/vite | 4.3.5 |
| drizzle-orm | 0.45.4 | @types/node | 24.19.2 |
| markdown-it | 15.0.3 | @types/pg | 8.23.1 |
| nuxt | 4.6.4 | tailwindcss | 4.3.5 |
| pg | 8.23.1 | typescript | 6.0.3 |
| vue | 3.5.45 | vite | 8.3.5 |
| vue-router | 5.4.0 | vitest | 5.0.5 |
| zod | 4.6.7 | vue-tsc | 3.3.14 |

The adopted local configuration uses port 3000 on 127.0.0.1, private PostgreSQL on the
Compose network, and a named volume mounted at /var/lib/postgresql. Local database/user
defaults are northbeam with the documented local password northbeam_local; overrides are
optional and DATABASE_URL remains server-only. Normal stop/start and Compose down preserve
data; down --volumes explicitly removes it. No host Node/pnpm installation is required
for the reviewer Docker workflow.

### Test strategy, isolation, and parallelism

| ID | Your recorded selection |
| --- | --- |
| P004 | Vitest; real PostgreSQL lifecycle evidence and independent connections for concurrency tests. |
| P018 | Separate database-free test:unit, PostgreSQL-backed test:integration, and test running both/failing if either fails. Automatically provision integration PostgreSQL. |
| P019 | Dedicated Compose test-db/test-runner services, outside normal startup. Wait for readiness, apply application migrations, then run integration tests. |
| P020 | One disposable DB per integration run; files/cases sequential; clear application data between cases, preserve migrated schema, then discard test DB. Concurrency cases still run simultaneous independent connections. |
| P055 | Truncate articles and article_versions together between cases, explicitly naming both without CASCADE, only in the disposable DB; preserve constraints/triggers/migration journal. Finish case operations before reset. |
| P056 | Fixed dedicated project northbeam-docs-studio-test; integration runs must not overlap. Atomically establish runner ownership and clean only that project's resources. |
| P057 | One Node script orchestrates integration startup, execution, results, and cleanup on Linux/Windows; preserve failures and report cleanup failures. |

Checked against [Vitest configuration](../../vitest.config.ts),
[runner](../../scripts/test-integration.mjs), [test helpers](../../tests/integration/helpers.ts),
[SQL foundation tests](../../tests/integration/database.test.ts), and
[HTTP lifecycle tests](../../tests/integration/articles.test.ts).

## Additional explicit UI and review decisions

These selections are recorded outside the A/P rows, or amend their original presentation.
Sources: [UI design](ui-design.md), [later plan decisions](plan.md#entry-chooser-requested-during-phase-4-review),
[tasks](tasks.md), [constitution](../../.specify/memory/constitution.md), and [delivery review](quickstart.md#phase-18-delivery-rehearsal-and-history-review--november-8-2026).

| Area | Your recorded decision |
| --- | --- |
| Visual design | Approve the final Deloitte-inspired black/white/green theme with the Northbeam identity. Use native system fonts, no downloaded font/icon package, clear cards/rows, and semantic destructive/error/conflict colors. |
| Editor layout | Write/Preview tabs at every width, history below. Switching tabs preserves local title/body/tags and never saves or publishes. Support keyboard arrows and Home/End. |
| Portal entry | Native Public/Writer chooser on fresh root entry; selection retained during client navigation; deep links uninterrupted; Escape chooses Public. Retain the header portal switch and remove the separate workspace landing action. This is navigation, with no saved role or authentication. |
| Editor identity | Use /writer/articles/:slug/edit rather than UUID browser URLs. The /edit suffix keeps slug new usable without colliding with the creation route. Internal mutation/history identifiers remain UUIDs. |
| Query simplification | Keep draftTitle/draftBody/draftTags names. Single-article writer reads select the row then use the shared allowlist mapper; writer summaries still select only summary columns. |
| Input preservation | Keep local text on errors/conflicts and when typing during delayed responses. Dirty Reload/Restore require explicit confirmation; cancellation preserves text. Snapshot deletion always confirms the specific version. Unpublish preserves local edits. No automatic write retry, rebase, or merge. |
| Interaction quality | Responsive layouts, labeled fields, visible focus, semantic links/buttons, announced outcomes, and 44px action targets; avoid horizontal page overflow. No formal accessibility certification or broad browser matrix was agreed. |
| Delivery order | Spec/plan/tasks before code and preserved git history; UI design before writer screens; deliver feature API/UI/feedback/verification together. Normally review small tasks and obtain approval between phases. |
| Later authorization | You approved Phases 1–14, authorized one-shot execution through Phase 17 including intermediate gates, and approved final Phase 18 review on November 8, 2026. This did not waive the Windows verification gap. |
| Human ownership | Humans choose architecture and commit/review/merge/submit. The agent leaves changes uncommitted; PR descriptions cover the full branch relative to main in copy-ready Markdown. |
| Quality gates | Reuse established patterns and existing tests; require meaningful real-PostgreSQL lifecycle/concurrency evidence, typechecks/build/full-suite gates, synchronized docs, and explicit unverified results. Reviewer test execution is optional. |
| Time budget | Approximately 24 focused hours; development by November 11, 2026 and submission preparation for November 12, with the final two hours reserved for defects/submission. Favor required lifecycle correctness over stretch work and visual polish. |

## Non-functional requirements: decided versus unspecified

This table separates explicit scope/guarantees from implementation observations and missing
targets. “Unspecified” is not a newly approved assumption that any value is acceptable.
The plan explicitly records that further NFR discussion was set aside at your request.

| Topic | Recorded requirement or decision | Implemented behavior / limit of the evidence |
| --- | --- | --- |
| User load | Intended scope: one trusted writer and anonymous readers. No numeric simultaneous-reader/writer target or requests/second target. | Shared workspace has no user identities or enforced one-writer cap. Multiple tabs/trusted people can issue requests. No capacity/load-test result is recorded. |
| Same-article concurrency | Explicit row locking and expected revisions; no silent overwrite; same-revision competing lifecycle writes have at most one success. P007/P008/P013. | Row lock serializes decisions for that article. A later contender sees the committed revision and fails stale. This establishes correctness under contention, not a throughput figure. |
| Different-article parallelism | No global serialization or numerical parallel-operation target was selected. | Locks target individual article rows, so independent articles are not serialized by one application-wide lock. Actual throughput remains bounded by runtime/database resources and is unmeasured. |
| Read parallelism and consistency | Public reads expose only published owned snapshots; no custom cache layer. | One SQL statement per public list/detail uses published state and its snapshot together. Reads take no lifecycle FOR UPDATE lock. An already-open page is not a real-time subscription. |
| Browser action parallelism | Preserve local edits and prevent overlapping conflicting editor actions. | Each editor has a pending flag and explicit conflict recovery. This is per-editor coordination, not a global one-request limit. |
| Integration parallelism | Sequential files/cases against one disposable DB; one fixed-project run at a time. P020/P056. | Runner rejects overlapping ownership. Within a concurrency case, requests/connections genuinely overlap. Unit-suite parallelism was not restricted by this decision. |
| Availability / uptime | No uptime percentage, SLA/SLO, maintenance window, failover requirement, or production availability target was agreed. | Local topology has one app and one DB service. No replica/failover or app restart policy is configured; migration failure intentionally prevents serving. This is not an HA design or uptime guarantee. |
| Latency / throughput | No p95/p99 response-time, page-load, requests/second, or publish-time budget was adopted. | Functional tests and manual acceptance do not establish performance targets. Integration test timeouts/readiness polling are test/startup configuration, not service latency promises. |
| Data volume / growth | No target article count, snapshot count, total storage, growth rate, or maximum active sessions was agreed. | Lists/history are unpaginated. Only primary/unique-constraint indexes are initially selected. No large-dataset benchmark is recorded. |
| Per-article content limits | Title 200 code points; body 100,000; normalized slug 1–100 ASCII-format characters; at most 10 normalized tags of 30 code points each. A008/A014/A016/A017. | Enforced at request validation. Title/body count Unicode code points; permitted tag/slug characters are ASCII. These are content limits, not global request-rate or storage limits. |
| Atomicity / integrity | Whole publication commits or rolls back; immutable snapshots, owned references, unique slugs/versions, preserved first date, and non-reused version numbers. | Transactions, revision checks, constraints, and immutability trigger implement the selected protections. Some state/range/length invariants deliberately remain application-only under P037/P038/P042. |
| Durability | Persist application data across normal restart and Compose down/up using a named PostgreSQL volume. | Recorded SQL/HTTP checks cover normal restart persistence. Deliberate volume removal destroys data. Persistence is not a backup or host/disk-loss recovery guarantee. |
| Disaster recovery | No backup frequency, retention, restore drill, off-site copy, RPO, or RTO target was agreed. | Transaction rollback/app-crash recovery was tested; that evidence does not establish recovery from database storage loss. No backup/restore workflow is configured. |
| History retention | Preserve immutable retained snapshots; manually delete eligible history and protect the current/last reference. | No TTL, automatic pruning, storage quota, or maximum retained-version count is configured or numerically agreed. Do not interpret this as a guaranteed infinite retention capacity. |
| Authentication / authorization | Trusted local writer; anonymous public reading. Authentication, roles, and tenancy are out of required scope. | Writer APIs are unauthenticated. “Public” and “Writer” distinguish views/projections, not enforced access roles; navigation does not secure draft/history endpoints. |
| Content safety / errors | Escape raw HTML; restrict links; strictly validate inputs; expose only live data through public endpoints; generic unexpected errors. | Shared renderer and API projections implement these protections. No broader adversarial multi-user security or rate-limit requirement was adopted. |
| Network / configuration | Local loopback app, private Compose DB, optional configuration with working local defaults; server-only DB URL. P076. | App publishes 127.0.0.1:3000; PostgreSQL publishes no host port. Production TLS, internet hosting, and production secret management are outside the selected local workflow. |
| Resource sizing / scaling | One Nuxt application and one application database; no worker/replica/resource-budget targets. | Shared reusable pg pool has no project-specific size tuning. No CPU/memory limits, autoscaling, job queue, read replica, or distributed cache is configured. These omissions do not imply a chosen user capacity. |
| Responsive access / accessibility | Approved responsive controls, keyboard behavior, labels, focus, and result feedback. | Recorded Chrome checks cover 320/390/1440px. No complete accessibility audit, named WCAG conformance target, or cross-browser certification is recorded. |
| Platform support | Same reviewer command targeted for Linux and Windows PowerShell; host HMR development also approved. | Linux CLI via Docker Desktop Linux daemon and macOS host development were verified. Native standalone Linux was not separately exercised. Windows startup/tests/cleanup/persistence remain unverified under T028. |
| Reproducibility / maintainability | Exact package pins/lockfile, reviewed SQL migrations, conventional module boundaries, meaningful tests, and synchronized docs. | Docker and test startup apply migrations before serving/testing. No CI/CD pipeline, production release process, or upgrade cadence is required. |
| Observability / operations | Useful UI feedback and explicit startup/test failure handling are required. No production monitoring or incident-response targets were agreed. | Native runtime/error output and runner exit handling exist; no application metrics/alerting/tracing/health SLO or on-call workflow is configured. |

Sources for this comparison: [plan summary/NFR context](plan.md#technical-context),
[scope](spec.md#scope), [schema and read model](data-model.md),
[Compose](../../compose.yaml), [DB client](../../server/db/client.ts),
[queries](../../server/services/articles/queries.ts),
[transaction helper](../../server/services/articles/withArticleTransaction.ts),
[editor](../../app/composables/useArticleEditor.ts), [runner](../../scripts/test-integration.mjs),
and [recorded verification](quickstart.md#final-acceptance-and-evidence-audit--november-8-2026).

## Explicit exclusions and deferred work

- Outside required scope: authentication, roles, tenancy, WYSIWYG, rich Markdown directives,
  custom components, media uploads, search, large-scale pagination, caching layers, production
  deployment, CI/CD, and infrastructure-as-code.
- Deferred stretch candidates: Save-as-version, version diffs, automatic slug suffixing,
  idempotent publishing, and limited raw HTML formatting. Approval to record these did not
  authorize implementation. Required Publish continues to create a fresh snapshot every time.
- Explicit Save is required; autosave, automatic conflict merging/rebasing, and automatic
  mutation retry are not part of the delivered workflow.
- Separate DB runtime/migration roles, separate draft/metadata storage, a shared-state store,
  and parallel isolated integration projects remain possible future changes rather than
  requirements of this delivery.

## Review scope and evidence boundary

This review compared the register, approved requirements, constitution, plan/research,
data model, API/UI contracts, design, task status, README, handoff, and verification guide
with the implemented UI, services, validation, queries, SQL migrations, Docker configuration,
dependency pins, and test orchestration/coverage. No application behavior or dependency was
changed, and no new load target, availability promise, architecture choice, or approval
was introduced.

The existing final evidence records **242 passing tests: 99 unit and 143 real
PostgreSQL/HTTP integration cases**, plus build/typechecks and Chrome acceptance. Those
results are previously recorded evidence, not fresh execution during this documentation
inventory. Windows T028 remains open; FR-013/SC-005 remain only partially verified.

Earlier planning/status paragraphs remain in some source documents and describe work as
pending. For final implementation/verification status use the final evidence audit and
handoff, while retaining A/P entries as the approval trail. This inventory does not treat
historical planning prose as evidence of a new requirement or current missing feature.
