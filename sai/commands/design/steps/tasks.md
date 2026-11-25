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

A real follow-up is not an Open Question and does not block `tasks.md` generation: it is recorded in `## Decisions` as a bullet of the form "out of scope: X — revisit when Y". Conversely, a genuine unresolved unknown the design cannot proceed without is an Open Question and passes through this blocking gate.

## Generate tasks.md

**Rule of conciseness:** `tasks.md` records only what the code of the plan RED does not express. Each step is a planning scaffold, not a restatement of requirements: do NOT copy scenario text, field names, or detailed behavior from the specs into it, and do NOT describe how to build a behavior that a test and a signature of `design.md` `## Target State` already pin. The assertions are written as code by the plan RED worker after you, from the specs and `## Target State`; you name only the scenarios each step covers. A deterministic tool writes the tests and the test command of each step with tests into `tasks.md` after the plan RED, so you never write them.

Write to `openspec/changes/{resolved_change_name}/tasks.md`.

### Two kinds of step

- **A step with tests** changes behavior that a test can pin. It carries its title, its task checkbox, its `**Routing**` line, and `**Scenarios**`: one bullet per spec scenario the step covers (the scenario's title, as words), plus one bullet per edge behavior the step must prove, named as a short title of its own. For a change whose `.openspec.yaml` sets `skip_specs: true`, the bullets are short titles of the statements of the proposal's What Changes that the step covers. It carries no `**Files Affected**`, no description of what to build, no `**Tests**`, no `**Test Command**`, and no `**Existing Tests Broken**`: the plan RED reports its tests, and the tool `file-manifest.js writeback` adds `**Tests**` (each entry `- <test path> :: <test name>`, with ` [regression guard]` on a test that passes before and after) and `**Test Command**` right after your `**Scenarios**`, once the coordinator accepts the plan tests.
- **A step without tests** changes files that no test can usefully pin (documentation, prompts, declarative configuration, glue code). It carries its title, its task checkbox, its `**Routing**` line, `**Files Affected**`, `**What Changes**`, and `**Closure criterion**`, in that order, and no test field.

A step that changes tested code and also untested files is split: the untested files go to a step without tests, so they reach the File Manifest and `check-cited-paths.js`. A change whose steps all carry a `**Closure criterion**` produces no plan tests.

### File Manifest fold

When writing each step without tests, record in `**Files Affected**` the exact project-root-relative paths and existence-derived change tokens (`A`/`M`/`D`/`R`). Render each entry on its own line as a Markdown bullet: `- <token> <path>` or `- R <source path> -> <destination path>`, with any note alongside the path. Preserve existing empty-list markers without treating them as paths. The `### File Manifest` subsection of `design.md` is produced from those entries by the deterministic `file-manifest.js` tool; you never author or hand-fold the manifest.

After `tasks.md` is fully written, Fetch `@sai/policies/tool-resolution.md`, resolve `file-manifest.js` through the fetch tool as it states, and run `node <tool> fold <change-name> --json --cwd <project-root>`. The tool folds the `**Files Affected**` entries of every step that carries them (ascending step order, file order within a step) into the target-state manifest and writes it into `design.md`'s `### File Manifest` subsection, creating the subsection at the end of `## Target State` when it is absent. It applies these net-fold rules: one line per surviving path, `<token> <path> (Step <n>[, Step <n>]*)` or `R <src> -> <dst> (Step <n>…)`, sorted byte-wise by path (destination for `R`), a path whose net state is empty omitted, the `None — no files affected` sentinel with its reason line when every touched path nets to nothing, and the `None — every file passes through the plan RED` sentinel when no step carries `**Files Affected**`.

A non-zero exit is blocking and writes nothing: the tool reports each malformed entry (unknown token, missing path) or illegal transition (for example `M` after `D`) with its `tasks.md` line. Fix the `**Files Affected**` entries in `tasks.md` and re-run until it exits 0; do not edit the manifest by hand. Re-run `fold` after any later change to `tasks.md` that touches `**Files Affected**`; `node <tool> verify <change-name> --json --cwd <project-root>` is the read-only check that the persisted manifest still equals the fold.

The manifest is a concise derivative review surface, not a replacement for the authoritative per-step contracts: `tasks.md` remains authoritative for step attribution and per-step tokens, and no downstream phase parses the manifest as authoritative input.

IMPORTANT: `tasks.md` is the progress tracker of the change: `/sai-3-implement` checks off each task as its step is committed, and `/sai-status` routes on the checked count. Write each step's task as exactly one unchecked checkbox line, `- [ ] Step N: <title>`, directly beneath its `## Step N: <title>` heading, and never write `- [x]`. Put no other checkbox line in the file.

Structure, one numbered section per implementation step.

A step with tests:

    ## Step N: <title>

    - [ ] Step N: <title>

    **Routing**: category=<category> · context=<context> · difficulty=<difficulty>

    **Scenarios**:
    - <title of a spec scenario the step covers>
    - <short title of an edge behavior the step must prove>

A step without tests:

    ## Step N: <title>

    - [ ] Step N: <title>

    **Routing**: category=<category> · context=<context> · difficulty=<difficulty>

    **Files Affected**:
    - <token> <path>

    **What Changes**: <what changes in each file, in plain sentences; reference the relevant `specs/<capability>/spec.md` by path and do not restate requirements already defined there>

    **Closure criterion**: <one checkable sentence that states when the step is done>

`**Files Affected**` holds entries beneath the label, one Markdown bullet per line, each starting with `- ` followed by exactly one change-type token from the closed vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed), followed by one space and the project-root-relative path; an `R` entry carries `- R <source path> -> <destination path>`. Derive each token from the file's existence at the change base, never from the step title or prose verb: a path that already exists is `M` even when the step prose says "add". `R` covers both pure relocation and relocation-with-rewrite; the extent of content change is carried by `**What Changes**`, not by the token.

