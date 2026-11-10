# Version Diff: Validation Guide

**Date**: 2026-11-09 | **Status**: Planned validation, not execution evidence.
Option A architecture was selected on 2026-11-09; see [plan](plan.md). Feature controls are not implemented.
Original Windows acceptance T028 remains unverified.

## Prerequisites and startup

Use existing [README](../../README.md) and [baseline guide](../001-docs-studio/quickstart.md).
Docker/Compose are needed for isolated integration tests. Host checks use pinned Node/pnpm and locked dependencies. The selected diff@9.0.0 dependency is installed and locked during implementation, not this planning update.

```sh
docker compose up --build
```

Open http://127.0.0.1:3000, choose Writer, and prepare two distinct retained versions plus a different saved draft. Do not treat future comparison steps below as currently working controls.

## Completion commands after implementation

```sh
pnpm run test:unit
pnpm run test:integration
pnpm exec nuxt typecheck
pnpm run build
```

pnpm test remains the one-command complete suite. Inspect/reuse existing tests before adding cases. Node tests cover pure algorithm/state; actual browser acceptance must exercise dev and production Worker bundles, DOM safety, cancellation, accessibility, and complete output. Extend the existing real-DB history-read tests only for missing evidence.

## Acceptance walkthrough

1. Edit without saving; draft comparison requires an explicit successful Save and sends no mutation itself. A failed/stale Save or typing during Save that leaves dirty input keeps comparison blocked and edits intact.
2. Compare saved draft with any retained version. Check source labels/revision, line changes, word changes, tag memberships, no-differences state, and saved capture semantics. Later editing does not silently change displayed output.
3. Compare any two retained versions, reverse roles, and select the same version twice. Keep unrelated unsaved edits intact. Unpublish and repeat both modes.
4. Compare empty bodies/tags, reordered tags, Unicode/emoji, whitespace, blank lines, CRLF/LF, final-newline changes, Markdown/raw HTML/unsafe links. All source remains escaped inactive text.
5. Delete a selected eligible version in another tab; next attempt reports unavailable, without substitution or partial/stale output. Wrong-owner UUID gets existing 404. No local fields disappear.
6. Delay GETs/compute; change sources/mode, close, reopen, or navigate to another article. Old results cannot overwrite current selection. Cancel/Worker error/retry preserve editor text.
7. Keyboard-only checks at 320/390/1440px: source selection, compare, reversal, all output portions, close/focus return; identify changes without color.
8. Reuse SQL/public-state capture helpers before/after comparison source reads: zero draft, revision, history, audit, counter, publication state/reference/date changes. Explicit setup Save is outside this assertion.

## Maximum-input feasibility gate

Exercise both modes with maximum title/tags and two 100,000-code-point bodies: identical, sparse edits, fully different token-dense text, repeated lines, many short lines, long single lines, large unequal replacement blocks, Unicode, and whitespace. Reconstruct each source exactly and verify required word detail. Every result chunk must remain reachable.

Record hardware/CPU/RAM, browser/build, fixtures, compute/render timings, responsiveness, cancellation, and available memory observations. Worker computation alone is insufficient if DOM rendering freezes input. No numerical speed promise is adopted.

Timeout/no-result, lost highlighting, truncation, smaller caps, or inaccessible omitted output fail FR-012/SC-006. Investigate another engine/design or request explicit requirement revision; do not report these cases passed. No maximum-input experiment was executed during planning.

## Evidence map

| Requirements | Evidence |
|---|---|
| FR-001, FR-002, FR-004, SC-001 | Both modes; save guard; saved capture/source labels |
| FR-003, FR-005, FR-009, SC-002 | Exact line/word reconstruction; empty/Unicode/whitespace/tag sets |
| FR-006, FR-007, SC-003 | Real-DB/public state unchanged; browser edits preserved |
| FR-008, SC-004 | Existing GET ownership/errors; deleted sources; stale response isolation |
| FR-010, FR-011, SC-005 | Actual browser escaped text/keyboard/mobile/non-color checks |
| FR-012, SC-006 | Full-limit engine and production-browser matrix |

Record only actual commands/results as execution evidence. This guide establishes no capacity, latency, WCAG certification, or untested browser guarantee.
