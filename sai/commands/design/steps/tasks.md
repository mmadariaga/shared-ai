# Design Step — Tasks

Active step: tasks. Resolve all Open Questions, then write `tasks.md`, and report the `tasks` progress event per the worker contract.

## Open Questions gate

After writing `design.md`, review the **Open Questions** section.

For each question:
   1. **Delegate** it to a **`budget-explorer`** subagent with a precise search prompt. Do NOT search yourself.
   2. If the subagent returns a clear answer from the codebase, incorporate it into `design.md` and remove the question.
   3. If the subagent reports it cannot find the answer (not found, ambiguous, or out of scope), present the question to the user.

The presentation SHALL reference `@sai/policies/question-context.md` and comply with its anatomy: it states what is being decided (the unresolved Open Question), why it matters (no `tasks.md` step that depends on it can be planned until it is resolved), the essential state context (the change `$ARGUMENTS`, the question as recorded in `design.md` `## Open Questions`, and why research could not answer it), and plain-language options where a closed choice applies — in plain wording, without bare artifact references.

Do NOT proceed to `tasks.md` until every Open Question has been either answered by the codebase or resolved by the user. Incorporate all answers into `design.md` before continuing.

`## Deferred` items are NOT Open Questions: they are not delegated to a `budget-explorer` subagent and do not block `tasks.md` generation — they are carried forward unresolved. Conversely, an item that is genuinely an unresolved unknown the design cannot proceed without is an Open Question and passes through this blocking gate; it is not parked in `## Deferred` to escape the gate.

## Generate tasks.md

**Rule of conciseness:** Each step MUST be a planning scaffold, not a restatement of requirements. Do NOT copy scenario text, field names, or detailed behavior from specs into the steps. Instead, reference the relevant spec file and describe ONLY the implementation approach and how it maps to the existing codebase.

Write to `openspec/changes/$ARGUMENTS/tasks.md`.

IMPORTANT: Do NOT use checkbox markers (`- [ ]` or `- [x]`). This file is a planning scaffold, not a progress tracker. Implementation progress is tracked in `implementation.md`.

Structure — one numbered section per implementation step:

    ## Step N: <title>

    **Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>

    **Files Affected**: one entry per line, each starting with exactly one change-type token from the closed vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed), followed by one space and the project-root-relative path; an `R` entry carries `R <source path> -> <destination path>`. Derive each token from the file's existence at the repository state immediately before that step's commit, never from the step title or prose verb: a path that already exists is `M` even when the step prose says "add". `R` covers both pure relocation and relocation-with-rewrite; the extent of content change is carried by `**What Will Be Done**` prose, not by the token.

    **What Will Be Done**: <prose description of HOW to build it, not WHAT to build>. Reference the relevant `specs/<capability>/spec.md` by path. Do NOT restate requirements already defined there.

    **Testing Strategy**: <how correctness will be verified>

    **Existing Tests Broken**: <existing tests this step breaks, each with failure mode `compile` or `runtime`, shared/central fixtures listed first; `None` when the step breaks none>

`**Existing Tests Broken**` is the fifth and last sub-field of every `## Step N`, immediately after `**Testing Strategy**`; the first four sub-fields keep their existing relative order. Its label is pinned byte-exact — no synonym such as "Tests Affected" or "Broken Tests". It concerns **existing** tests only; new tests the step adds stay in `**Testing Strategy**` and `interfaces.md` and are never listed here. Name the affected test files or suites concretely, and when the step breaks none, emit an explicit `None` rather than omitting the field (so a reader distinguishes "no impact" from "not analyzed"). Each named test carries exactly one failure-mode token: `compile` (the test no longer compiles or resolves — a changed signature, removed symbol, renamed type; structural, mechanical, bulk-fixable) or `runtime` (the test compiles but its assertions no longer hold; per-test judgment needed). The distinction is **effort-and-ordering** information only — per `atomic-commit-planning` both modes are resolved within the same step, and `runtime` never licenses committing with that test failing. List shared or central infrastructure — fixtures, builders, factories, base classes, helpers used by more than one test file — before the individual test files that depend on it. Do NOT restate assertion values or expected outputs in this field; that content lives in `interfaces.md`. These five sub-fields are the complete, closed set for a step; do not invent a sixth.

Order steps by dependency. Steps should be small enough to expand into a single `implementation.md` step group.

Every verify-first marker in `design.md`'s `## Risks / Trade-offs` is an ordering constraint on this sequence: the work that resolves or disproves the marked risk MUST be sequenced before the step the marker names — placed inside an earlier step or as its own earlier step, and NOT satisfied by prose alone in the gated step's `**What Will Be Done**`. Verify-first ordering composes with the dependency ordering above; where the two conflict, surface the conflict to the user rather than silently dropping either constraint.

Reference specs for what to build, design for how to build it.

