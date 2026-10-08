# Design Step — Tasks

Active step: tasks. Resolve all Open Questions, then write `tasks.md`, and report the `tasks` progress event per the worker contract.

## Open Questions gate

After writing `design.md`, review the **Open Questions** section.

For each question:
   1. **Delegate** it to a **`budget-explorer`** subagent with a precise search prompt. Do NOT search yourself.
   2. If the subagent returns a clear answer from the codebase, incorporate it into `design.md` and remove the question.
   3. If the subagent reports it cannot find the answer (not found, ambiguous, or out of scope), present the question to the user.

The presentation SHALL reference `@sai/policies/question-context.md` and comply with its anatomy: it states what is being decided (the unresolved Open Question), why it matters (no `tasks.md` step that depends on it can be planned until it is resolved), the essential state context (the change `{resolved_change_name}`, the question as recorded in `design.md` `## Open Questions`, and why research could not answer it), and plain-language options where a closed choice applies — in plain wording, without bare artifact references.

Do NOT proceed to `tasks.md` until every Open Question has been either answered by the codebase or resolved by the user. Incorporate all answers into `design.md` before continuing.

A real follow-up is not an Open Question and does not block `tasks.md` generation: it is recorded in `## Goals / Non-Goals` as a non-goal of the form "out of scope: X — revisit when Y". Conversely, a genuine unresolved unknown the design cannot proceed without is an Open Question and passes through this blocking gate.

## Generate tasks.md

**Rule of conciseness:** Each step MUST be a planning scaffold, not a restatement of requirements. Do NOT copy scenario text, field names, or detailed behavior from specs into the steps. Instead, reference the relevant spec file and describe ONLY the implementation approach and how it maps to the existing codebase.

Write to `openspec/changes/{resolved_change_name}/tasks.md`.

### File Manifest fold

When writing each step's `**Files Affected**` entries, record the exact project-root-relative paths and existence-derived change tokens (`A`/`M`/`D`/`R`). The `### File Manifest` subsection of `design.md` is produced from those entries by the deterministic `file-manifest.js` tool; you never author or hand-fold the manifest.

After `tasks.md` is fully written, Fetch @sai/policies/tool-resolution.md, resolve `file-manifest.js` by its per-harness order (including the opencode XDG fallback), and run `node <tool> fold <change-name> --json --cwd <project-root>`. The tool folds every `## Step N` section's `**Files Affected**` entries (ascending step order, file order within a step) into the target-state manifest and writes it into `design.md`'s `### File Manifest` subsection, creating the subsection beneath `### Architecture Snapshot` when it is absent. It applies these net-fold rules: one line per surviving path, `<token> <path> (Step <n>[, Step <n>]*)` or `R <src> -> <dst> (Step <n>…)`, sorted byte-wise by path (destination for `R`), a path whose net state is empty omitted, and the `None — no files affected` sentinel with its reason line when every touched path nets to nothing.

A non-zero exit is blocking and writes nothing: the tool reports each malformed entry (unknown token, missing path) or illegal transition (for example `M` after `D`) with its `tasks.md` line. Fix the `**Files Affected**` entries in `tasks.md` and re-run until it exits 0; do not edit the manifest by hand. Re-run `fold` after any later change to `tasks.md` that touches `**Files Affected**`; `node <tool> verify <change-name> --json --cwd <project-root>` is the read-only check that the persisted manifest still equals the fold.

The manifest is a concise derivative review surface, not a replacement for the authoritative per-step contracts: `tasks.md` remains authoritative for step attribution and per-step tokens, and no downstream phase parses the manifest as authoritative input. The empty-fold sentinel is independent of the Architecture Snapshot's `None — no planned public surfaces` and either boundary block's empty rendering.

IMPORTANT: Do NOT use checkbox markers (`- [ ]` or `- [x]`). This file is a planning scaffold, not a progress tracker. Implementation progress is tracked in `implementation.md`.

