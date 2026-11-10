# Version Diff: UI design

**Prepared**: 2026-11-10. **Human visual review**: revised preview approved on 2026-11-10 with “Approve revised design”; initial design changes retained below as history. This approved design is implemented for saved-draft comparison in T014–T016; historical controls remain planned. Open [interactive preview](design-preview/index.html).

## Placement and controls

Reuse the editor's paper background, black/green heading, white bordered surfaces,
44px buttons, native controls, and visible green focus. Add a Compare entry in version
history opening an inline surface immediately below history; keep Write/Preview and
existing inspection/restore/delete controls intact. Opening focuses the panel heading.
Closing returns focus to its entry button. No modal or focus trap.

Always show a labeled mode select, baseline and target, Compare/Refresh, and Close.
Draft mode has a version baseline select and a fixed `Saved draft · revision N` target.
Historical mode has two version selects and Reverse; the same UUID may occupy both.
Show `Version N` labels, current/last-published annotations where applicable, never
UUIDs as display names. Reversal swaps the selections and starts a fresh attempt.
Other mode/source changes clear obsolete output and require Compare to load new sources.
Keep source selectors, Cancel, and Close usable during fetching/computation; changing
selection cancels the pending attempt. No comparison action calls a lifecycle mutation.

## States and saved draft guard

| State | Presentation and actions |
|---|---|
| Selecting | Explain roles; Compare starts fresh owned reads. |
| Dirty draft | “Save your draft before comparing.” Disable draft Compare/Refresh; keep Close and historical mode available. Do not autosave or offer an implicit save. |
| Pending write / conflict | Explain that the current write must finish or conflict must be resolved before draft comparison. Historical mode permits unrelated dirty/conflicted fields; a pending lifecycle write may temporarily block new attempts. |
| Fetching | Announce “Loading comparison sources…”; show Cancel and Close. |
| Computing | Announce “Comparing…”; keep selectors, Cancel, and Close usable. |
| Ready | Captured baseline/target labels; saved revision; result legend, title/body rows, tag memberships, and a complete single-scroll diff. Later typing leaves this capture visible with “Save and refresh to include later edits.” |
| Error | Clear obsolete output; announce a safe message, including unavailable/deleted source without substitution. Retry starts fresh reads; edits stay intact. |
| Identical | Explicit “No differences” plus captured labels; no fabricated changed rows. |
| No history | “Publish a version before comparing.” Close stays available. |
| One version | Draft comparison and same-version identity checks work; explain that distinct historical changes need another retained version. |

A successful Save that leaves newer input dirty does not unblock draft Compare. Recheck
saved capture guards after reads. Another tab never silently reloads local fields.

## Unified output

Title and Markdown source body have separate labeled sections. Each row has baseline
and target line numbers (a dash for absence), a textual/symbolic change cue, and exact
escaped source text. Preserve spaces/tabs and original CRLF/LF; wrap long lines without
altering text. Added words use semantic insertion/underline, removed words use semantic
deletion/strikethrough; unchanged words within replacements remain plain. The legend
explains both row and inline cues so color is supplementary.

Show an adjacent annotation for LF, CRLF, or “No final newline” when relevant; annotations
are separate from exact source strings. Empty lines retain a visible row. Tags appear
in labeled Added, Removed, Unchanged groups; ordering alone produces no change.
HTML, Markdown, and unsafe links stay inactive source text.

The human requested one GitHub-style unified article diff on 2026-11-10 and selected
“Show every line in one scroll.” The revised preview uses one bordered diff surface,
with title rows followed by Markdown body rows, removed/added lines interleaved, and
all unchanged context visible. Field labels distinguish title and body line-number scopes;
these labels and newline annotations are UI metadata, not inserted source characters.
Tags remain a compact membership summary below the single diff. Long lines wrap in place.
There are no Previous/Next range controls, text portions, or collapsed unchanged sections.
Keyboard users can scroll through every line without expanding hidden output.