### Routing derivation

Every `## Step N` MUST include a `**Routing**` line immediately after its title and before `**Files Affected**`. The line is produced deterministically from the planned file snapshot using the rubric below. A second design agent given the same `**Files Affected**` list and this rubric MUST produce the same three tokens.

- **Layer derivation** (path → token, with precedence for ambiguity): map `**Files Affected**` paths against the four `layer` enumerations in `tasks-routing-metadata`, after stripping the leading change-type token (one letter from `A`/`M`/`D`/`R` plus the following space). An `R` entry contributes only its destination path (the path right of the ` -> ` separator), because routing describes where the step's work lands — a single-file move never flips the step's `layer` token.
  - `frontend` patterns: `src/components/`, `src/pages/`, `src/router/`, `src/store/`, `src/api-client/`, `web/`, `client/`, `mobile/`, `app/` (frontend), `pages/` (Next.js).
  - `backend` patterns: `server/`, `api/`, `services/`, `src/handlers/`, `src/repos/`, `src/models/`, `src/db/`, `src/controllers/`, `src/use-cases/`, `cmd/`, `migrations/`, `prisma/`.
  - `infra` patterns: `.github/`, `Dockerfile`, `scripts/`, `infra/`, `terraform/`, `k8s/`, harness `commands/` / `agents/` / `skills/`, and pure declarative artifacts (`*.md`, `*.json`, `*.yaml`, config files) — docs-only steps are `infra` + `config`.
  - `cross-cutting`: when paths span more than one of frontend/backend/infra in a non-trivial way or the primary layer is genuinely ambiguous.
  - **Precedence**: docs/config-only → `infra`; else if any path matches `frontend` and any matches `backend`/`infra` in a non-trivial way → `cross-cutting`; else single-layer match wins.

- **Discipline derivation** (path → token, orthogonal to layer): map `**Files Affected**` paths against the five `discipline` enumerations in `tasks-routing-metadata`, after stripping the leading change-type token exactly as in layer derivation. An `R` entry contributes only its destination path, so a single-file move never flips the step's `discipline` token either.
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

- **Prose-precedence-over-table rule**: the pattern tables above are a convenience, not a closed matcher. When a `**Files Affected**` path matches no table entry but the file's nature fits a discipline's prose definition (e.g. `sai/commands/**/instructions.md` is "markdown documentation outside a UI surface" per the `config` prose, though no table row names that path), the prose definition wins. Flag the path-class gap in `design.md` Open Questions if it recurs across multiple changes (suggest a future table amendment), but do not block the current step on it.

Reference `openspec/changes/tasks-routing-metadata/specs/tasks-routing-metadata/spec.md` (the enum + derivation sources) and `openspec/changes/tasks-routing-metadata/specs/tasks-scaffold-format/spec.md` (the step-structure and position contract).

### Commit atomicity constraints

Each `## Step N` becomes a single commit, so every step MUST leave the repository in a state that compiles, typechecks, and builds on its own. Apply these constraints while emitting steps — they are static planning-time reasoning over the planned file snapshot. The design phase never executes a real build; it reasons about code that does not yet exist.

- **Every step is a buildable boundary.** If a candidate step cannot be reasoned as buildable on its own (combined with all previously committed files), merge it forward into subsequent steps until the combined snapshot is buildable. Never plan a step that depends on a *later* step to restore a building state.
- **Group contract-breaking changes atomically.** When a step changes a function signature, removes an exported symbol, renames a public API, or alters any contract other files depend on, list every affected file — callers, consumers, and re-exporters — under the same `**Files Affected**`. Such a change MUST NOT be a standalone step that relies on a later step to fix broken references.
- **Never cite lint as proof a boundary is safe.** Lint (Biome, ESLint, …) runs per-file and does not resolve cross-file types, so it cannot confirm a snapshot typechecks. A boundary is valid only if a full typecheck/build would pass against the exact committed snapshot.
- **Verification checklist** — reason through each item against the planned snapshot before designating a step a commit point:
  - No calls to functions with outdated signatures.
  - No imports of removed or renamed symbols.
  - No references to APIs that have been relocated or deleted.
  - No missing implementations of interfaces or abstract contracts introduced in this or a prior step of the same batch.
  - No test compilation unit left uncompilable — test projects, test assemblies, and test source sets are subject to every item above exactly as production code is.

  If any item fails, expand or merge the step with adjacent steps until the checklist passes for the combined snapshot.

  The checklist reasons over **all** compilation units in the snapshot, not production code alone. A step that changes a signature, removes an exported symbol, or renames a public API treats existing test files that reference that contract as affected files on the same terms as production callers, listing them under the step's `**Files Affected**`. A snapshot that leaves any test compilation unit unbuildable is not a valid commit boundary even when all production code compiles, and a boundary never leaves the suite red — both breakage modes (tests that no longer **compile**, and tests that compile but whose **assertions** no longer hold) are resolved within the same step. The `compile` / `runtime` distinction recorded by `**Existing Tests Broken**` (Step N field) is therefore effort-and-ordering information, NOT a boundary-validity discriminator: both modes block the boundary until resolved.