Structure — one numbered section per implementation step:

    ## Step N: <title>

    **Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>

    **Files Affected**: one entry per line, each starting with exactly one change-type token from the closed vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed), followed by one space and the project-root-relative path; an `R` entry carries `R <source path> -> <destination path>`. Derive each token from the file's existence at the repository state immediately before that step's commit, never from the step title or prose verb: a path that already exists is `M` even when the step prose says "add". `R` covers both pure relocation and relocation-with-rewrite; the extent of content change is carried by `**What Will Be Done**` prose, not by the token.

    **What Will Be Done**: <prose description of HOW to build it, not WHAT to build>. Reference the relevant `specs/<capability>/spec.md` by path. Do NOT restate requirements already defined there.

    **Testing Strategy**: <how correctness will be verified>

    **Existing Tests Broken**: <existing tests this step breaks, each with failure mode `compile` or `runtime`, shared/central fixtures listed first; `None` when the step breaks none>

`**Existing Tests Broken**` is the fifth and last sub-field of every `## Step N`, immediately after `**Testing Strategy**`; the first four sub-fields keep their existing relative order. Its label is pinned byte-exact — no synonym such as "Tests Affected" or "Broken Tests". It concerns **existing** tests only; new tests the step adds stay in `**Testing Strategy**` and `interfaces.md` and are never listed here. Name each affected test file by its exact repository-relative path (never a suite name: `/sai-3-implement` carries each entry into a RED block by path), and when the step breaks none, emit an explicit `None` rather than omitting the field (so a reader distinguishes "no impact" from "not analyzed"). Each named test carries exactly one failure-mode token: `compile` (the test no longer compiles or resolves — a changed signature, removed symbol, renamed type; structural, mechanical, bulk-fixable) or `runtime` (the test compiles but its assertions no longer hold; per-test judgment needed). The distinction is **effort-and-ordering** information only — both modes are resolved within the same step, and `runtime` never licenses committing with that test failing. List test-only shared infrastructure — fixtures, builders, factories, base classes, helpers used by more than one test file, never a production file — before the individual test files that depend on it. Do NOT restate assertion values or expected outputs in this field; that content lives in `interfaces.md`. These five sub-fields are the complete, closed set for a step; do not invent a sixth.

Order steps by dependency. Steps should be small enough to expand into a single `implementation.md` step group.
When a Step changes mandatory fields, constraints, or results of an existing contract, review its current consumers and shared fixtures, including runtime assertions, not only compilation references. In **Testing Strategy**, record the reviewed paths and why each needs adaptation or remains compatible. List identified adaptations under **Existing Tests Broken** using backticked exact paths, fixtures first; assign them to the same Step's RED work. `None` requires this supporting review when a contract changes. This criterion is agent-owned semantic analysis; deterministic preflight cannot prove its completeness.

Generated outputs extend **Files Affected**, not the five-field structure: use `A <directory>/<prefix>*<suffix> — generated count=<positive integer>`. The directory is an exact repository-relative directory; the family has one basename `*`, a non-empty literal prefix and suffix, and no nested wildcard. Declare only a known bounded output family. The manifest carries that declaration as a derivative, not an executable path. Apply resolves the declared family to exactly that count of regular files before close, rejects overlaps/extra/missing outputs, and commits only the resolved exact paths. Workers cannot change the declaration or widen it. Use exact `A/M/D/R` entries for all other files.

Every verify-first marker in `design.md`'s `## Risks / Trade-offs` is an ordering constraint on this sequence: the work that resolves or disproves the marked risk MUST be sequenced before the step the marker names — placed inside an earlier step or as its own earlier step, and NOT satisfied by prose alone in the gated step's `**What Will Be Done**`. Verify-first ordering composes with the dependency ordering above; where the two conflict, surface the conflict to the user rather than silently dropping either constraint.

Reference specs for what to build, design for how to build it.

