## Approval gate

Confirm `openspec/changes/$ARGUMENTS/proposal.md` exists AND at least one file matching `openspec/changes/$ARGUMENTS/specs/**/*.md` exists. If either is missing, STOP and print: "Change '$ARGUMENTS' not found or has no specs. Run /sai-1-spec to create it first."

Ask exactly: "**Have you reviewed the specs in openspec/changes/$ARGUMENTS/specs/** and are ready to **approve** them for design? (yes/no, and any notes)"

If the user's response is "no" or any clearly negative answer, STOP without writing any file.

If the user's response is "yes" (with or without notes), write the following fields to `openspec/changes/$ARGUMENTS/.openspec.yaml`, MERGING into the existing file content (preserve any existing top-level keys such as `schema:` and `created:` verbatim — do NOT truncate or rewrite the whole file):

- `approval.specs.approved_at`: current UTC timestamp in ISO 8601 format (e.g. `2026-05-17T14:30:00Z`).
- `approval.specs.notes`: the user's notes verbatim, or empty string if none provided.

Do not create or modify any other files if the user declines.

## Collaboration Style

- Treat the user as a **knowledgeable peer**, not as a requester. They have deep domain expertise and more project context than you. Adjust language accordingly.
- The user may not have fully specified the task upfront — engage in dialogue to uncover the full picture before committing. **Ask questions rather than making assumptions.**
- When multiple valid approaches exist, **discuss trade-offs explicitly with the user** before choosing a direction.
- Prioritize **shared understanding of the WHY**. Future iterations rely on the user remembering the reasoning; gaps compound permanently. Explain non-obvious decisions concisely but clearly.
- When trade offs are discussed, propose **up to 2 concrete scenarios** that probe edge cases. Wait for user feedback before continuing.

## Generation Instructions

Generate ONLY `design.md` and `tasks.md` for change `$ARGUMENTS`. Do NOT regenerate `proposal.md` or `specs/`.

### Inputs

Read the following known files in the main agent (paths are fixed by convention):
- `openspec/changes/$ARGUMENTS/proposal.md` — motivation, what changes, capabilities in scope
- All files matching `openspec/changes/$ARGUMENTS/specs/**/*.md` — capability delta specs

### Codebase Research (DELEGATED)

**ALL** codebase discovery and deep reading MUST be delegated to a **`budget-explorer`** subagent. The main agent MUST NOT run `glob`, `grep`, `Read`, or any file operation on source code.

Launch ONE **`budget-explorer`** subagent with this prompt:

> Read the proposal and specs for change `$ARGUMENTS`. Discover and deeply read the most relevant source files for this change. Search broadly (glob/grep) — do not assume frameworks. For each discovered file, report: `filePath`, `keyExports`, `isReusableForThisChange` (boolean), `notes` (max 20 words). Return structured data only. No prose narrative.

The main agent acts **exclusively** on the `budget-explorer` subagent's output. If the output is ambiguous, spawn another `budget-explorer` subagent with a more targeted prompt. Do NOT open files to "verify".

## Trust Rule

The `budget-explorer` subagent is the single source of truth for codebase facts during design. The main agent MUST NOT re-read any source file the `budget-explorer` has already reported on, even if the report contains something surprising (e.g. "this component has a bug" or "this pattern is unusual"). Assume the `budget-explorer` is correct and design accordingly.

The only exception: files the `budget-explorer` explicitly marks as `NOT_FOUND` or files not in its list (e.g. external URLs, newly created files).

### Generate design.md

Write to `openspec/changes/$ARGUMENTS/design.md`.

Required sections:
- **Context**: background, current state, constraints
- **Goals / Non-Goals**: what this design achieves and explicitly excludes
- **Decisions**: key technical choices. For each decision, evaluate three ADR/DDR criteria:
    1. Hard to reverse — would changing later be costly?
    2. Surprising without context — would a future reader ask "why did they do it this way"?
    3. Real trade-off — were genuine alternatives available?
  If all three apply, document alternatives-considered and rationale for the chosen approach.
- **Risks / Trade-offs**: known limitations; format: [Risk] → Mitigation
- **Migration Plan**: deploy steps, rollback strategy (if applicable)
- **Open Questions**: outstanding unknowns to resolve

Reference `proposal.md` for motivation, `specs/**/*.md` for requirements.

### Open Questions gate

After writing `design.md`, review the **Open Questions** section.

For each question:
   1. **Delegate** it to a **`budget-explorer`** subagent with a precise search prompt. Do NOT search yourself.
   2. If the subagent returns a clear answer from the codebase, incorporate it into `design.md` and remove the question.
   3. If the subagent reports it cannot find the answer (not found, ambiguous, or out of scope), present the question to the user.

Do NOT proceed to `tasks.md` until every Open Question has been either answered by the codebase or resolved by the user. Incorporate all answers into `design.md` before continuing.

### Generate tasks.md

**Rule of conciseness:** Each step MUST be a planning scaffold, not a restatement of requirements. Do NOT copy scenario text, field names, or detailed behavior from specs into the steps. Instead, reference the relevant spec file and describe ONLY the implementation approach and how it maps to the existing codebase.

