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

Both routed review bindings SHALL preserve the read-only research branch: budget-explorer on Claude Code and explore on opencode. Review SHALL use budget-ro and SHALL dispatch only read-only helpers for source context, diff research, glossary inspection, and adversarial findings checks. The retired write-capable mutation branch SHALL authorize no review work. Existing models, delegation limits, and generic binding mechanisms SHALL remain unchanged.

#### Scenario: Read-only research is required
- **WHEN** review needs source context, per-file review, or glossary inspection
- **THEN** it dispatches only the read-only research branch
- **AND** that branch cannot edit files or mutate the working tree

#### Scenario: Mutation I/O is required
- **WHEN** review follows its current step plan
- **THEN** no mutation I/O is required or dispatched
- **AND** only passes 1–11 and report writing are authorized

### Requirement: Copilot receives no routed review binding

The review-worker binding capability SHALL be limited to Claude Code and opencode. It SHALL not add a Copilot routed worker definition, forwarding skill, or binding, and it SHALL document that Copilot retains the inline adapter path for this change.

#### Scenario: Installation surfaces are inspected
- **WHEN** routed review-worker assets are enumerated
- **THEN** Claude Code and opencode assets are present
- **AND** no Copilot routed review-worker asset is required
