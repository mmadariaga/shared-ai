# dispatch-safety-invariant Specification

## Purpose
TBD - created by archiving change budget-subagent-hang-resilience. Update Purpose after archive.

## Requirements

### Requirement: Background dispatch requires a dispatcher that outlives the child

A binding that declares background dispatch — directly via `run_in_background: true` (Claude Code), or via any harness-equivalent mechanism that returns a continuation reference rather than a structured payload — MUST be invoked only from a dispatcher whose own lifetime outlives the child's reported completion. The dispatcher MUST capture the binding's continuation reference (Claude Code agent ID, opencode task ID, or harness equivalent) and await the child's structured payload on its own turn before returning to the user.

#### Scenario: Routed coordinator dispatches a background worker

- **WHEN** a routed SAI coordinator (for example, `sai/orchestration/workers/bindings/claude/design-worker.md:5`) spawns a background worker with `run_in_background: true`
- **THEN** the coordinator SHALL capture the agent ID returned by the dispatch
- **AND** the coordinator SHALL await the worker's structured payload on its own turn
- **AND** the worker SHALL remain reachable (via `SendMessage` or harness equivalent) for continuation and reaping until its payload is consumed

#### Scenario: Synchronous dispatcher does not spawn a background child

- **WHEN** a call site that constructs its own return value without awaiting a continuation reference invokes a binding that declares background dispatch
- **THEN** the call site SHALL NOT use the background binding
- **AND** the call site SHALL either (a) use a non-background binding that returns the child's structured payload synchronously, or (b) restructure the call site to capture and await the child's continuation reference

#### Scenario: Violation produces silent loss, not an error

- **WHEN** a synchronous dispatcher spawns a background child and returns without awaiting the continuation reference
- **THEN** no harness-level error, log line, or timeout surfaces the loss
- **AND** this silent-loss property is the reason the dispatch-safety invariant exists

### Requirement: Dispatch-mode declaration is a binding property, not a call-site property

The dispatch mode of a `budget-*` subagent binding SHALL be declared in the binding's skill file (`skills/claude/budget-*/SKILL.md` or `skills/opencode/budget-*/SKILL.md`), not chosen ad hoc by the call site. The declaration SHALL specify the value (for example, `run_in_background: true` on Claude Code, or "synchronous by default" on opencode) and SHALL identify the class of dispatcher that may invoke the binding safely.

#### Scenario: Claude Code binding declares an explicit run_in_background

- **WHEN** a Claude Code `budget-*` skill file is read by a dispatcher
- **THEN** the file SHALL include a `## Dispatch mode` section that states `run_in_background: true`
- **AND** SHALL name the dispatcher class (main coordinator, routed worker) that satisfies the outlives-child requirement

#### Scenario: opencode binding declares its synchronous default

- **WHEN** an opencode `budget-*` skill file is read by a dispatcher
- **THEN** the file SHALL include a `## Dispatch mode` section that states the opencode `task` tool has no `run_in_background` parameter
- **AND** SHALL state that the binding runs synchronously by default
- **AND** SHALL name the dispatch-safety invariant as the containing rule for that case

### Requirement: Permitted dispatcher call sites are enumerated and checkable

A binding that declares background dispatch SHALL name the class of dispatcher that may invoke it. The following dispatcher classes are the only call sites permitted to invoke a background `budget-*` binding:

- The main agent — the user-facing session that captures the continuation reference and awaits the child's structured payload on its own turn before returning to the user.
- A routed SAI coordinator — per `sai/orchestration/workers/bindings/{claude,opencode}/*-worker.md`, which captures the agent ID or task ID as binding-owned continuation metadata and awaits the structured payload on its own turn.
- A routed SAI worker — a worker dispatched by a coordinator (for example, `agents/claude/sai-2-design-worker.md`, which loads `skills/budget-explorer/SKILL.md` at line 10) that is itself permitted to dispatch `budget-*` subagents per its own worker contract. A routed worker satisfies the outlives-child property because a background parent defers its own completion until its background children finish, so the worker's structured payload is not produced until every `budget-*` subagent it dispatched has reported its result.

A binding that does not name one of these three dispatcher classes SHALL NOT be invoked as a background call.

#### Scenario: A review-gate check verifies the dispatcher-class declaration

- **WHEN** a reviewer applies the change's review phase (`/sai-5-review`) or any other review-gate check to a `budget-*` skill file modified by this change
- **THEN** the check SHALL verify the file's `## Dispatch mode` section names one of the three permitted dispatcher classes (main agent, routed SAI coordinator, or routed SAI worker)
- **AND** SHALL flag any file whose section is missing or names an unpermitted class
- **AND** a follow-up change may automate the check via a dedicated doctor capability; this change does not introduce one
