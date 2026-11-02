# Design Step — Tasks

Active step: tasks. Resolve all Open Questions, then write `tasks.md`, and report the `tasks` step.

## Open Questions gate

After writing `design.md`, review the **Open Questions** section.

For each question:
   1. **Delegate** it to a **`budget-explorer`** subagent with a precise search prompt. Do NOT search yourself.
   2. If the subagent returns a clear answer from the codebase, incorporate it into `design.md` and remove the question.
   3. If the subagent reports it cannot find the answer (not found, ambiguous, or out of scope), report `needs_input` for the question.

The question states what is being decided (the unresolved Open Question), why it matters (no `tasks.md` step that depends on it can be planned until it is resolved), the essential state context (the change `{resolved_change_name}`, the question as recorded in `design.md` `## Open Questions`, and why research could not answer it), and plain-language options where a closed choice applies — in plain wording, without bare artifact references.

Do NOT proceed to `tasks.md` until every Open Question has been either answered by the codebase or answered by the coordinator. Incorporate all answers into `design.md` before continuing.

A real follow-up is not an Open Question and does not block `tasks.md` generation: it is recorded in `## Goals / Non-Goals` as a non-goal of the form "out of scope: X — revisit when Y". Conversely, a genuine unresolved unknown the design cannot proceed without is an Open Question and passes through this blocking gate.

## Generate tasks.md

**Rule of conciseness:** Each step MUST be a planning scaffold, not a restatement of requirements. Do NOT copy scenario text, field names, or detailed behavior from specs into the steps. Instead, reference the relevant spec file and describe ONLY the implementation approach and how it maps to the existing codebase.

Write to `openspec/changes/{resolved_change_name}/tasks.md`.

### File Manifest fold

When writing each step's `**Files Affected**` entries, record the exact project-root-relative paths and existence-derived change tokens (`A`/`M`/`D`/`R`). Render each entry on its own line as a Markdown bullet: `- <token> <path>` or `- R <source path> -> <destination path>`, with any note alongside the path. Preserve existing empty-list markers without treating them as paths. The `### File Manifest` subsection of `design.md` is produced from those entries by the deterministic `file-manifest.js` tool; you never author or hand-fold the manifest.

After `tasks.md` is fully written, Fetch @sai/policies/tool-resolution.md, resolve `file-manifest.js` by its per-harness order (including the opencode XDG fallback), and run `node <tool> fold <change-name> --json --cwd <project-root>`. The tool folds every `## Step N` section's `**Files Affected**` entries (ascending step order, file order within a step) into the target-state manifest and writes it into `design.md`'s `### File Manifest` subsection, creating the subsection at the end of `## Target State` when it is absent. It applies these net-fold rules: one line per surviving path, `<token> <path> (Step <n>[, Step <n>]*)` or `R <src> -> <dst> (Step <n>…)`, sorted byte-wise by path (destination for `R`), a path whose net state is empty omitted, and the `None — no files affected` sentinel with its reason line when every touched path nets to nothing.

A non-zero exit is blocking and writes nothing: the tool reports each malformed entry (unknown token, missing path) or illegal transition (for example `M` after `D`) with its `tasks.md` line. Fix the `**Files Affected**` entries in `tasks.md` and re-run until it exits 0; do not edit the manifest by hand. Re-run `fold` after any later change to `tasks.md` that touches `**Files Affected**`; `node <tool> verify <change-name> --json --cwd <project-root>` is the read-only check that the persisted manifest still equals the fold.

The manifest is a concise derivative review surface, not a replacement for the authoritative per-step contracts: `tasks.md` remains authoritative for step attribution and per-step tokens, and no downstream phase parses the manifest as authoritative input.

IMPORTANT: `tasks.md` is the progress tracker of the change: `/sai-3-implement` checks off each task as its step is committed, and `/sai-status` routes on the checked count. Write each step's task as exactly one unchecked checkbox line, `- [ ] Step N: <title>`, directly beneath its `## Step N: <title>` heading, and never write `- [x]`. Put no other checkbox line in the file.

Structure — one numbered section per implementation step:

    ## Step N: <title>

    - [ ] Step N: <title>

    **Routing**: category=<category> · context=<context> · difficulty=<difficulty>

    **Files Affected**: entries beneath the label, one Markdown bullet per line, each starting with `- ` followed by exactly one change-type token from the closed vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed), followed by one space and the project-root-relative path; an `R` entry carries `- R <source path> -> <destination path>`. Derive each token from the file's existence at the repository state immediately before that step's commit, never from the step title or prose verb: a path that already exists is `M` even when the step prose says "add". `R` covers both pure relocation and relocation-with-rewrite; the extent of content change is carried by `**What Will Be Done**` prose, not by the token.

    **What Will Be Done**: <prose description of HOW to build it, not WHAT to build>. Reference the relevant `specs/<capability>/spec.md` by path. Do NOT restate requirements already defined there.

    **Testing Strategy**: <how correctness will be verified>

    **Existing Tests Broken**: <existing tests this step breaks, each on its own `- ` bullet line beneath the label with failure mode `compile` or `runtime`, shared/central fixtures listed first; `None` when the step breaks none>