After all implementation steps, end the file with these two mandatory sections in order:

1. `## Required Documentation` — list every file consulted during design. **Populate this entirely from the `budget-explorer` subagent's report**. Also list every spec file that the steps reference:
    - `### Local files`: one path per line; use line ranges (e.g., `path/to/file.md:10-50`) when only a portion applies; write `None` if empty.
    - `### Spec files`: one path per line to every `specs/**/*.md` consulted. Do NOT leave empty.
    - `### External URLs`: one URL per line; write `None` if empty.
    - Do NOT leave either subsection empty or omit it.

 2. `## Implementation Context` — derive all four fields from actual codebase research, not from the change description. When a project-root `SAI_LEARNINGS.md` exists (format: `sai/policies/sai-learnings-format.md`), it is a **second source** for the first three fields, merged per the per-field rules below; when it does not exist, skip the merge silently — no warning, no prompt, no halt. The merge is additive to codebase research and never a replacement for it: a populated `SAI_LEARNINGS.md` SHALL NOT be accepted as a substitute for research in any field and SHALL NOT license placeholder content anywhere in the section. The section keeps its shape exactly — four fields, **Conventions** capped at 2–5 bullets, **Test Command** a sibling outside that quota.
    - `**Stack**`: primary language/framework + key versions relevant to this change. Merges field-to-field from the learnings **Stack** section with no reshaping of entry content.
    - `**Conventions**`: 2–5 project-specific, non-obvious bullets observed in the actual codebase (naming, file organization, error handling, testing idioms). Generic best-practices ("follow SOLID", "write clean code") are NOT acceptable. Merges field-to-field from the learnings **Conventions** section, with a deterministic precedence inside the quota: research-derived bullets are placed **first**, merged bullets fill the remaining slots up to five in the order they appear in the file, and merged bullets are the ones dropped when the two sources together exceed the cap. A research-derived bullet SHALL NOT be dropped to admit a merged bullet, and the cap SHALL NOT be exceeded to accommodate both. A merged bullet that duplicates a research-derived bullet is treated as already present and consumes no slot.
    - `**Avoid**`: anti-patterns the implementation agent might default to given the declared stack. Merges field-to-field from the learnings **Avoid** section with no reshaping.
    - `**Test Command**`: the exact command that runs this project's test suite, directly executable from the project root by a subagent that has read neither `implementation.md` nor `design.md`. Where the runner supports scoping a run to a subset of tests, also carry the project's scoping idiom in **parameterised** form — the concrete flag and the concrete test-project/path argument, with a substitutable placeholder for the test identifier (e.g. `dotnet test tests/<Project> --filter FullyQualifiedName~<TestName>`); do NOT pin a specific Step's filter value. When the project has no test runner at all, write the explicit sentinel `None — no test runner in this project` (a researched finding, not placeholder text). This field is a sibling of the three above and sits **outside** the **Conventions** 2–5 bullet quota — a run command is an infrastructure fact, not a project-specific convention. **Test Command SHALL NOT be populated by a field-to-field merge.** Write it from your own research and use the learnings **Test Command** section only as corroboration: when the two agree, write the researched value; when they disagree, write the researched value and surface the disagreement per the contradiction notice below. When any value is taken from that section, take **only the command line** — never the `*Observed:*` provenance line, a bullet marker, or a key prefix — because this field is injected verbatim into the blind test-writer dispatch and any such syntax would render it non-executable.

   **Precedence.** Where a learnings entry and fresh research disagree about the same repo-level artifact, prefer what you observe in the current codebase: the learnings entry records what was true when it was written.

   **Contradiction notice.** When you prefer a freshly-researched value over a `SAI_LEARNINGS.md` entry concerning the same repo-level artifact, surface the disagreement to the user as a printed notice naming the entry's key, the recorded value, and the researched value. Print nothing when there is no such disagreement. The notice is **printed output only**: `/sai-2-design` SHALL NOT edit, delete, or rewrite `SAI_LEARNINGS.md`, and this rule grants it no write authority over that file — it remains writable only by the `/sai-4-apply` coordinator's promotion pass. The notice exists because supersede-by-key alone cannot reach a class of stale entries: promotion fires only from a deviation, a deviation is an execution failure, and a correct value in `## Implementation Context` is precisely what prevents that failure — so an entry corrected at design time may never be re-observed at apply time. The notice hands the human the one signal needed to prune it, without granting delete authority to any phase.

Both sections are mandatory. They must contain real content derived from research, not placeholder text.
