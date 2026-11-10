<!--
Sync Impact Report — review-only; remove this comment before committing.
Version change: 2.0.0 -> 2.1.0 (detailed review walkthroughs for new files).
Modified principles: none.
Minor rationale: adds a review obligation without removing existing governance requirements.
Human request: 2026-11-10, explain every new file's functions, necessity, and usage in detail.
Added principle: VIII. Detailed Review Explanations for New Files.
Removed sections: none.
Affected workflow: task/phase review handoffs must include the new-file walkthrough.
Template synchronization: dependent templates read this constitution at runtime;
  no template or command files changed.
Deferred placeholders and follow-up TODOs: none.
-->

# Northbeam Docs Studio Constitution

## Core Principles

### I. Specification Before Implementation

The project MUST produce and review `spec.md`, `plan.md`, and `tasks.md` through Spec Kit
before application implementation. The specification MUST describe observable behavior and
edge cases; the plan MUST resolve the data model, API, concurrency, and test strategy; tasks
MUST define small, verifiable outcomes. These artifacts MUST be recorded in git before
application code, and later history MUST preserve that sequence without squashing or rewriting
it away. Requirement or design changes MUST update the owning artifact before dependent code.
This makes the reasoning and development sequence inspectable by the assignment reviewer.

Documentation MUST stay synchronized with the work. Changes to requirements, architecture,
behavior, APIs, configuration, or run/test/deployment procedures MUST update affected
specifications, plans, task status, and README instructions in the same task. Every task MUST
review documentation accuracy before completion. Documents MUST distinguish proposed,
implemented, and verified behavior; updating unrelated documents solely to create activity
is unnecessary.

### II. Isolated Drafts and Immutable Published Content

Draft content and published snapshots MUST be stored separately. Public title, tags, and body
MUST come exclusively from the live snapshot of a published article. Draft edits MUST NOT
change public content. Snapshot content MUST remain immutable after creation, and version
numbers MUST be unique per article and never reused after deletion.

The API MUST reject deletion of the currently referenced published snapshot. Unpublishing
MUST preserve that reference, its snapshot, and the first `publishedAt`; republishing MUST
also preserve that timestamp. Restore MUST copy historical content into the draft without
publishing it, changing the live reference, or creating, deleting, or modifying history rows.
Public detail requests for draft-only or unpublished articles MUST return `404`, and public
lists MUST exclude them. Writers can therefore edit and recover content without changing what
readers see until an explicit publish.

### III. Atomic Lifecycle Changes and Explicit Concurrency

Publish MUST create its numbered snapshot and update the article's live reference, status,
first-publish timestamp, and revision as one database transaction. Any failure MUST roll back
the entire operation. A published article MUST reference an existing snapshot belonging to
that article. Database constraints and transactional checks MUST protect publication
consistency and referenced-snapshot deletion even when requests race.

Save, restore, publish, and unpublish MUST validate the caller's expected article revision.
Every successful change to draft content or publication state MUST advance that revision.
Stale requests MUST fail with a clear conflict response instead of silently overwriting or
acting on newer state. The UI MUST preserve unsaved local text when a write is rejected.
Lifecycle invariants MUST be enforced server-side; hiding or disabling a control is insufficient.

### IV. Database-Backed Evidence for Lifecycle Correctness

Each lifecycle feature MUST include automated tests of its observable success and failure
behavior before the task is marked complete. Invariant tests MUST use an isolated, real
PostgreSQL database with the application's migrations and constraints. Concurrency tests MUST
use independent database connections. Mocks alone cannot demonstrate transaction, constraint,
or concurrency correctness.

Coverage MUST prove draft/live isolation, immutable history, first-publish timestamp
preservation, unpublish visibility, non-destructive restore, protected and permitted deletion,
stale-write rejection, concurrent publication consistency, publish rollback, and persistence
across restarts. Tests MUST run with one documented command after the declared prerequisites
are available. Prioritize this evidence over extensive UI test coverage.

Before adding tests, AI MUST inspect relevant existing tests. Existing tests MUST be extended
or parameterized when they can clearly verify the required behavior while preserving prior
assertions and coverage. New test cases or files MUST be added only when existing tests cannot
cover that behavior clearly without weakening coverage or test isolation. Duplicate tests and
unrelated test-suite restructuring MUST NOT be introduced.

Once the application is scaffolded, a task MUST NOT be deemed complete until the production
build and existing automated test suite pass against the resulting state, including any
required test updates. Report the commands and outcomes at the review handoff. Failed,
skipped, or unavailable checks MUST NOT be presented as passing verification.

Before application scaffolding exists, specification and governance tasks MUST validate
their changed artifacts and explicitly report application build/tests as not yet available.
The scaffolding task itself MUST establish a passing build and runnable test suite.