`**Existing Tests Broken**` is the fifth and last sub-field of every `## Step N`, immediately after `**Testing Strategy**`; the first four sub-fields keep their existing relative order. Its label is pinned byte-exact — no synonym such as "Tests Affected" or "Broken Tests". It concerns **existing** tests only; new tests the step adds stay in `**Testing Strategy**` and `interfaces.md` and are never listed here. Name each affected test file by its exact repository-relative path (never a suite name: `/sai-3-implement` carries each entry into a RED block by path), and when the step breaks none, emit an explicit `None` rather than omitting the field (so a reader distinguishes "no impact" from "not analyzed"). Each named test carries exactly one failure-mode token: `compile` (the test no longer compiles or resolves — a changed signature, removed symbol, renamed type; structural, mechanical, bulk-fixable) or `runtime` (the test compiles but its assertions no longer hold; per-test judgment needed). The distinction is **effort-and-ordering** information only — both modes are resolved within the same step, and `runtime` never licenses committing with that test failing. List test-only shared infrastructure — fixtures, builders, factories, base classes, helpers used by more than one test file, never a production file — before the individual test files that depend on it. Do NOT restate assertion values or expected outputs in this field; that content lives in `interfaces.md`. These five sub-fields are the complete, closed set for a step; do not invent a sixth.

Order steps by dependency. Steps should be small enough for `/sai-3-implement` to complete as one RED, GREEN, review, and commit cycle.
When a Step changes mandatory fields, constraints, or results of an existing contract, review its current consumers and shared fixtures, including runtime assertions, not only compilation references. In **Testing Strategy**, record the reviewed paths and why each needs adaptation or remains compatible. List identified adaptations under **Existing Tests Broken** using backticked exact paths, fixtures first; assign them to the same Step's RED work. `None` requires this supporting review when a contract changes. This criterion is agent-owned semantic analysis; deterministic preflight cannot prove its completeness.

Generated outputs extend **Files Affected**, not the five-field structure: use `A <directory>/<prefix>*<suffix> — generated count=<positive integer>`. The directory is an exact repository-relative directory; the family has one basename `*`, a non-empty literal prefix and suffix, and no nested wildcard. Declare only a known bounded output family. The manifest carries that declaration as a derivative, not an executable path. Apply resolves the declared family to exactly that count of regular files before close, rejects overlaps/extra/missing outputs, and commits only the resolved exact paths. Workers cannot change the declaration or widen it. Use exact `A/M/D/R` entries for all other files.

Every verify-first marker in `design.md`'s `## Risks / Trade-offs` is an ordering constraint on this sequence: the work that resolves or disproves the marked risk MUST be sequenced before the step the marker names — placed inside an earlier step or as its own earlier step, and NOT satisfied by prose alone in the gated step's `**What Will Be Done**`. Verify-first ordering composes with the dependency ordering above; where the two conflict, surface the conflict to the user rather than silently dropping either constraint.

Reference specs for what to build, design for how to build it.

### Routing line

Every `## Step N` MUST include a `**Routing**` line immediately after its title and before `**Files Affected**`: `**Routing**: category=<category> · context=<context> · difficulty=<difficulty>`. Judge each value by its goal; no path pattern decides it.

The implementer is the agent that implements the Step in `/sai-3-implement`: no more capable than you, and usually less.

- `difficulty=low|medium|high`: how hard the Step is for the implementer to finish from its plan, its tests, and its `interfaces.md` contract. It is reserved for routing GREEN workers by difficulty later: no command consumes it today, so judge it for that future reader. When unsure, choose the higher value. A Step with no RED block (docs or config) still carries `difficulty`, judged on what the implementer will have: the plan and contract, with no tests to guide it.
- `category=frontend-ui|frontend-code|backend|data|infra|docs|other`: the kind of work the Step performs, judged by its purpose. A Step mixing kinds of work takes the category that best fits its main purpose. Use `other` only when the work fits no category at all, and add a parenthetical note naming the kind of work.
- `context=small|medium|large`: how much the implementer must load: instructions, files to read or touch, and prior information.