`**Closure criterion**` is one checkable sentence that states when the step is done: the command whose output proves it, the path and the content it must hold, or the condition a reviewer can confirm by reading, never "it works". `/sai-3-implement`'s review checks that it holds. A step without tests carries no `**Test Command**`.

The fields after `**Routing**` are a closed set per kind: `**Scenarios**` for a step with tests (then `**Tests**` and `**Test Command**`, which only the tool writes), and `**Files Affected**`, `**What Changes**`, and `**Closure criterion**` for a step without tests. Do not invent another, and do not write `**What Will Be Done**`, `**Existing Tests Broken**`, or a `## Required Documentation` section: the plan RED bounds its edits to existing tests itself (its card names the bound), and the implement brief reads the project files it needs from the signatures and the specs.

Order steps by dependency. Steps should be small enough for `/sai-3-implement` to complete as one GREEN, review, and commit cycle.
When a Step changes mandatory fields, constraints, or results of an existing contract, review its current consumers and shared fixtures, including runtime assertions, not only compilation references, and decide whether a consumer needs its own step: a consumer that is production code tested by the same scenarios stays in the step, a consumer that no test can pin goes to a step without tests. This criterion is agent-owned semantic analysis; deterministic preflight cannot prove its completeness.

Generated outputs extend **Files Affected** of a step without tests: use `A <directory>/<prefix>*<suffix> — generated count=<positive integer>`. The directory is an exact repository-relative directory; the family has one basename `*`, a non-empty literal prefix and suffix, and no nested wildcard. Declare only a known bounded output family. The manifest carries that declaration as a derivative, not an executable path. Apply resolves the declared family to exactly that count of regular files before close, rejects overlaps/extra/missing outputs, and commits only the resolved exact paths. Workers cannot change the declaration or widen it. Use exact `A/M/D/R` entries for all other files.

Every verify-first marker in `design.md`'s `## Risks / Trade-offs` is an ordering constraint on this sequence: the work that resolves or disproves the marked risk MUST be sequenced before the step the marker names, placed inside an earlier step or as its own earlier step, and NOT satisfied by prose alone in the gated step. Verify-first ordering composes with the dependency ordering above; where the two conflict, surface the conflict to the user rather than silently dropping either constraint.

Reference specs for what to build, design for how to build it.

### Routing line

Every `## Step N` MUST include a `**Routing**` line immediately after its checkbox: `**Routing**: category=<category> · context=<context> · difficulty=<difficulty>`. Judge each value by its goal; no path pattern decides it.

The implementer is the agent that implements the Step in `/sai-3-implement`: no more capable than you, and usually less.