The original paged preview was rejected; the human approved the revised continuous
preview on 2026-11-10. The Worker and full input limits are unchanged. Final single-scroll
rendering must pass full-size browser acceptance; a large DOM must not silently reintroduce
pagination, collapsed content, or truncation. If it cannot meet acceptance, seek a reviewed
rendering strategy instead of changing the requested behavior.

## Responsive and keyboard behavior

At 1440px, use the existing max-width editor layout with mode and role selectors in
three columns and wrapping actions. At 390px and 320px, stack selectors and labels,
wrap actions, and keep the line-number gutter compact. Source text wraps anywhere;
controls have min-width:0 and output does not force page overflow. Maintain a 44px
minimum control height, high-contrast non-color cues, and a visible focus outline.
Use native tab order, labeled selects, a heading with tabindex=-1 for entry focus,
a concise polite status region, and an alert for failures. Escape need not close an
inline panel; the explicit Close button is always reachable.

## Review boundary

Architecture option A does not approve this rendered design. Human review is required
before T014/T020 screen implementation and before Phase 2 is declared fully complete.
The human visual approval gate was satisfied on 2026-11-10. The preview
uses sample data and simulated states; it is not browser acceptance of the application.

## Initial preview verification — 2026-11-10

Headless Chrome 157 checked eight sample states at each of 320/390/1440px (24 cases),
with no page overflow or runtime exceptions. Historical role reversal, native Enter
paging with heading focus, and close focus return passed. Mobile and desktop screenshots
were inspected locally. This verifies the preview only; human visual review remains pending.

## Human design revision — 2026-11-10

The human requested changes to the initial preview: “the entire article to be shown as
a single diff, just like github does it”, then selected “Show every line in one scroll”.
The revised preview follows that selection. The human approved this revised rendering on 2026-11-10;
no application component has been implemented.

## Revised preview verification — 2026-11-10

The revised single-scroll preview passed nine states at 320/390/1440px (27 layout cases)
with no page overflow or runtime exceptions. Native PageDown scrolling, complete sample
row visibility, role reversal, and close focus return passed. The revised mobile screenshot
was visually inspected. The human subsequently approved this revised preview on 2026-11-10.

## Approval record — 2026-11-10

The human selected “Approve revised design” after reviewing the revised preview. T005 is
complete. The approved design has every article line visible in one continuous scroll,
with title changes in the same unified surface and tags summarized below. Visual approval
is separate from the later integrated full-size rendering and controller acceptance gates.

## US1 implementation — 2026-11-10

The approved saved-draft layout is now integrated in ArticleComparison.vue and the editor.
All article lines remain in a single table; complete output appends automatically in
yielded batches, without range controls, collapsed content, or truncation. Production
mobile/desktop checks and the full-size DOM matrix are recorded in quickstart.md and
draft-comparison-evidence.json. Historical source selection/reversal remains Phase 4.
The original preview stays sample-only and is not the running application. Native
collapsed-picker keyboard coverage remains a T025/manual gap, explicitly documented.


## Phase 4 implementation evidence — 2026-11-10

T018–T023 implement arbitrary retained-version pairs, same-source identity, fresh reads,
and role reversal. Historical capture permits unrelated dirty/conflicted draft fields;
active lifecycle writes block attempts. Selection/mode/reversal invalidate obsolete reads,
Workers, and output. Saved-draft guards remain strict. No comparison writes or backend
changes were introduced. The inline, complete single-scroll design remains in place.

[Historical evidence](historical-comparison-evidence.json) records nine maximum-size
fixtures in both directions (18 completed comparisons), exact DOM/source and word-detail
checks, preserved fields, SQL/public immutability, pending-work cancellation, and keyboard
final-row access. Five additional controls interrupted real 100,000-row rendering without
late rows. The largest output took about 49–50s to append in this run; timings are observations,
not guarantees. Current-source saved-draft regression also reconstructed all 100,000 rows.
315 tests (171 unit + 144 PostgreSQL/HTTP), Nuxt typecheck, and production build passed.
Normal native popup-picker keyboard coverage, final T024–T027, and Windows T028 remain
pending. Earlier sections and US1 evidence retain their original checkpoint provenance.
