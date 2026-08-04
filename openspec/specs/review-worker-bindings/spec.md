# review-worker-bindings Specification

## Purpose
TBD - created by archiving change sai-5-review-coordinator-worker-split. Update Purpose after archive.
## Requirements
### Requirement: Claude Code binding dispatches the numbered review worker

The Claude Code review-worker binding SHALL dispatch `sai-5-review-worker` through the managed worker agent, capture the agent identifier outside the worker payload, forward native user answers through same-worker continuation, and support at most one replacement dispatch with complete reconstruction state.

#### Scenario: Claude starts review work
- **WHEN** Claude Code invokes the routed review coordinator
- **THEN** the binding dispatches the numbered review worker and retains its agent identifier outside the lifecycle payload
- **AND** later input is sent to that same worker when continuation is available

### Requirement: opencode binding dispatches and continues the numbered review worker

The opencode review-worker binding SHALL dispatch `sai-5-review-worker`, capture the task identifier outside the worker payload, forward native question answers through same-task continuation, and support at most one replacement task with complete reconstruction state.

#### Scenario: opencode resumes review work
- **WHEN** the review worker returns `needs_input` and the coordinator receives a native answer
- **THEN** the binding continues the captured task with the exact answer value
- **AND** it does not add binding metadata to the worker-authored payload

### Requirement: Review worker nested delegation has two explicit branches

Both routed review bindings SHALL explicitly authorize two distinct nested branches: a read-only `budget-explorer`/`explore` branch for source and diff research, and a write-capable `budget-subagent`/`budget` branch for Pass 11 mechanical mutation execution. The bindings SHALL preserve the read-only restriction for all passes other than Pass 11.

#### Scenario: Read-only research is required
- **WHEN** the worker needs codebase context, per-file review, or glossary inspection
- **THEN** it dispatches only the read-only budget-explorer branch
- **AND** that branch cannot edit files or mutate the working tree

#### Scenario: Mutation I/O is required
- **WHEN** the worker executes an LLM mutation batch
- **THEN** it dispatches the write-capable budget-subagent branch
- **AND** that branch is limited to the assigned sequential apply/test/revert/verify contract

### Requirement: Nested mutation dispatch is explicit and sequential

The review-worker binding SHALL describe the Pass 11 nested-subagent output contract as one outcome per assigned mutation with outcome values `killed`, `survived`, `pre-check-failed`, or `revert-failed`, and SHALL require sequential batch dispatch. It SHALL not normalize the write-capable branch back to read-only exploration.

#### Scenario: Mutation branch returns results
- **WHEN** a write-capable mutation batch completes
- **THEN** its result identifies every assigned mutation exactly once with one allowed outcome
- **AND** the worker can reconcile the full mutation aggregate

### Requirement: Copilot receives no routed review binding

The review-worker binding capability SHALL be limited to Claude Code and opencode. It SHALL not add a Copilot routed worker definition, forwarding skill, or binding, and it SHALL document that Copilot retains the inline adapter path for this change.

#### Scenario: Installation surfaces are inspected
- **WHEN** routed review-worker assets are enumerated
- **THEN** Claude Code and opencode assets are present
- **AND** no Copilot routed review-worker asset is required