### Routing derivation

Every `## Step N` MUST include a `**Routing**` line immediately after its title and before `**Files Affected**`. The line is produced deterministically from the planned file snapshot using the rubric below. A second design agent given the same `**Files Affected**` list and this rubric MUST produce the same three tokens.

- **Layer derivation** (path → token, with precedence for ambiguity): map `**Files Affected**` paths against the four `layer` pattern lists below, after stripping the leading change-type token (one letter from `A`/`M`/`D`/`R` plus the following space). An `R` entry contributes only its destination path (the path right of the ` -> ` separator), because routing describes where the step's work lands — a single-file move never flips the step's `layer` token.
  - `frontend` patterns: `src/components/`, `src/pages/`, `src/router/`, `src/store/`, `src/api-client/`, `web/`, `client/`, `mobile/`, `app/` (frontend), `pages/` (Next.js).
  - `backend` patterns: `server/`, `api/`, `services/`, `src/handlers/`, `src/repos/`, `src/models/`, `src/db/`, `src/controllers/`, `src/use-cases/`, `cmd/`, `migrations/`, `prisma/`.
  - `infra` patterns: `.github/`, `Dockerfile`, `scripts/`, `infra/`, `terraform/`, `k8s/`, harness `commands/` / `agents/` / `skills/`, and pure declarative artifacts (`*.md`, `*.json`, `*.yaml`, config files) — docs-only steps are `infra` + `config`.
  - `cross-cutting`: when paths span more than one of frontend/backend/infra in a non-trivial way or the primary layer is genuinely ambiguous.
  - **Precedence**: docs/config-only → `infra`; else if any path matches `frontend` and any matches `backend`/`infra` in a non-trivial way → `cross-cutting`; else single-layer match wins.

- **Discipline derivation** (path → token, orthogonal to layer): map `**Files Affected**` paths against the five `discipline` pattern lists below, after stripping the leading change-type token exactly as in layer derivation. An `R` entry contributes only its destination path, so a single-file move never flips the step's `discipline` token either.
  - `ui-ux` (`components/`, `views/`, `pages/` with markup, `layouts/`, `*.css`, `*.scss`, `*.less`, `*.html`, `*.mdx`, `*.astro`, `*.vue`, `*.svelte` with markup, `*.tsx`/`*.jsx` with view markup, `a11y*` files).
  - `app-code` (`src/store/`, `src/router/`, `src/api-client/`, frontend glue, frontend build configs `vite.config.*`/`webpack.config.*`/`rollup.config.*`).
  - `service` (`server/`, `api/` (code), `services/` (code), `src/handlers/`, `src/controllers/`, `src/use-cases/`, `cmd/`, `*Handler*`, `*Service*` (code), `*Controller*`, `*UseCase*`, `*Job*`, `*Worker*`, `*Queue*`).
  - `data` (`src/repos/`, `src/models/`, `src/db/`, `migrations/`, `schemas/`, `prisma/`, `*.sql`, `*Repo*`, `*Model*`, `*Dao*`, `*Entity*`).
  - `config` (`*.json`, `*.yaml`, `*.yml`, `*.toml`, `*.env`, `*.ini`, `*.properties`, `docs/**/*.md` (docs-only), `README.md`, `CHANGELOG*`, declarative `*.config.{js,ts}`).
  - **Precedence for mixed files**: pick the discipline of the majority of non-config files; if tied or ambiguous, pick the discipline that matches the step's primary intent and add a parenthetical justification.
  - **Closed vocabularies**: `layer` and `discipline` each take only the tokens listed above. When a step fits none of them, pick the closest listed token (for `layer`, `cross-cutting` is also valid) and flag the gap in `design.md` Open Questions.

