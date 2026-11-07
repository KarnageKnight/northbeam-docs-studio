# UI and Internal Service Contracts

**Date**: 2026-11-07
**Status**: Final design review; describes planned interfaces, not implemented modules.

Use the approved [HTTP contract](http-api.md), [data model](../data-model.md), and
[plan](../plan.md). These interfaces derive from the selected thin-handler, function,
local-state, and component patterns; they add no framework or repository layer.

## Browser pages

Before implementing these pages, complete T035 in Phase 3 of [tasks.md](../tasks.md):
propose wireframes and visual/interaction guidance in `specs/001-docs-studio/ui-design.md`,
then obtain human approval. This precedes the first writer listing/creation/read-only
editor screens in T022. The design document has not been created yet.

Each feature phase adds only its required UI alongside its API and tests. The editor
starts with load-only draft display, then editing/preview/save, Publish, Unpublish,
history inspection, Restore, and Delete in their respective phases. Components/composable
expose only implemented actions; the tables below describe the final combined interface,
not an instruction to scaffold every action in advance. Public list/detail are separate
API-and-page slices, reusing the renderer first introduced for editor preview.

| URL | Planned source | Responsibility |
| --- | --- | --- |
| `/` | `app/pages/index.vue` | Published list and navigation |
| `/articles/:slug` | `app/pages/articles/[slug].vue` | Published article; unavailable content shows 404 |
| `/writer/articles` | `app/pages/writer/articles/index.vue` | Writer summaries and creation navigation |
| `/writer/articles/new` | `app/pages/writer/articles/new.vue` | Title/slug creation; navigate to editor after success |
| `/writer/articles/:articleId` | `app/pages/writer/articles/[articleId].vue` | Compose editor form, preview, history, and feedback |

Use Nuxt native page routing and universal rendering. The public pages fetch only public
API representations. Writer list titles come from saved drafts. Creation supplies title
and slug and relies on approved empty body/tags defaults.

## Editor composition

| Module | Interface responsibility |
| --- | --- |
| `app/composables/useArticleEditor.ts` | Accept article identity; expose local draft, saved article/revision, history/inspection, dirty/pending/error state, and load/save/publish/unpublish/restore/delete actions |
| `app/components/ArticleEditorForm.vue` | Receive draft, immutable slug/publication state, action availability, pending state, and field feedback; emit field edits and save/publication intent |
| `app/components/ArticleHistory.vue` | Receive snapshots, inspected content, protected reference, pending/feedback state; emit inspect/restore/delete intent |
| `app/components/MarkdownContent.vue` | Receive Markdown source and render through the one shared renderer |
| `shared/utils/markdown.ts` | Pure Markdown-to-HTML function with the approved HTML/link policy |
| `shared/types/articles.ts` | Type-only HTTP projections consumed across server/UI |

Exact property/event spelling is implementation detail within these boundaries. Create
reactive editor state per composable invocation. Keep editable values separate from
authoritative saved values; compute dirty state from the content difference.

- Publish is unavailable while local content is dirty and never auto-saves.
- Send the saved revision as `expectedRevision` for Save, Publish, Unpublish, and Restore;
  refresh it from successful WriterArticle responses. Snapshot deletion sends no caller
  revision: the server locks the article and checks ownership/reference protection, and
  successful deletion leaves the article revision unchanged.
- On conflict preserve local text and show clear feedback. Do not automatically rebase or retry.
- Do not blindly replace unsaved fields when a fetch/save response arrives; retain edits
  made after the request was issued. Serialize conflicting UI actions while pending.
- A successful explicit restore loads the restored draft; it does not publish. Keep the
  action's API eligibility and local editor feedback consistent.
- Referenced history is visibly protected; the API remains authoritative for deletion.
- Expected error feedback uses native response custom data, including fieldErrors. Fetch
  client wrappers may nest that native body; do not confuse it with success data.

## Request boundary

Planned handlers live under `server/api/writer/articles/` and `server/api/public/articles/`,
using Nuxt's method suffixes and bracketed parameter directories for the approved routes.

Handlers read path/body, apply `server/validation/articles.ts`, call the corresponding
operation/query, set status, and return the declared projection. Use native helpers
consistently from `nuxt/server` for the pinned version; avoid mixing event models.

Expected lifecycle failures carry an allowlisted application code and optional validation
details. A small ordinary helper at `server/utils/api-errors.ts` maps those failures and
known parsing/schema failures to native Nuxt errors. Use plain error metadata rather than
a class hierarchy or result-envelope framework. Unknown exceptions propagate to native
production handling; original database details are not client messages.

## Database operations

All lifecycle functions import the shared database configured in `server/db/client.ts`.
Infer database row/transaction types from the selected Drizzle schema; infer input types
from Zod. Functions return the HTTP projection below after their transaction succeeds.
There is no database argument, repository interface, or dependency-injection framework.

| Operation file under `server/services/articles/` | Inputs | Result / responsibility |
| --- | --- | --- |
| `createArticle.ts` | Validated create input | WriterArticle; UUID generation and collision-safe insertion |
| `saveDraft.ts` | Article UUID and complete save input | WriterArticle; replace draft and advance revision/audit time |
| `publishArticle.ts` | Article UUID and expectedRevision | WriterArticle; check saved content and atomically create/publicize snapshot |
| `unpublishArticle.ts` | Article UUID and expectedRevision | WriterArticle; valid published-state transition |
| `restoreDraft.ts` | Article UUID, snapshot UUID, expectedRevision | WriterArticle; copy eligible owned content into draft |
| `deleteSnapshot.ts` | Article UUID and snapshot UUID | No value; lock article and reject protected/missing target |
| `queries.ts` | Relevant UUID/slug for the selected read | WriterArticle, summaries, snapshot detail, or public projection |
| `withArticleTransaction.ts` | Article UUID, expectedRevision, operation callback | Begin/lock/check, invoke callback with transaction and locked article, commit or roll back |
| `toWriterArticle.ts` | Stored article row | Explicit WriterArticle projection; excludes counter/audit columns |

Only revision-checked operations use that helper's caller-revision check. Creation and
deletion retain their different workflows. All callback queries use the supplied
transaction, never the shared pool outside it. The operation owns its content/state/
counter/revision/audit changes; the helper owns coordination and completion.

Queries use explicit field projections. Public reads join article status/current reference
to its owned immutable snapshot within one SQL statement. Snapshots are selected by both
owner and UUID; history sorts by version number. Helpers are introduced with the first
task that uses them, not as unused scaffolding.