- `difficulty=low|medium|high`: how hard the Step is for the implementer to finish from its plan, its tests, and the signatures of `design.md` `## Target State`. It is reserved for routing GREEN workers by difficulty later: no command consumes it today, so judge it for that future reader. When unsure, choose the higher value. A Step with a closure criterion (docs or config) still carries `difficulty`, judged on what the implementer will have: the plan and the criterion, with no tests to guide it.
- `category=frontend-ui|frontend-code|backend|data|infra|docs|other`: the kind of work the Step performs, judged by its purpose. A Step mixing kinds of work takes the category that best fits its main purpose. Use `other` only when the work fits no category at all, and add a parenthetical note naming the kind of work.
- `context=small|medium|large`: how much the implementer must load: instructions, files to read or touch, and prior information.

An optional one-line parenthetical `(...)` MAY follow the three key=value pairs for audit; the parser ignores everything from the first `(`. Every Step of one `tasks.md` uses this format. Step numbering is final within this file: `/sai-3-implement` sizes its own steps from these Steps and records any regrouping as a deviation.

### Commit atomicity

Each `## Step N` is one GREEN, review, and commit cycle over its plan tests, and `/sai-3-implement` chooses and regroups its own steps from execution evidence. Three rules bind the plan:

- **One cycle per Step.** A Step delivers one testable behavior that the implementer can finish and commit on its own, and its tests turn green without the tests of later Steps.
- **A contract-breaking change travels with all its callers.** When a Step changes a signature, removes or renames an exported symbol, or alters any contract other files depend on, the same Step delivers every caller and consumer: production callers are updated by its GREEN, existing tests of the old contract are updated by the plan RED, and files no test pins go to a step without tests that lists them. Never leave a caller for a later Step.
- **Every behavior is named by a scenario, or the step is closed by criterion.** A step that changes behavior a test can pin lists the scenarios it covers; a step whose output no test can usefully pin carries a closure criterion.

`/sai-3-implement` compares each step's changed files with what the plan makes known (the `path :: signature` entries of `## Target State`, the tests of `**Tests**`, and the `**Files Affected**` of steps without tests) and reports any path its steps change that none of them names.

After all implementation steps, end the file with one mandatory section, `## Implementation Context`, derived from actual codebase research, not from the change description. It has one field:

- `**Test Command**`: the exact command that runs this project's test suite, directly executable from the project root by a subagent that has not read `design.md`. Where the runner supports scoping a run to a subset of tests, also carry the project's scoping idiom in **parameterised** form: the concrete flag and the concrete test-project/path argument, with a substitutable placeholder for the test identifier (e.g. `dotnet test tests/<Project> --filter FullyQualifiedName~<TestName>`); do NOT pin a specific Step's filter value. When the project has no test runner at all, write the explicit sentinel `None — no test runner in this project` (a researched finding, not placeholder text). Take the draft from the shared resolver, run before `tasks.md` exists, so that design, `/sai-3-implement`, Direct Build, and `/sai-merge` start from the same source: `node <tool> command --cwd <project-root>` (`test-select.js`, resolved per `@sai/policies/tool-resolution.md`; pass no `--change`, because `tasks.md` does not exist yet). A `found` answer gives the command, and its `scoping_idiom` gives the way to take a list of test files (a parameterised command already, or a note to turn into the concrete flag or path argument with a placeholder); `none` gives the sentinel; `ambiguous` lists the candidates, which your research settles. Research it too, and when `SAI_LEARNINGS.md` has a **Test Command** section, compare the two: when they agree, write that command; when they disagree, write the `SAI_LEARNINGS.md` command, because an entry wins over contradicting findings (its § Consumption) and execution then settles it: a command that fails reaches the `/sai-3-implement` close as a stale entry. When a value is taken from that section, take **only the command line**, never the `*Observed:*` provenance line or a bullet marker, because the implementing run copies this field into runnable commands.

The section is mandatory and must contain real content derived from research, not placeholder text.

## Cited-path existence gate (blocking)

After `tasks.md` is fully written and the manifest fold exits 0, and before reporting the `tasks` step, Fetch `@sai/policies/tool-resolution.md` and resolve `check-cited-paths.js` through the fetch tool as it states. Run `node <tool> sai-2 <change-name> --cwd <project-root>`. A non-zero exit is blocking: `A` paths may stay absent, but every `M`/`D`/`R` path in the `**Files Affected**` entries of `tasks.md` must exist — fix the plan entries (using the tool's basename candidates as suggestions only — the tool never rewrites artifacts) and re-run until it passes. This gate is read-only and performs no auto-fix.

When no candidate exists, name the tried candidates and proceed without this check. This is an explicit optional-gate exception to the tool-resolution policy's default stop rule; it does not authorize a prose replacement for the checker.
