# Design Step — Common (always active)

This file is fetched at worker dispatch and stays in force for the entire run. It carries the boundaries that outlive any single step: scope, collaboration style, cost discipline, glossary format, and question policy.

Rules originating here: Step delivery meta-rule, Generation scope, Artifact-only scope, Collaboration style, Cost and budget discipline.

Fetch @sai/commands/design/phase-contract.md and use its `DesignWriteSurface`,
`DesignResultUnion`, and pointer/rendering separation as the canonical phase
declarations. This step file supplies no competing lifecycle, progress, or
write-scope contract.

## Step delivery meta-rule

The coordinator names each active step by appending one pointer line — `Active step: <id> — follow <path>` — to a progress-event continuation. Execute only the step file that line names; never prefetch, open, or follow any other step instruction file. Step paths arrive solely through coordinator continuations; this file is the only step surface loaded at dispatch. `prereqs-resolution` has no step file of its own — it runs from the worker contract plus this file before the first progress event, and the first delivered pointer targets research. Each step ends by returning its progress event per the worker contract's Progress Reporting plan; a continuation without a pointer line (artifact feedback, recovery) leaves the active step unchanged in this continuous session.

Every step in the canonical plan, `review` and `overview` included, is reached through pointer delivery from the map in `@sai/commands/design/phase-contract.md`. Their normative bodies live in the worker card, which the step files reference; moving those bodies into the step files is known remaining work, blocked on assertions that pin them to the worker card.

Fetch @sai/policies/glossary-format.md
Fetch @sai/policies/sai-learnings-format.md
Fetch @sai/policies/remember.md

## Generation scope

Generate `design.md`, `tasks.md`, and `interfaces.md` for the resolved change as the default outputs. `proposal.md` and `specs/**` may be amended in place only when a spec problem is discovered during design, clarity on the fix is present, and the user explicitly consents — never by default.

## Artifact-only scope

The ONLY files you are allowed to create or modify are the `openspec/changes/{name}/` subset:
- `openspec/changes/{name}/design.md`
- `openspec/changes/{name}/tasks.md`
- `openspec/changes/{name}/interfaces.md`
- `openspec/changes/{name}/.openspec.yaml`
- `openspec/changes/{name}/proposal.md` and `openspec/changes/{name}/specs/**/*.md` — only under the spec-problem handling rules of the design step.

Never write `implementation.md`, test files, or any other artifact. Code generation and project modifications are the explicit responsibility of downstream commands.

## Collaboration style

- Treat the user as a **knowledgeable peer**, not as a requester. They have deep domain expertise and more project context than you. Adjust language accordingly.
- The user may not have fully specified the task upfront — engage in dialogue to uncover the full picture before committing. **Ask questions rather than making assumptions.**
- When multiple valid approaches exist, **discuss trade-offs explicitly with the user** before choosing a direction.
- Prioritize **shared understanding of the WHY**. Future iterations rely on the user remembering the reasoning; gaps compound permanently. Explain non-obvious decisions concisely but clearly.
- When trade offs are discussed, propose **up to 2 concrete scenarios** that probe edge cases. Wait for user feedback before continuing.
- Return `needs_input` for planning questions, each complying with `@sai/policies/question-context.md`; present closed-choice asks through the native picker per `@sai/policies/remember.md`.

## Cost and budget discipline (summary)

Fetch @skills/budget/SKILL.md and use it.

Summary of the main-agent rules: delegate I/O work — web fetching, broad reads/searches, diffs, audits — to **`budget-explorer`** subagents while you reason and synthesize; run independent calls in parallel; never call a web fetch tool directly; never delegate a decision; do not re-fetch what you already have. Every subagent call declares an output contract (exact fields, length cap, no raw content). The full delegation specifics ship with the research step.

Every source code line read by the main agent costs frontier-tier tokens. If you are about to `Read` a file that is not `proposal.md`, a `specs/**/*.md`, or `design.md`, STOP and delegate to a `budget-explorer` subagent instead.