An optional one-line parenthetical `(...)` MAY follow the three key=value pairs for audit; the parser ignores everything from the first `(`. Every Step of one `tasks.md` uses this format. Step numbering is final within this file: `/sai-3-implement` sizes its own steps from these Steps and records any regrouping as a deviation.

### Commit atomicity

Each `## Step N` is one RED, GREEN, review, and commit cycle, and `/sai-3-implement` chooses and regroups its own steps from execution evidence. Two rules bind the plan:

- **One cycle per Step.** A Step delivers one testable behavior that the implementer can finish and commit on its own.
- **A contract-breaking change travels with all its callers.** When a Step changes a signature, removes or renames an exported symbol, or alters any contract other files depend on, list every affected file under that Step's `**Files Affected**`: callers, consumers, re-exporters, and the tests that use the contract, with the `compile` or `runtime` failures recorded under `**Existing Tests Broken**`. Never leave a caller for a later Step.

A Step's `**Files Affected**` lists every file it creates, modifies, deletes, or renames, tests included: the production and test files its RED and GREEN work will write and the files it retires. `/sai-3-implement` compares each step's changed files with this list and reports any path its steps change that the list omits.

After all implementation steps, end the file with these two mandatory sections in order. `/sai-3-implement` reads `## Required Documentation` for its step briefs and `**Test Command**` for its test discovery:

1. `## Required Documentation` — list every implementation-relevant project file consulted during design. Use all `budget-explorer` reports and project artifacts read directly by the design worker, including the proposal and specs; do not list `SAI_LEARNINGS.md`, even when consulted, because the step brief of `/sai-3-implement` carries its path; include every spec file that the steps reference (both change delta specs under `openspec/changes/{change-name}/specs/**` and consulted main specs under `openspec/specs/**`). The subsections are ordered `### Spec files`, then `### Local files`, then `### External URLs`; no path or URL is listed twice (every spec, whether delta or main, lives only under Spec files, never duplicated in Local files):
    - `### Spec files`: one path per line to every `specs/**/*.md` consulted (change delta and main specs alike). Do NOT leave empty: a change with `skip_specs: true` has no delta spec, so when it consulted no main spec either, write `None`. Do NOT include notes.
    - `### Local files`: one entry per line in the form `<path> — <note>`, where the note is one short sentence (about 20 words at most) stating why this resource matters for implementing the change — for a file, e.g. pattern to imitate, caller of what changes, reusable fixture; for any resource, a role example. A resource with several roles gets one note naming them all. The note contains no code or snippets and does not restate requirements. It is derived from the `budget-explorer` report or consulted documentation and never invented. A resource consulted but with no implementation role stays listed with a note saying so (e.g. "context only"). Use whole-file paths only (no line ranges). Write `None` if empty.
    - `### External URLs`: one entry per line in the form `<URL> — <note>`, where the note is one short sentence (about 20 words at most) stating why this resource matters — which API or version-specific behavior to consult there. A URL with multiple roles gets one note naming them all. The note contains no code or snippets and does not restate requirements. It is derived from design research and never invented. A consulted URL with no implementation role stays listed with a note saying so (e.g. "context only"). Write `None` if empty.
    - Render every path/URL entry in these three subsections as a Markdown bullet prefixed with `- `, one entry per line. Keep the note on the same line as its path/URL; keep `None` unbulleted when empty. Do NOT leave any subsection empty or omit it. The separator between path/URL and note is exactly ` — ` (space, em dash, space).

 2. `## Implementation Context` — one field, derived from actual codebase research, not from the change description:
    - `**Test Command**`: the exact command that runs this project's test suite, directly executable from the project root by a subagent that has not read `design.md`. Where the runner supports scoping a run to a subset of tests, also carry the project's scoping idiom in **parameterised** form — the concrete flag and the concrete test-project/path argument, with a substitutable placeholder for the test identifier (e.g. `dotnet test tests/<Project> --filter FullyQualifiedName~<TestName>`); do NOT pin a specific Step's filter value. When the project has no test runner at all, write the explicit sentinel `None — no test runner in this project` (a researched finding, not placeholder text). Research it, and when `SAI_LEARNINGS.md` has a **Test Command** section, compare the two: when they agree, write that command; when they disagree, write the `SAI_LEARNINGS.md` command, because an entry wins over contradicting findings (its § Consumption) and execution then settles it: a command that fails reaches the `/sai-3-implement` close as a stale entry. When a value is taken from that section, take **only the command line** — never the `*Observed:*` provenance line or a bullet marker — because the implementing run copies this field into runnable commands.

Both sections are mandatory. They must contain real content derived from research, not placeholder text.
