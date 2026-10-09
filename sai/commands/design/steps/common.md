# Design Step — Common (always active)

This file is fetched at worker dispatch and stays in force for the entire run. It carries the boundaries that outlive any single step: scope, decision style, cost discipline, glossary format, and question policy.

Rules originating here: Step delivery meta-rule, Generation scope, Artifact-only scope, Decision style, Cost and budget discipline.

Fetch @sai/commands/design/phase-contract.md and use its `DesignWriteSurface`,
`DesignResultUnion`, and pointer/rendering separation as the canonical phase
declarations. This step file supplies no competing lifecycle, progress, or
write-scope contract.

## Step delivery meta-rule

The coordinator names each active step by appending one pointer line — `Active step: <id> — follow <path>` — to a progress-event continuation. Execute only the step file that line names; never prefetch, open, or follow any other step instruction file. Step paths arrive solely through coordinator continuations; this file is the only step surface loaded at dispatch. `prereqs-resolution` has no step file of its own — it runs from the worker contract plus this file before the first progress event, and the first delivered pointer targets research. The first pointer arrives as the first line of the task-disclosure continuation, before the task: run `prereqs-resolution` inline, then follow that pointer, and report `prereqs-resolution` and `research` together in the first progress event, per `@sai/orchestration/worker-core.md` § Step-machine task disclosure. Each step ends by returning its progress event per the worker contract's Progress Reporting plan; a continuation without a pointer line (artifact feedback, recovery) leaves the active step unchanged in this continuous session.

Every step in the canonical plan, `overview` included, is reached through pointer delivery from the `design-standalone@1` step machine declared in `@sai/commands/design/phase-contract.md`. The `overview` step file is the normative home of the overview lifecycle; the other step files reference the worker card for their bodies. A generation-trigger continuation that arrives without the `overview` pointer names `steps/overview.md` explicitly.

Fetch @sai/policies/glossary-format.md
Fetch @sai/policies/remember.md

## Generation scope

Generate `design.md`, `tasks.md`, and `interfaces.md` for the resolved change as the default outputs. `proposal.md` and `specs/**` may be amended in place only when a spec problem is discovered during design, clarity on the fix is present, and the user explicitly consents — never by default.

## Artifact-only scope

The authorized write surface is `DesignWriteSurface` in `@sai/commands/design/phase-contract.md`. Within `openspec/changes/{name}/`, the design worker writes `design.md`, `tasks.md`, `interfaces.md`, and `.openspec.yaml` under their respective phase rules. The opted-in overview generator writes only `change-overview.md` under `@sai/commands/design/change-overview.md`; the parent worker owns overview state in `.openspec.yaml`. Amend `proposal.md` and `specs/**/*.md` only under the design step's spec-problem handling rule after explicit user consent.

Never write `implementation.md`, test files, or any other artifact. Code generation and project modifications are the explicit responsibility of downstream commands.

## Decision style

- `proposal.md` and the specs arrive settled: discovery, rationale, trade-offs, and edge cases were agreed before this phase.
- Resolve technical choices yourself when the evidence justifies them.
- Record any assumption that would change behavior the specs describe in `design.md` Open Questions.
- Ask through the existing gates: blocking Open Questions, the explicit spec-amendment authorization, and the artifact-feedback gate. Return `needs_input` for those, each complying with `@sai/policies/question-context.md`; present closed-choice asks through the native picker per `@sai/policies/remember.md`.

## Cost and budget discipline (summary)

Fetch @skills/budget/SKILL.md and use it.

Summary of the main-agent rules: delegate I/O work — web fetching, broad reads/searches, diffs, audits — to **`budget-explorer`** subagents while you reason and synthesize; run independent calls in parallel; never call a web fetch tool directly; never delegate a decision; do not re-fetch what you already have. Every subagent call declares an output contract (exact fields, length cap, no raw content). The full delegation specifics ship with the research step.

Every source code line read by the main agent costs frontier-tier tokens. If you are about to `Read` a file that is not `proposal.md`, a `specs/**/*.md`, or `design.md`, STOP and delegate to a `budget-explorer` subagent instead.
