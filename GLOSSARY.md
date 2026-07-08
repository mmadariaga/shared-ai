# shared-ai

Prompt and instruction library that orchestrates a structured AI-assisted development pipeline (sai-* commands) on top of OpenSpec. This glossary covers the pipeline's own domain language — its lifecycle phases, command roles, and artifact contracts.

## Language

**Advisor Skill**: "A read-only consultation skill (`mid-advisor`, `senior-advisor`) that a cheaper pipeline phase escalates to — a subagent running the model tier of the phase above it — returning a structured advice report instead of editing anything."
*Avoid*: consultant skill, oracle, reviewer skill, helper agent

**Backfilled Change**: "An OpenSpec change reconstructed post-implementation by `/sai-backfill`, with `backfilled: true` written to `.openspec.yaml` and contractually forbidden from producing `design.md`, `tasks.md`, or `implementation.md`."
*Avoid*: post-hoc change, retroactive change, reconstructed change

## Relationships

- An **Advisor Skill** is consulted by the phase directly below its model tier: `mid-advisor` by the `/sai-4-apply` coordinator, `senior-advisor` by `/sai-3-implement`.
- An **Advisor Skill** is the inverse of a budget-* skill (escalates upward to smarter models rather than delegating downward to cheaper ones).
- A **Backfilled Change** is archived via `/sai-archive` (the same command that archives non-backfilled changes).
- A **Backfilled Change** is produced only by `/sai-backfill`; no other `sai-*` command writes `backfilled: true`.

## Example dialogue

> **Dev:** I implemented this feature directly on main and forgot to run `/sai-1-spec` first. How do I document it now?
> **Domain expert:** Run `/sai-backfill my-feature` against the diff. It will write `proposal.md`, `specs/**/*.md`, and a `.openspec.yaml` with `backfilled: true`. The flag tells `/sai-archive` to skip the `design.md`/`tasks.md`/`implementation.md` check, since you never produced them.

## Flagged ambiguities

- None.