### V. Small, Reviewable Changes Within the Time Budget

Codex work MUST follow small tasks with one observable outcome, normally sized for a
30–60 minute implementation and review cycle. After each task, inspect the changes, run the
relevant checks, and explain what changed, why, what the evidence proves, and any limitation.
Larger tasks MUST be split into reviewable increments.

Each prompt MUST make the smallest complete change needed for the requested task or explicitly
requested task set. Every changed file MUST directly support that scope or a strictly necessary
dependency, which MUST be explained. Unrelated refactoring, formatting churn, speculative
features, unused code, and premature abstractions MUST NOT be bundled into the change.
Required validation, migrations, and focused correctness tests remain part of a complete change.
At the task boundary, provide a concise summary of changed files, behavior, verification, and
remaining issues so a human can review the change set. Subsequent tasks MUST remain separate
unless the user explicitly requests them in the same prompt.

AI MUST NOT create git commits, including through scripts, extension hooks, or automatic
workflow actions. All changes MUST remain uncommitted for human review and approval;
creating commits is the human's responsibility.

When asked for a PR description, AI MUST provide copy-ready Markdown covering the current
branch's full changes relative to `main`. The description MUST be based on the inspected
branch diff and explain the problem, resulting behavior, and relevant verification for a reviewer.

The implementation MUST complete required lifecycle behavior, the minimal UI, tests, local
setup, and documentation before adding a stretch goal. Keep abstractions and dependencies
proportional to this application; additional complexity MUST have a documented requirement
or correctness rationale. If time becomes constrained, reduce visual polish and record known
omissions rather than weakening invariants or claiming unfinished work is complete.

For feature 002 only, the human approved deferring feature 001 Windows PowerShell
acceptance T028 on 2026-11-09 so version-diff implementation may proceed with the
required application already implemented and its available-platform evidence recorded.
T028 MUST remain unchecked until executed on Windows. This exception changes the order
of work only: Windows setup, tests, cleanup, and persistence MUST NOT be reported verified
without execution evidence. Required platform acceptance remains incomplete. All other
spec-first, architecture, UI review, task verification, and human-owned commit gates apply.

### VI. Human Architecture Decisions

All architecture decisions MUST be made by a human. Before a new or changed decision, AI
MUST present viable options, their tradeoffs, and a reasoned recommendation for human selection.
This includes data models, API contracts, application boundaries, structural dependencies,
and persistence, concurrency, and testing approaches. If constraints leave only one viable
option, explain those constraints and obtain human confirmation.

AI MUST record the human's selection in the relevant specification or technical plan before
implementing dependent work. Unselected options MUST remain clearly labeled as proposals.
Existing explicit human decisions remain authoritative and do not require repeated approval
unless a change is proposed. AI MUST NOT silently turn a recommendation into an approved decision.

### VII. Consistent Implementation Patterns

Before implementing a task, AI MUST inspect comparable existing implementations and the
approved design artifacts. New work MUST follow established patterns for structure, naming,
validation, error handling, data access, and tests where applicable. A new task or prompt
MUST NOT introduce a different pattern for the same kind of work without human approval.

If an established pattern cannot meet the requirement or needs to change, AI MUST explain
the problem, present alternatives and their impact, and obtain explicit human approval before
making the change. When no comparable implementation exists, architectural pattern choices
MUST follow Principle VI. This keeps behavior and code organization consistent across tasks.

Code MUST express its intent through clear names and straightforward structure. Comments MUST
be limited to explaining non-obvious rationale, constraints, or tradeoffs that the code cannot
communicate clearly. Comments MUST NOT narrate obvious operations, repeat the code, or serve
as a substitute for readable implementation.

### VIII. Detailed Review Explanations for New Files

Whenever AI adds a file, the task or phase review handoff MUST include a detailed,
file-by-file walkthrough for a human code reviewer. A filename list, change summary,
or passing-test report alone is insufficient. The walkthrough MUST link to each new
file and relevant definitions and usage locations, with line references where available.

For each new code file, AI MUST explain:

- Its purpose, the requirement it satisfies, why a separate file is needed, and how its
  responsibility fits the existing structure.
- Each function, helper, class, composable, or component: what it does, why it is needed,
  its inputs and outputs, return values, and side effects. Explain relevant types,
  component props, emitted events, and public interfaces as well as private helpers.
- Where it is imported, called, rendered, or otherwise consumed, naming the actual
  files and call sites. Trace the relevant data/control flow through those connections;
  if a consumer is planned but not implemented, state that explicitly.
- Relevant state changes, asynchronous behavior, validation/guards, error handling,
  cancellation/cleanup, protected invariants, and meaningful tradeoffs or limitations.
