## Approval gate

Confirm `openspec/changes/$ARGUMENTS/proposal.md` exists AND at least one file matching `openspec/changes/$ARGUMENTS/specs/**/*.md` exists. If either is missing, STOP and print: "Change '$ARGUMENTS' not found or has no specs. Run /sai-1-spec to create it first."

Invoking `/sai-2-design` IS the approval: `sai-1-spec` closes with a feedback loop over `proposal.md` and `specs/**` and a mandatory stop instructing the user to review them before running this command. Do NOT ask the user to confirm the approval; there is no interactive decline path at this gate.

Once the precondition above passes, stamp the approval automatically by writing the following fields to `openspec/changes/$ARGUMENTS/.openspec.yaml`, MERGING into the existing file content (preserve any existing top-level keys such as `schema:` and `created:` verbatim — do NOT truncate or rewrite the whole file):

- `approval.specs.approved_at`: current UTC timestamp in ISO 8601 format (e.g. `2026-05-17T14:30:00Z`) — written ONLY when the key is absent or its value is empty. When it is already present and non-empty, leave the existing timestamp untouched, so re-invoking `/sai-2-design` on an already designed change never overwrites the original stamp.
- `approval.specs.notes`: the empty string, written unconditionally on every invocation, so the block shape is stable for any reader.

If the write to `.openspec.yaml` fails, STOP with an explicit failure message naming the file and the error. Never continue to generation with the stamp unwritten.

## Collaboration Style

- Treat the user as a **knowledgeable peer**, not as a requester. They have deep domain expertise and more project context than you. Adjust language accordingly.
- The user may not have fully specified the task upfront — engage in dialogue to uncover the full picture before committing. **Ask questions rather than making assumptions.**
- When multiple valid approaches exist, **discuss trade-offs explicitly with the user** before choosing a direction.
- Prioritize **shared understanding of the WHY**. Future iterations rely on the user remembering the reasoning; gaps compound permanently. Explain non-obvious decisions concisely but clearly.
- When trade offs are discussed, propose **up to 2 concrete scenarios** that probe edge cases. Wait for user feedback before continuing.

## Generation Instructions

Generate `design.md`, `tasks.md`, and `interfaces.md` for change `$ARGUMENTS` as the default outputs. `proposal.md` and `specs/**` may be amended in place only when a spec problem is discovered during design, clarity on the fix is present, and the user explicitly consents — never by default.

### Spec-problem handling during design

While generating design artifacts, if you discover a problem in `proposal.md` or any `specs/**/*.md` (for example: a requirement that contradicts the codebase, a missing or wrong scenario, an internally inconsistent spec, or a spec-vs-source contradiction), classify your clarity on the fix before proceeding:

- **Clarity present** — you can state the exact text to change and the exact replacement, grounded in the proposal, the specs, and any codebase facts already gathered. Present to the user: (1) the discovered problem, (2) the concrete diff to `proposal.md` and/or the affected `specs/**/*.md` file(s), and (3) a closed-choice offer between applying the patch **in place** and routing to `/sai-1-spec`, per the closed-choice-prompts convention in `sai/policies/remember.md`. Never apply the amendment by default; wait for the user's explicit selection.
  - If the user selects **in place**: apply exactly the presented patch, then write `approval.specs.amendment.{at, notes}` to `openspec/changes/$ARGUMENTS/.openspec.yaml`, merging into the existing file content and preserving all prior top-level keys (including `schema:`, `created:`, `approval.specs.approved_at`, and `approval.specs.notes`) verbatim — do NOT truncate or rewrite the whole file. Then continue generating design artifacts from the amended specs.
  - If the user selects **route to `/sai-1-spec`** (or any non-in-place response): do NOT modify `proposal.md` or `specs/**`, do NOT write an amendment audit entry, and direct the user to re-run `/sai-1-spec` to make the correction in a fresh spec pass.

