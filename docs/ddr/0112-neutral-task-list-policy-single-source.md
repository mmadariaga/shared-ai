# DDR 0112: Task-list semantics are harness-neutral and single-sourced; below three declared steps no list renders

## Status

Accepted

## Context

Claude Code and opencode expose different task-list tool mechanics (the Claude harness's task-list tool named `TodoWrite` per repo evidence; opencode's `todowrite` with a single `todos` array and full-replacement semantics), yet the pipeline's harness-universality rule requires both harnesses to behave identically. A two-step plan would otherwise render a noisy one-item list.

## Decision

`sai/policies/todo-structure.md` (new) is the single source of the task-list semantics: list structure (ordered steps with stable `id` and user-facing `label`), the state vocabulary (`pending` / `in_progress` / `completed`), the deterministic state derivation, the render-at-dispatch and run-closing reconciliation semantics, the minimum-threshold rule (a declared plan with fewer than three steps renders no task list on either harness; the constant lives only in the policy), the emission-ownership invariant, and the single-source reference rule. Each binding maps the policy to its own tool mechanism, mirroring the per-harness tool-mapping precedent of `sai/policies/remember.md:10-13`; consuming surfaces reference the policy and never restate the constant, following the single-source pattern of `sai/policies/question-context.md:29-31`.

## Alternatives Considered

- **Per-harness policies** — rejected: violates the harness-universality single-source precedent.
- **Threshold restated in each binding** — rejected: the minimum-threshold requirement demands the constant be single-sourced.
- **No threshold** — rejected: two-step plans render noisy one-item lists, and the proposal mandates the threshold.

## Consequences

The policy becomes the single source both bindings follow; changing the threshold means editing the policy and re-syncing bindings. The decision states properties that must hold identically on both harnesses at all times, which is why this record is a DDR.

## Provenance

User — the decision and its alternatives were settled in the design discussion recorded in `design.md` D4.