- How it was verified, which tests cover its behavior, what those checks establish,
  and what remains unverified.

For new tests, documentation, configuration, fixtures, generated files, or evidence
artifacts, AI MUST explain the applicable structure, cases/settings/data, why the file
exists, how it is produced or maintained, who or what consumes it, and its validation
and limitations. Do not invent functions or runtime call sites for non-executable files.

Provide this explanation in the review response unless the human requests a separate
review document. A concise outcome summary may precede the walkthrough but MUST NOT
replace it. Source comments MUST still follow Principle VII; the walkthrough belongs in
the review, rather than repetitive comments throughout the implementation. This makes
new responsibilities and their integration inspectable before human approval.

## Technology and Scope

- The application MUST use Nuxt, Vue, and PostgreSQL. Supporting libraries, compatible
  versions, and implementation choices MUST be documented in the technical plan.
- Data MUST persist across restarts. Versioned migrations and a short local setup procedure
  MUST allow a reviewer to run the application from a clean checkout with declared prerequisites.
- The README MUST provide a single-line local deployment command for Linux in a POSIX shell
  and for Windows in PowerShell. A shared command is acceptable when it works on both.
  After documented prerequisites and configuration are supplied, each command MUST build
  the application, prepare required services, apply migrations, and start the local application
  with persistent PostgreSQL storage, without additional undocumented manual steps.
  The deployment approach MUST follow Principle VI; this requirement does not select a tool.
  Verification results MUST identify the platforms actually tested and any unverified support.
- The UI MUST provide the required writer list/editor/history actions and public list/detail
  views. A Markdown textarea with rendered preview is sufficient; rendered Markdown MUST use
  safe handling of embedded HTML and links.
- Authentication, roles, tenancy, rich Markdown directives, custom components, WYSIWYG
  editing, uploads, search, large-scale pagination, caching layers, production deployment,
  CI/CD, and infrastructure-as-code are outside the required scope. Assume one trusted writer.
- API validation and errors MUST distinguish invalid input, conflicts, and missing resources.
  Public responses MUST expose only the published representation.
- The README MUST explain prerequisites, setup, running tests, the data model and its
  rationale, at least one actual time-pressure tradeoff, and any known omissions.

## Development Workflow and Quality Gates

1. Derive the feature specification from the take-home brief and explicit user decisions.
   Record unresolved behavior as questions or assumptions in the specification; resolve it
   before implementing the affected behavior. Detailed product defaults belong in that spec.
2. Review the technical plan and dependency-ordered tasks against every constitutional
   principle. Present architecture options for human selection and record the decisions.
   Map each lifecycle invariant to its acceptance scenario and test task.
3. Check consistency across the spec, plan, and tasks before application implementation.
   Leave the artifacts for human review, approval, and the spec-first git checkpoint.
   Application implementation MUST wait until the human has recorded that checkpoint;
   preserve subsequent reviewable history through human-created commits.
4. Implement one small task at a time, including its meaningful verification. Explain the
   result after each task and leave changes uncommitted for human review and approval.
   Reuse existing patterns; obtain human approval for architecture or pattern changes and
   update the relevant artifact before continuing dependent implementation. Before marking
   any task complete, satisfy Principle IV's build/test checks and confirm affected documents
   are current; report unavailable checks explicitly.
5. Before delivery, verify the lifecycle tests, type checks, production build, fresh local
   setup, restart persistence, and a browser walkthrough of the required user flows.
6. Work within the roughly 24 focused hours agreed with the user. Finish development by
   Wednesday night, November 11, 2026; prepare the submission for Thursday, November 12.
   Reserve the final two hours for defects and submission preparation.

## Governance

This constitution defines project development rules. The assignment brief and explicit user
instructions remain authoritative; an unresolved conflict MUST be surfaced and reconciled
before implementing the affected behavior. `ACTION_PLAN.md` supplies the working roadmap;
formal specifications and technical plans hold detailed feature and design decisions.

Amendments MUST document the reason, version impact, and affected specifications, plans,
tasks, code, or tests. Update affected artifacts before relying on changed rules. Use semantic
versioning: a major increment for incompatible principle removals or redefinitions, a minor
increment for new principles or materially expanded guidance, and a patch increment for
non-semantic clarifications. Preserve the original ratification date and update the last-amended
date on each amendment. Version 1.0.0 is the initial ratification of the previously empty template.

Every planning and implementation review MUST check applicable principles. A deviation MUST
be made explicit and resolved through a documented amendment or a conforming implementation;
it cannot silently weaken a required assignment invariant. Temporary amendment-review comments
MUST be removed before committing the constitution.

**Version**: 2.1.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-10