- **Clarity absent** — you cannot determine the correct amendment (for example, a spec-vs-codebase contradiction where you cannot tell which side is stale, or a fundamentally wrong spec you cannot safely patch). Route the user to `/sai-1-spec` directly. Do NOT offer an in-place amendment and do NOT modify `proposal.md` or `specs/**`.

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
- **Decisions**: key technical choices. Fetch @sai/policies/adr-ddr-criteria.md and evaluate every decision against the three ADR/DDR criteria it defines. If all three apply, document alternatives-considered and rationale for the chosen approach, and resolve the decision's record family by the ordered routing test defined in that policy. The resolved family is emitted here as the pinned sub-field `**Record family**: adr|ddr` (the label is byte-exact so two independent design runs emit the same parseable token).
  Additionally, every Decision — including ones you consider obvious — carries a **provenance marker**, emitted as the pinned sub-field `**Provenance**: <token>` drawn from a closed, total set of three tokens: `user` (the user stated or chose it), `codebase-forced` (the existing stack or an external dependency leaves no alternative), `derived` (you reasoned to it with no external constraint forcing it). When more than one token applies, emit the single highest-precedence one under `user` > `codebase-forced` > `derived`; a mixed-provenance decision is resolved by precedence, is never raised as an Open Question, and never blocks `tasks.md` generation. Never invent a fourth token. The marker signals what is re-litigable downstream: a `derived` decision may be reopened by a reviewer on reasoning alone; a `user` decision is not reversed by any downstream phase without the user (route back to them instead); a `codebase-forced` decision reopens only on a codebase fact that contradicts the stated constraint. The marker is **independent of the three ADR/DDR criteria** — a decision is still evaluated against them regardless of which token it carries. Provenance is a recorded authoring discipline: no validator, tool, gate, or downstream phase verifies a marker's accuracy, and this instruction claims no such enforcement. The `**Provenance**` label is pinned byte-exact so two independent design runs emit the same parseable token; this label pinning is an instruction-level tightening that `openspec/specs/design-decision-provenance/spec.md` permits but does not itself mandate.