- **Complexity derivation** (coarse three-tier judgment over the planned file snapshot):
  - `low` — single file, single concern, no cross-module impact.
  - `medium` — multiple files in the same layer, or one file with cross-module impact.
  - `high` — cross-layer, architectural, touches public APIs, breaking schema change, multi-repo coordination, or introduces a new dependency.
  - The token is emitted once and not revised by the design agent; `sai-3-implement` MAY split, merge, or otherwise refine the step in `implementation.md` without re-tagging `tasks.md`.

- **Parenthetical audit note**: an optional one-line `(... )` MAY follow the three key=value pairs; the parser MUST ignore anything from the first `(` onward. Encourage one short justification per line for audit.

- **Prose-precedence-over-table rule**: the pattern tables above are a convenience, not a closed matcher. When a `**Files Affected**` path matches no table entry but the file's nature fits a discipline's prose definition (e.g. `sai/commands/**/instructions.md` is "markdown documentation outside a UI surface" per the `config` prose, though no table row names that path), the prose definition wins. Flag the path-class gap in `design.md` Open Questions if it recurs across multiple changes (suggest a future table amendment), but do not block the current step on it.

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

  The checklist reasons over **all** compilation units in the snapshot, not production code alone. A step's `**Files Affected**` lists every file the step creates, modifies, or deletes, tests included: the production and test files its RED and GREEN work will write, the files it retires, and the existing test files that reference a contract the step changes (a step that changes a signature, removes an exported symbol, or renames a public API treats those tests as affected files on the same terms as production callers). `/sai-4-apply` compares each step's changed files with this list, and `/sai-3-implement` reports any path its plan names that the list omits. A snapshot that leaves any test compilation unit unbuildable is not a valid commit boundary even when all production code compiles, and a boundary never leaves the suite red — both breakage modes (tests that no longer **compile**, and tests that compile but whose **assertions** no longer hold) are resolved within the same step. The `compile` / `runtime` distinction recorded by `**Existing Tests Broken**` (Step N field) is therefore effort-and-ordering information, NOT a boundary-validity discriminator: both modes block the boundary until resolved.

After all implementation steps, end the file with these two mandatory sections in order:

1. `## Required Documentation` — list every implementation-relevant project file consulted during design. Use all `budget-explorer` reports and project artifacts read directly by the design worker, including the proposal, specs, and `SAI_LEARNINGS.md` when consulted; include every spec file that the steps reference (both change delta specs under `openspec/changes/{change-name}/specs/**` and consulted main specs under `openspec/specs/**`). The subsections are ordered `### Spec files`, then `### Local files`, then `### External URLs`; no path or URL is listed twice (every spec, whether delta or main, lives only under Spec files, never duplicated in Local files):
    - `### Spec files`: one path per line to every `specs/**/*.md` consulted (change delta and main specs alike). Do NOT leave empty. Do NOT include notes.
    - `### Local files`: one entry per line in the form `<path> — <note>`, where the note is one short sentence (about 20 words at most) stating why this resource matters for implementing the change — for a file, e.g. pattern to imitate, caller of what changes, reusable fixture; for any resource, a role example. A resource with several roles gets one note naming them all. The note contains no code or snippets and does not restate requirements. It is derived from the `budget-explorer` report or consulted documentation and never invented. A resource consulted but with no implementation role stays listed with a note saying so (e.g. "context only"). Use whole-file paths only (no line ranges). Write `None` if empty.
    - `### External URLs`: one entry per line in the form `<URL> — <note>`, where the note is one short sentence (about 20 words at most) stating why this resource matters — which API or version-specific behavior to consult there. A URL with multiple roles gets one note naming them all. The note contains no code or snippets and does not restate requirements. It is derived from design research and never invented. A consulted URL with no implementation role stays listed with a note saying so (e.g. "context only"). Write `None` if empty.
    - Do NOT leave any subsection empty or omit it. The separator between path/URL and note is exactly ` — ` (space, em dash, space).

 2. `## Implementation Context` — derive all four fields from actual codebase research, not from the change description. When a project-root `SAI_LEARNINGS.md` exists, Fetch @sai/policies/sai-learnings-format.md first (only in this case, never when the file is absent). It is then a **second source** for the first three fields, merged per the per-field rules below; when it does not exist, skip the merge silently — no warning, no prompt, no halt. The merge is additive to codebase research and never a replacement for it: a populated `SAI_LEARNINGS.md` SHALL NOT be accepted as a substitute for research in any field and SHALL NOT license placeholder content anywhere in the section. The section keeps its shape exactly — four fields, **Conventions** capped at 2–5 bullets, **Test Command** a sibling outside that quota.
    - `**Stack**`: primary language/framework + key versions relevant to this change. Merges field-to-field from the learnings **Stack** section with no reshaping of entry content.
    - `**Conventions**`: 2–5 project-specific, non-obvious bullets observed in the actual codebase (naming, file organization, error handling, testing idioms). Generic best-practices ("follow SOLID", "write clean code") are NOT acceptable. Merges field-to-field from the learnings **Conventions** section, with a deterministic precedence inside the quota: research-derived bullets are placed **first**, merged bullets fill the remaining slots up to five in the order they appear in the file, and merged bullets are the ones dropped when the two sources together exceed the cap. A research-derived bullet SHALL NOT be dropped to admit a merged bullet, and the cap SHALL NOT be exceeded to accommodate both. A merged bullet that duplicates a research-derived bullet is treated as already present and consumes no slot.
    - `**Avoid**`: anti-patterns the implementation agent might default to given the declared stack. Merges field-to-field from the learnings **Avoid** section with no reshaping.
    - `**Test Command**`: the exact command that runs this project's test suite, directly executable from the project root by a subagent that has read neither `implementation.md` nor `design.md`. Where the runner supports scoping a run to a subset of tests, also carry the project's scoping idiom in **parameterised** form — the concrete flag and the concrete test-project/path argument, with a substitutable placeholder for the test identifier (e.g. `dotnet test tests/<Project> --filter FullyQualifiedName~<TestName>`); do NOT pin a specific Step's filter value. When the project has no test runner at all, write the explicit sentinel `None — no test runner in this project` (a researched finding, not placeholder text). This field is a sibling of the three above and sits **outside** the **Conventions** 2–5 bullet quota — a run command is an infrastructure fact, not a project-specific convention. **Test Command SHALL NOT be populated by a field-to-field merge.** Write it from your own research and use the learnings **Test Command** section only as corroboration: when the two agree, write the researched value; when they disagree, write the researched value and surface the disagreement per the contradiction notice below. When any value is taken from that section, take **only the command line** — never the `*Observed:*` provenance line, a bullet marker, or a key prefix — because this field is injected verbatim into the blind test-writer dispatch and any such syntax would render it non-executable.

   **Precedence.** Where a learnings entry and fresh research disagree about the same repo-level artifact, prefer what you observe in the current codebase: the learnings entry records what was true when it was written.

   **Contradiction notice.** When you prefer a freshly-researched value over a `SAI_LEARNINGS.md` entry concerning the same repo-level artifact, surface the disagreement to the user as a printed notice naming the entry's key, the recorded value, and the researched value. Print nothing when there is no such disagreement. The notice is **printed output only**: `/sai-2-design` SHALL NOT edit, delete, or rewrite `SAI_LEARNINGS.md`, and this rule grants it no write authority over that file — it remains writable only by the `/sai-4-apply` coordinator's promotion pass. The notice exists because supersede-by-key alone cannot reach a class of stale entries: promotion fires only from a deviation, a deviation is an execution failure, and a correct value in `## Implementation Context` is precisely what prevents that failure — so an entry corrected at design time may never be re-observed at apply time. The notice hands the human the one signal needed to prune it, without granting delete authority to any phase.

Both sections are mandatory. They must contain real content derived from research, not placeholder text.