Write to `openspec/changes/$ARGUMENTS/tasks.md`.

IMPORTANT: Do NOT use checkbox markers (`- [ ]` or `- [x]`). This file is a planning scaffold, not a progress tracker. Implementation progress is tracked in `implementation.md`.

Structure — one numbered section per implementation step:

    ## Step N: <title>

    **Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>

    **Files Affected**: <comma-separated list of file paths>

    **What Will Be Done**: <prose description of HOW to build it, not WHAT to build>. Reference the relevant `specs/<capability>/spec.md` by path. Do NOT restate requirements already defined there.

    **Testing Strategy**: <how correctness will be verified>

Order steps by dependency. Steps should be small enough to expand into a single `implementation.md` step group.

Reference specs for what to build, design for how to build it.

#### Routing derivation

Every `## Step N` MUST include a `**Routing**` line immediately after its title and before `**Files Affected**`. The line is produced deterministically from the planned file snapshot using the rubric below. A second design agent given the same `**Files Affected**` list and this rubric MUST produce the same three tokens.

- **Layer derivation** (path → token, with precedence for ambiguity): map `**Files Affected**` paths against the four `layer` enumerations in `tasks-routing-metadata`.
  - `frontend` patterns: `src/components/`, `src/pages/`, `src/router/`, `src/store/`, `src/api-client/`, `web/`, `client/`, `mobile/`, `app/` (frontend), `pages/` (Next.js).
  - `backend` patterns: `server/`, `api/`, `services/`, `src/handlers/`, `src/repos/`, `src/models/`, `src/db/`, `src/controllers/`, `src/use-cases/`, `cmd/`, `migrations/`, `prisma/`.
  - `infra` patterns: `.github/`, `Dockerfile`, `scripts/`, `infra/`, `terraform/`, `k8s/`, harness `commands/` / `agents/` / `skills/`, and pure declarative artifacts (`*.md`, `*.json`, `*.yaml`, config files) — docs-only steps are `infra` + `config`.
  - `cross-cutting`: when paths span more than one of frontend/backend/infra in a non-trivial way or the primary layer is genuinely ambiguous.
  - **Precedence**: docs/config-only → `infra`; else if any path matches `frontend` and any matches `backend`/`infra` in a non-trivial way → `cross-cutting`; else single-layer match wins.

- **Discipline derivation** (path → token, orthogonal to layer): map `**Files Affected**` paths against the five `discipline` enumerations in `tasks-routing-metadata`.
  - `ui-ux` (`components/`, `views/`, `pages/` with markup, `layouts/`, `*.css`, `*.scss`, `*.less`, `*.html`, `*.mdx`, `*.astro`, `*.vue`, `*.svelte` with markup, `*.tsx`/`*.jsx` with view markup, `a11y*` files).
  - `app-code` (`src/store/`, `src/router/`, `src/api-client/`, frontend glue, frontend build configs `vite.config.*`/`webpack.config.*`/`rollup.config.*`).
  - `service` (`server/`, `api/` (code), `services/` (code), `src/handlers/`, `src/controllers/`, `src/use-cases/`, `cmd/`, `*Handler*`, `*Service*` (code), `*Controller*`, `*UseCase*`, `*Job*`, `*Worker*`, `*Queue*`).
  - `data` (`src/repos/`, `src/models/`, `src/db/`, `migrations/`, `schemas/`, `prisma/`, `*.sql`, `*Repo*`, `*Model*`, `*Dao*`, `*Entity*`).
  - `config` (`*.json`, `*.yaml`, `*.yml`, `*.toml`, `*.env`, `*.ini`, `*.properties`, `docs/**/*.md` (docs-only), `README.md`, `CHANGELOG*`, declarative `*.config.{js,ts}`).
  - **Precedence for mixed files**: pick the discipline of the majority of non-config files; if tied or ambiguous, pick the discipline that matches the step's primary intent and add a parenthetical justification.
  - **No new tokens** may be invented; gaps are flagged in `design.md` Open Questions per the "No new layer/discipline tokens invented" scenarios.

- **Complexity derivation** (coarse three-tier judgment over the planned file snapshot):
  - `low` — single file, single concern, no cross-module impact.
  - `medium` — multiple files in the same layer, or one file with cross-module impact.
  - `high` — cross-layer, architectural, touches public APIs, breaking schema change, multi-repo coordination, or introduces a new dependency.
  - The token is emitted once and not revised by the design agent; `sai-3-implement` MAY split, merge, or otherwise refine the step in `implementation.md` without re-tagging `tasks.md`.

- **Parenthetical audit note**: an optional one-line `(... )` MAY follow the three key=value pairs; the parser MUST ignore anything from the first `(` onward. Encourage one short justification per line for audit.

- **Prose-precedence-over-table rule**: the pattern tables above are a convenience, not a closed matcher. When a `**Files Affected**` path matches no table entry but the file's nature fits a discipline's prose definition (e.g. `sai/instructions/**/*.md` is "markdown documentation outside a UI surface" per the `config` prose, though no table row names that path), the prose definition wins. Flag the path-class gap in `design.md` Open Questions if it recurs across multiple changes (suggest a future table amendment), but do not block the current step on it.