- **Risks / Trade-offs**: known limitations; format: [Risk] → Mitigation. A risk MAY carry an optional **verify-first marker** — the pinned parenthetical `(**Verify-first**: Step N)` placed immediately after the risk text and before `→ Mitigation:` — naming, by its integer `Step N`, a step whose design depends on the risk being resolved or disproven first. The marker MUST cite a concrete `Step N`; unanchored ordering phrases such as "early" or "before implementation" are rejected. The marker is optional: a risk with no ordering dependency carries none and emits no placeholder. A verify-first risk is a known risk with a known resolution point — it is NEVER treated as an Open Question or routed through the blocking Open Questions gate. The `**Verify-first**` label is pinned byte-exact for the same parseability reason as `**Provenance**`, an instruction-level tightening that `openspec/specs/design-risk-ordering/spec.md` permits but does not itself mandate.
- **Migration Plan**: deploy steps, rollback strategy (if applicable)
- **Open Questions**: outstanding unknowns to resolve
- **Deferred**: decisions the change *could* have made and deliberately postponed, each of which gets more expensive to make the longer it waits — NOT general non-goals (no rising cost) and NOT unresolved unknowns (those are Open Questions). Every item states two parts: a concrete **cost of postponing** (what accumulates or must be reworked later — never a generic "harder later") and a **recommendation** (your position on what to decide and roughly when, framed as a recommendation, not a decision already taken). An item missing either part is not emitted. When nothing is deferred, emit the section with an explicit `None`.
- **Manual Verification** (the closing section of `design.md` — always emitted last): the checks that are cheap to perform by hand and expensive to encode as automated tests. It names the *middle tier* of a three-tier verification vocabulary — automated tests, manual checks, downstream `/sai-5-review` — and holds neither a check automatable as an ordinary test at reasonable cost (that belongs in a step's `**Testing Strategy**` and `interfaces.md`) nor anything already within `/sai-5-review`'s scope. Cover two check classes, each emitted only when the change makes it applicable: **generated-artifact drift** (migrations, test snapshots, designer/tool-generated files, lockfiles, committed build output — still in sync with their source after the change) and **end-to-end smoke** (the shortest manual path through the changed behavior that confirms the pieces connect). Each item names what to check and what a correct result looks like — never an unanchored "verify it works". When a change warrants no manual check, emit the section with an explicit `None` and a one-line reason, so a reader distinguishes "nothing to check" from "not considered".

Reference `proposal.md` for motivation, `specs/**/*.md` for requirements.

### Target State (authored first in design.md)

`design.md` SHALL begin with a `## Target State` section — authored and persisted by the design phase as the authoritative source for the change's finished-shape snapshot — before `## Context` and the other design sections; `interfaces.md` begins directly with its first `## Step N` section, with no `## Target State` section and no snapshot or manifest subsection. The `change-overview.md` projection reads this section from `design.md`; the overview SHALL NOT author the snapshot content itself.

`## Target State` SHALL present the finished shape the change converges on as **one concrete artifact** — not a per-step narrative and not a restatement of the change's motivation. Interpret "finished shape" by what the change produces: for code changes, the resulting payload, public signature, schema, file layout, or config shape as it will exist after the last step; for prose, instruction, or documentation changes, the resulting section and field structure of each document the change touches, as it will read after the last step. The section SHALL be written so a reader who reads only `## Target State` knows what the repository looks like when the change is complete, without reading any `## Step N` section. When a change genuinely produces no finished shape expressible under either interpretation, emit `## Target State` with an explicit `None` and a one-line reason — never silently omit it.

Directly beneath `## Target State`, emit exactly two subsections, in order: `### Architecture Snapshot` and `### File Manifest`. No other subsection SHALL be emitted inside `## Target State`, and the two subsections SHALL NOT be reordered.

`### Architecture Snapshot` is a concise derivative review surface, not a replacement for the authoritative per-step contracts. When at least one planned public surface exists, emit exactly two ordered nested blocks beneath it: `#### External Surfaces` first, followed by `#### Internal Public Surfaces`. These nested blocks are internal structure under `### Architecture Snapshot`, not additional `###` siblings, and no third `###` subsection or separate Endpoint Map block, table, or announcement is emitted.

Classify a surface as external when it is consumable by callers, users, or integrations outside the repository's controlled caller boundary. Classify a surface as internal public when it is intentionally public but its callers are constrained to the repository or to the controlled change. When the boundary is unclear, default to `External Surfaces`.

When planned, the external inventory directly SHALL inventory externally consumable typed commands, produced artifact formats, installed file layout, and other public promises, including classes, interfaces, and methods with uncontrolled callers. The internal inventory SHALL inventory controlled-caller internal public classes, interfaces, and methods and other internal public surfaces. List each surface once with its project-root-relative path or owning location and concise portable-ASCII relationships or flow. Do not duplicate every `File Manifest` entry, use absolute paths, or invent file entries as substitutes for surfaces. Endpoint-like promises belong in `External Surfaces`; do not author a separate Endpoint Map block, table, or announcement.

If neither boundary has a planned public surface, emit no nested headings and emit exactly `None — no planned public surfaces` followed by one explanatory line. If one boundary is empty while the other is non-empty, emit both nested blocks in order and use `None — no planned externally consumable surfaces` under `#### External Surfaces` or `None — no planned internal public surfaces` under `#### Internal Public Surfaces`, as applicable. Keep these snapshot renderings independent from `### File Manifest`'s `None — no files affected` sentinel.

The matching `## Step N` sections in `interfaces.md` remain authoritative for attribution, signatures, and exact test assertions; grouping in the snapshot is review classification only and must not override or silently replace those contracts.

Directly beneath `### Architecture Snapshot`, emit a `### File Manifest` subsection: a flat, git-status-style list with exactly one line per file the change creates, modifies, deletes, or renames, produced by a deterministic **net fold** over the per-step `**Files Affected**` entries of the same change's `tasks.md` — the `A`/`M`/`D`/`R` tokens and the `R <src> -> <dst>` form defined by the `tasks-scaffold-format` capability. The manifest is a target-state view: one path, one line, never a concatenation of per-step entries for the same path.

Process `## Step N` sections in ascending step order and, within a step, its `**Files Affected**` entries in file order. State is keyed by path; each path accumulates a state of `(net token, touched steps)`, seeded empty — empty covering both paths never touched and paths whose earlier touches netted to ∅ — and transitions exactly as the following table. A rename migrates the accumulator entry to the destination path key and leaves on the source path key a moved-away marker recording whether the source path existed at the change baseline: a source whose state before the rename was `A`, or a prior rename's destination, did not exist at the baseline; a source whose state was `M` or (empty) existed at it. The marker decides the token a later resurrection of the source path folds to. A resurrection dissolves the rename line: the destination then emits `A <dst>` on its own arc, because no rename survives when the source path exists at target state:

| prior net | incoming token | new net |
|-----------|----------------|---------|
| (empty, or ∅) | `A` | `A` |
| (empty) | `M` | `M` |
| (empty) | `D` | `D` |
| (empty, or ∅) | `R` | `R <src> -> <dst>` — the rename merge; the destination is new to the change and the source is not resurrected later |
| `A` | `M` | `A` |
| `A` | `D` | ∅ — the path is omitted from the manifest |
| `A` | `R` | `A <dst>` — the change-created file lives at the destination |
| `M` | `M` | `M` |
| `M` | `D` | `D` |
| `M` | `R` | `R <src> -> <dst>` |
| `D` | `A` | `M` — the path existed before the change and exists after it |
| `D` | `R` (as destination) | no merge — the destination existed at the change baseline: the arcs emit `D <src>` and `M <dst>` |
| `R` (moved away; source existed at baseline) | `A` | `M <src>`, and the rename dissolves into `A <dst>` |
| `R` (moved away; source created by this change) | `A` | `A <src>`, and the rename dissolves into `A <dst>` |
| `R` | `M` | `R <src> -> <dst>` (a target-state view records where the file lands; the extent of the content change is carried by the step's `**What Will Be Done**` prose, per the `R`-token convention of `tasks.md`) |
| `R` | `D` | `D <src>` — the composite dissolves; the deletion of the baseline path is the only fact that survives |
| `R` | `R` | `R <state src> -> <incoming dst>` — a second rename collapses to the existing state's source and the incoming token's destination; the intermediate path appears nowhere |

The existence-based token derivation of `tasks-scaffold-format` constrains the reachable pairs to exactly the table above: a path absent at a step's baseline is touched only by `A` or as the destination of an `R`; a path present at a step's baseline is never `A` and is touched only by `M`, `D`, `R`, or as the source of an `R`.

A path whose **final** state is ∅ does NOT appear in the manifest, even though it appears in `tasks.md`; an intermediate ∅ (created and deleted, later recreated or renamed onto) does not suppress the path's later line. The final-∅ case is the only asymmetry between the two surfaces: every other touched path appears in both.

Every step whose entry folds into a line is recorded in that line's step-attribution list, in ascending step order — the list names every touching step, not only the step that fixes the net token, so a net-`M` path first touched in Step 2 and modified again in Step 5 reads `(Step 2, Step 5)`, never `(Step 5)` alone. A rename entry contributes its source arc to the source path's line and its destination arc to the destination path's line. When the rename dissolves or collapses, the surviving line(s) carry the rename entry's steps alongside the follow-on entry's steps: `R` + `D` emits `D <src>` carrying the rename step and the deletion step; `R` + `A` emits `A <dst>` carrying the rename step, and the resurrected-source line carries the source-arc steps other than the rename step; `R` + `R` collapses with every rename step carried.

Each line uses the form `<net token> <path> (Step <n>[, Step <n>]*)` — exactly one space between the token and the path, exactly one space before the opening parenthesis, comma-plus-space between step numbers — and a renamed line uses `R <src> -> <dst> (Step <n>…)` with exactly one space on either side of the ` -> ` separator. Do NOT column-align or pad lines.

Sort lines lexicographically by their path — for `R` lines, the destination path (the path right of the ` -> ` separator) — in byte-wise ASCII/UTF-8 code-point order (the reproducible collation; case-insensitive order would diverge on mixed-case path pairs), reusing the destination-only convention of the routing derivation.

The manifest is a concise derivative review surface, not a replacement for the authoritative per-step contracts: `tasks.md` remains authoritative for step attribution and per-step tokens, and no downstream phase parses the manifest as authoritative input.

When the net fold produces no lines, carry the exact sentinel `None — no files affected` followed by a one-line reason. The empty fold is reachable only when the change nets to nothing: every `**Files Affected**` entry cancels to ∅ — each path the change touches is created and later deleted within the same change. A conforming reason line is `None — no files affected (every touched path is created and deleted within the same change, so nothing remains at target state)`. The sentinel is independent of the Architecture Snapshot's shared whole-inventory snapshot sentinel `None — no planned public surfaces` and either boundary block's `None — no planned externally consumable surfaces` or `None — no planned internal public surfaces` empty rendering: a change that plans no public surfaces still emits its full manifest, and the snapshot and manifest sentinels do not interact or suppress each other.

### Open Questions gate

After writing `design.md`, review the **Open Questions** section.

For each question:
   1. **Delegate** it to a **`budget-explorer`** subagent with a precise search prompt. Do NOT search yourself.
   2. If the subagent returns a clear answer from the codebase, incorporate it into `design.md` and remove the question.
   3. If the subagent reports it cannot find the answer (not found, ambiguous, or out of scope), present the question to the user.

The presentation SHALL reference `@sai/policies/question-context.md` and comply with its anatomy: it states what is being decided (the unresolved Open Question), why it matters (no `tasks.md` step that depends on it can be planned until it is resolved), the essential state context (the change `$ARGUMENTS`, the question as recorded in `design.md` `## Open Questions`, and why research could not answer it), and plain-language options where a closed choice applies — in plain wording, without bare artifact references.

Do NOT proceed to `tasks.md` until every Open Question has been either answered by the codebase or resolved by the user. Incorporate all answers into `design.md` before continuing.

`## Deferred` items are NOT Open Questions: they are not delegated to a `budget-explorer` subagent and do not block `tasks.md` generation — they are carried forward unresolved. Conversely, an item that is genuinely an unresolved unknown the design cannot proceed without is an Open Question and passes through this blocking gate; it is not parked in `## Deferred` to escape the gate.

### Generate tasks.md

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

#### Routing derivation

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

### Generate interfaces.md

Write to `openspec/changes/$ARGUMENTS/interfaces.md`.

`interfaces.md` is the per-step **contract** — the new/modified public signatures plus the exact assertions a test author needs — kept in a separate file from `tasks.md` so it is consumable without the implementation body. Derive it from the **same fresh step decomposition** as `tasks.md`, in the same run. Regenerate it wholesale every run; there is NO cross-run preservation path at the design stage (unlike `implementation.md`, which the implementation phase preserves byte-for-byte), so its `## Step N` keys always match the current `tasks.md` and cannot desync.

`interfaces.md` SHALL admit **no** leading non-`Step N` top-level section: the `## Target State` section and its `### Architecture Snapshot` and `### File Manifest` subsections are emitted in `design.md` (see `### Target State (authored first in design.md)` above) and SHALL NOT be emitted in `interfaces.md`. Every top-level section of `interfaces.md` SHALL be a `## Step N` section, with exactly one admitted exception: when every step introduces neither a new/modified public interface nor a testable assertion, `interfaces.md` carries exactly the sentinel `None — no step contracts` followed by a one-line reason naming why no step admits a contract — the sentinel is the sole content of the file in that case, keeping the design worker's exists-and-non-empty verification and the `change-overview` artifact's `requires: [interfaces]` dependency satisfiable for every designed change.

Structure — one section per step that introduces a new/modified public interface or a testable assertion, keyed by the same integer `## Step N` as `tasks.md`:

    ## Step N: <title>

    **Interfaces**: <new or modified public signatures introduced in this step — function/method signatures, exported types, class or module public surface. Signatures only, no implementation body.>

    **Test assertions**: <the exact assertions that verify this step — expected input → expected output/behavior — each anchored to a `specs/**/*.md` requirement or scenario by path.>

Rules:
- **Omit steps with no interface surface.** A step that introduces neither a new/modified public interface nor a testable assertion (e.g. a pure config or scaffolding step) is omitted entirely — do NOT emit an empty `## Step N` section.
- **Keep signatures and assertions OUT of `tasks.md`.** They are the "detailed behavior" that `tasks.md`'s conciseness rule excludes. `tasks.md`'s `**Testing Strategy**` stays high-level *approach* prose (what kind of test, what surface it exercises); the concrete assertion values live only here. Never restate them into `tasks.md`.
- **No testing-stack section.** Do NOT add a testing-setup, stack, or `## Implementation Context` section to `interfaces.md`; the testing stack stays single-sourced in `tasks.md`'s `## Implementation Context`.
- **Self-contained.** The signature plus its anchored assertions must be sufficient to author the step's tests without reading `implementation.md`, `design.md`, or source code.
- **No non-`Step N` top-level section.** `interfaces.md` begins directly with its first `## Step N` section (or the `None — no step contracts` sentinel); no `## Target State` section and no `### Architecture Snapshot` or `### File Manifest` subsection appears anywhere in the file, and no non-step section is emitted after the step sections. The per-step keying rule governs every `## Step N` section of `interfaces.md`.

### Architecture Snapshot feedback presentation

The initial design feedback iteration always presents the current `### Architecture Snapshot` immediately before the existing feedback loop. For each later feedback iteration, retain the previous complete `design.md` text in invocation-scoped state before applying feedback and regenerating artifacts, then extract the complete `## Target State` block — from the `## Target State` heading through the start of the next top-level section — from both the previous and the regenerated `design.md`. Normalize the two extracted blocks by converting CRLF and CR line endings to LF and removing trailing whitespace from every line. Preserve all other text and ordering.

Present the updated Architecture Snapshot immediately before the next feedback loop only when the normalized Target State blocks differ. Identical normalized blocks — or feedback that changes only Context, Decisions, Risks, or other non-Target-State prose — omit the snapshot for that iteration. The comparison input is the extracted block, never the whole `design.md`: after the Target State relocation, comparing the complete document would wrongly present the snapshot on feedback that changes only non-Target-State prose. Routed workers carry applicable snapshot display text through the existing terminal `summary`; coordinators print that worker-authored summary without reading, parsing, or reconstructing the artifact. Do not add a snapshot payload field or top-level artifact.

## Cost discipline reminder

Every source code line read by the main agent costs frontier-tier tokens. If you are about to `Read` a file that is not `proposal.md`, a `specs/**/*.md`, or `design.md`, STOP and delegate to a `budget-explorer` subagent instead.
