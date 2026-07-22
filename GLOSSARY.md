# shared-ai

Prompt and instruction library that orchestrates a structured AI-assisted development pipeline (sai-* commands) on top of OpenSpec. This glossary covers the pipeline's own domain language — its lifecycle phases, command roles, and artifact contracts.

## Language

**Advisor Skill**: "A read-only consultation skill (`mid-advisor`, `senior-advisor`) that a cheaper pipeline phase escalates to — a subagent running the model tier of the phase above it — returning a structured advice report instead of editing anything."
*Avoid*: consultant skill, oracle, reviewer skill, helper agent

**Backfilled Change**: "An OpenSpec change reconstructed post-implementation by `/sai-backfill`, with `backfilled: true` written to `.openspec.yaml` and contractually forbidden from producing `design.md`, `tasks.md`, or `implementation.md`."
*Avoid*: post-hoc change, retroactive change, reconstructed change

**Blind Test-Writer**: "The first `/sai-4-apply` dispatch of a testable Step, given only that Step's `interfaces.md` section plus injected testing context — never the GREEN implementation body — that writes the tests (and RED stubs) and verifies a valid RED."
*Avoid*: test dispatch, test agent, RED writer, test-first subagent

**GREEN Conflict**: "The state where an Implementation Dispatch cannot make the test-writer's tests pass within bounded, test-file-untouching iteration, so it halts and reports to the coordinator for a human to decide whether the fault is the implementation, the test, or the interface."
*Avoid*: test failure, GREEN failure, broken test, unpassable step

**Implementation Dispatch**: "The second `/sai-4-apply` dispatch of a testable Step, given the GREEN implementation body, that writes the implementation and verifies GREEN and is forbidden from creating or modifying any test file."
*Avoid*: GREEN dispatch, impl agent, code writer, build dispatch

**Review-Loop Token**: "The literal, English-invariant string `review-loop` that a user types in a `sai-explore` turn to enter the post-crystallization review loop directly, skipping the plain-text global sí/no invitation."
*Avoid*: review keyword, review trigger, `/review-loop`, revisar, review command

**Routing Complexity**: "One of the three tokens (`low`, `medium`, `high`) on a step's `**Routing**` line that describes the coarse effort or risk of the step as judged at design time — refined freely by `sai-3-implement` without re-tagging `tasks.md`."
*Avoid*: routing tier, effort estimate, step complexity

**Routing Discipline**: "One of the five tokens (`ui-ux`, `app-code`, `service`, `data`, `config`) on a step's `**Routing**` line that describes the type of thinking or agent specialty the step requires, orthogonal to its layer and derived from `**Files Affected**` path patterns."
*Avoid*: routing kind, work type, step discipline, commit-verb (e.g. add/modify/refactor/fix)

**Routing Layer**: "One of the four tokens (`frontend`, `backend`, `infra`, `cross-cutting`) on a step's `**Routing**` line that describes the architectural location a step touches — `cross-cutting` is the escape hatch for steps that span layers in a non-trivial way."
*Avoid*: routing domain, step layer, agent domain, frontend-split (e.g. fe-ui/fe-code)

**Routing Line**: "The per-step `**Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>` keyword line on `tasks.md` (key=value tagged, not positional) that captures descriptive routing metadata at design time so a future orchestrator can dispatch each step without re-deriving routing cues from the step body or binding to a specific agent roster."
*Avoid*: routing metadata, dispatch hint, step routing, positional routing tuple

**Tracked Crystallized Set**: "The chat-scoped, in-conversation-only list of every `**Change name**` value that this `sai-explore` chat's crystallization turns emitted, held in first-emission order and never derived from repository state."
*Avoid*: crystallized changes, change list, session changes, active changes

## Relationships

- An **Advisor Skill** is consulted by the phase directly below its model tier: `mid-advisor` by the `/sai-4-apply` coordinator, `senior-advisor` by `/sai-3-implement`.
- An **Advisor Skill** is the inverse of a budget-* skill (escalates upward to smarter models rather than delegating downward to cheaper ones).
- A **Backfilled Change** is archived via `/sai-archive` (the same command that archives non-backfilled changes).
- A **Backfilled Change** is produced only by `/sai-backfill`; no other `sai-*` command writes `backfilled: true`.
- A **Blind Test-Writer** precedes an **Implementation Dispatch** for every testable Step; the two never communicate directly — only the `/sai-4-apply` coordinator relays learnings between them.
- A **GREEN Conflict** is raised by an **Implementation Dispatch** and is resolved only by a human via the coordinator, never by the subagent editing the test or interface.
- A **Blind Test-Writer** and an **Implementation Dispatch** replace the single per-Step dispatch only for testable Steps; a non-testable Step keeps one dispatch.
- A **Review-Loop Token** firing enters the per-change review loop over the **Tracked Crystallized Set**; when that set is empty the token yields a one-line acknowledgment instead of any iteration.
- A **Tracked Crystallized Set** gains a name only when a crystallization turn emits one, ignores duplicate later emissions, and starts empty in every new chat.
- A **Routing Line** contains exactly one **Routing Layer**, one **Routing Discipline**, and one **Routing Complexity** token, in that order, each emitted as a `key=value` pair separated by middle dots.
- A **Routing Layer** is derived from the step's `**Files Affected**` paths; **Routing Discipline** is derived from the same paths against a parallel pattern set, and is orthogonal to **Routing Layer** (e.g. `(frontend, ui-ux)` vs `(frontend, app-code)` discriminate agents within the same layer); **Routing Complexity** is a coarse design-time judgment.
- A **Routing Line** is descriptive, not prescriptive — a future orchestrator maps the three tokens to its own agent roster at dispatch time, and `sai-3-implement` may refine the **Routing Complexity** (or split the step) without re-tagging `tasks.md`.

## Example dialogue

> **Dev:** I implemented this feature directly on main and forgot to run `/sai-1-spec` first. How do I document it now?
> **Domain expert:** Run `/sai-backfill my-feature` against the diff. It will write `proposal.md`, `specs/**/*.md`, and a `.openspec.yaml` with `backfilled: true`. The flag tells `/sai-archive` to skip the `design.md`/`tasks.md`/`implementation.md` check, since you never produced them.

## Flagged ambiguities

- None.