Reference `openspec/changes/tasks-routing-metadata/specs/tasks-routing-metadata/spec.md` (the enum + derivation sources) and `openspec/changes/tasks-routing-metadata/specs/tasks-scaffold-format/spec.md` (the step-structure and position contract).

#### Commit atomicity constraints

Each `## Step N` becomes a single commit, so every step MUST leave the repository in a state that compiles, typechecks, and builds on its own. Apply these constraints while emitting steps — they are static planning-time reasoning over the planned file snapshot. The design phase never executes a real build; it reasons about code that does not yet exist.

- **Every step is a buildable boundary.** If a candidate step cannot be reasoned as buildable on its own (combined with all previously committed files), merge it forward into subsequent steps until the combined snapshot is buildable. Never plan a step that depends on a *later* step to restore a building state.
- **Group contract-breaking changes atomically.** When a step changes a function signature, removes an exported symbol, renames a public API, or alters any contract other files depend on, list every affected file — callers, consumers, and re-exporters — under the same `**Files Affected**`. Such a change MUST NOT be a standalone step that relies on a later step to fix broken references.
- **Never cite lint as proof a boundary is safe.** Lint (Biome, ESLint, …) runs per-file and does not resolve cross-file types, so it cannot confirm a snapshot typechecks. A boundary is valid only if a full typecheck/build would pass against the exact committed snapshot.
- **Verification checklist** — reason through each item against the planned snapshot before designating a step a commit point:
  - No calls to functions with outdated signatures.
  - No imports of removed or renamed symbols.
  - No references to APIs that have been relocated or deleted.
  - No missing implementations of interfaces or abstract contracts introduced in this or a prior step of the same batch.

  If any item fails, expand or merge the step with adjacent steps until the checklist passes for the combined snapshot.

After all implementation steps, end the file with these two mandatory sections in order:

1. `## Required Documentation` — list every file consulted during design. **Populate this entirely from the `budget-explorer` subagent's report**. Also list every spec file that the steps reference:
   - `### Local files`: one path per line; use line ranges (e.g., `path/to/file.md:10-50`) when only a portion applies; write `None` if empty.
   - `### Spec files`: one path per line to every `specs/**/*.md` consulted. Do NOT leave empty.
   - `### External URLs`: one URL per line; write `None` if empty.
   - Do NOT leave either subsection empty or omit it.

2. `## Implementation Context` — derive all three fields from actual codebase research, not from the change description:
   - `**Stack**`: primary language/framework + key versions relevant to this change.
   - `**Conventions**`: 2–5 project-specific, non-obvious bullets observed in the actual codebase (naming, file organization, error handling, testing idioms). Generic best-practices ("follow SOLID", "write clean code") are NOT acceptable.
   - `**Avoid**`: anti-patterns the implementation agent might default to given the declared stack.

Both sections are mandatory. They must contain real content derived from research, not placeholder text.

### Generate interfaces.md

Write to `openspec/changes/$ARGUMENTS/interfaces.md`.

`interfaces.md` is the per-step **contract** — the new/modified public signatures plus the exact assertions a test author needs — kept in a separate file from `tasks.md` so it is consumable without the implementation body. Derive it from the **same fresh step decomposition** as `tasks.md`, in the same run. Regenerate it wholesale every run; there is NO cross-run preservation path at the design stage (unlike `implementation.md`, which the implementation phase preserves byte-for-byte), so its `## Step N` keys always match the current `tasks.md` and cannot desync.

Structure — one section per step that introduces a new/modified public interface or a testable assertion, keyed by the same integer `## Step N` as `tasks.md`:

    ## Step N: <title>

    **Interfaces**: <new or modified public signatures introduced in this step — function/method signatures, exported types, class or module public surface. Signatures only, no implementation body.>

    **Test assertions**: <the exact assertions that verify this step — expected input → expected output/behavior — each anchored to a `specs/**/*.md` requirement or scenario by path.>

Rules:
- **Omit steps with no interface surface.** A step that introduces neither a new/modified public interface nor a testable assertion (e.g. a pure config or scaffolding step) is omitted entirely — do NOT emit an empty `## Step N` section.
- **Keep signatures and assertions OUT of `tasks.md`.** They are the "detailed behavior" that `tasks.md`'s conciseness rule excludes. `tasks.md`'s `**Testing Strategy**` stays high-level *approach* prose (what kind of test, what surface it exercises); the concrete assertion values live only here. Never restate them into `tasks.md`.
- **No testing-stack section.** Do NOT add a testing-setup, stack, or `## Implementation Context` section to `interfaces.md`; the testing stack stays single-sourced in `tasks.md`'s `## Implementation Context`.
- **Self-contained.** The signature plus its anchored assertions must be sufficient to author the step's tests without reading `implementation.md`, `design.md`, or source code.

## Cost discipline reminder

Every source code line read by the main agent costs frontier-tier tokens. If you are about to `Read` a file that is not `proposal.md`, a `specs/**/*.md`, or `design.md`, STOP and delegate to a `budget-explorer` subagent instead.
