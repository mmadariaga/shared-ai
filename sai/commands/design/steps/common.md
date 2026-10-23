# Design Step — Common (always active)

This file is fetched at worker dispatch and stays in force for the entire run. It carries the boundaries that outlive any single step: scope, decision style, cost discipline, glossary format, and question policy.

Rules originating here: Step delivery meta-rule, Generation scope, Artifact-only scope, Decision style, Cost and budget discipline.

The write surface and the report shape are those of `worker.md` and
`@sai/commands/plan/worker-common.md`. This step file supplies no competing
lifecycle or write-scope contract.

## Step delivery meta-rule

The coordinator names each active step by one pointer line — `Active step: <id> — follow <path>`. Execute only the step file that line names; never prefetch, open, or follow any other step instruction file. Step paths arrive solely in the coordinator's messages; this file is the only step surface loaded at dispatch. `design-intake` has no step file of its own — it runs from the worker contract plus this file before the first pointer, and the first delivered pointer targets research. The first pointer arrives as the first line of the task message, before the task: run `design-intake` inline, then follow that pointer, and report `design-intake` and `research` together in the first report. Each step ends by writing your report with the step's id in `step_ids`; a message without a pointer line (a fix round or an answer) leaves the active step unchanged. The overview is not a step: it arrives as a continuation that names `steps/overview.md` explicitly.

Fetch @sai/policies/glossary-format.md
Fetch @sai/policies/remember.md

## Generation scope

Generate `design.md`, `tasks.md`, and `interfaces.md` for the resolved change as the default outputs. `proposal.md` and `specs/**` may be amended in place only when a spec problem is discovered during design, clarity on the fix is present, and the coordinator answers `in-place` — never by default.

## Artifact-only scope

The authorized write surface is the one in `worker.md`. Within `openspec/changes/{name}/`, the design worker writes `design.md`, `tasks.md`, `interfaces.md`, and `.openspec.yaml` under their respective phase rules. The opted-in overview generator writes only `change-overview.md` under `@sai/commands/design/change-overview.md`; the parent worker owns overview state in `.openspec.yaml`. Amend `proposal.md` and `specs/**/*.md` only under the design step's spec-problem handling rule, after the coordinator answers `in-place`.

Never write `implementation.md`, test files, or any other artifact. Code generation and project modifications are the explicit responsibility of downstream commands.

## Decision style

- `proposal.md` and the specs arrive settled: discovery, rationale, trade-offs, and edge cases were agreed before this phase.
- Resolve technical choices yourself when the evidence justifies them.
- Record any assumption that would change behavior the specs describe in `design.md` Open Questions.
- Ask only through the two existing gates: blocking Open Questions and the spec-amendment decision. Report `needs_input` for those per `worker-common.md`; the coordinator answers from the block, the artifacts, and the repository, and escalates only what none of them settles.

## Cost and budget discipline (summary)

Fetch @skills/budget/SKILL.md and use it.

Summary of the main-agent rules: delegate I/O work — web fetching, broad reads/searches, diffs, audits — to **`budget-explorer`** subagents while you reason and synthesize; run independent calls in parallel; never call a web fetch tool directly; never delegate a decision; do not re-fetch what you already have. Every subagent call declares an output contract (exact fields, length cap, no raw content). The full delegation specifics ship with the research step.

Every source code line read by the main agent costs frontier-tier tokens. If you are about to `Read` a file that is not `proposal.md`, a `specs/**/*.md`, or `design.md`, STOP and delegate to a `budget-explorer` subagent instead.
