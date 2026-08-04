# review-phase-coordinator Specification

## Purpose
TBD - created by archiving change sai-5-review-coordinator-worker-split. Update Purpose after archive.
## Requirements
### Requirement: Routed review entrypoints use a terminal-only coordinator

The Claude Code and opencode `/sai-5-review` entrypoints SHALL invoke a review coordinator and its harness-specific review-worker binding. The coordinator SHALL own lifecycle routing and terminal presentation only; GitHub Copilot SHALL remain on its existing inline review path.

#### Scenario: Routed harness starts review
- **WHEN** Claude Code or opencode invokes `/sai-5-review`
- **THEN** the wrapper enters the review coordinator and its matching review-worker binding
- **AND** it does not execute the inline review instruction as the coordinator's technical workflow

#### Scenario: Copilot starts review
- **WHEN** GitHub Copilot invokes `/sai-5-review`
- **THEN** its existing inline review prompt remains the execution path
- **AND** it does not require a routed review worker or binding

### Requirement: Coordinator supplies the shared phase adapter fields

The review coordinator SHALL reuse `sai/orchestration/coordinator-contract.md` unchanged and SHALL supply the seven adapter fields `original_envelope`, `dispatch_operation`, `continuation_operation`, `allowed_nonterminal_extensions`, `extension_handlers`, `replacement_reconstruction_fields`, and `terminal_navigation`.

#### Scenario: Coordinator initializes a review invocation
- **WHEN** a routed review command starts
- **THEN** it constructs the original envelope and all seven review adapter fields
- **AND** it dispatches exactly one review worker through the active binding

### Requirement: Review invocation envelope preserves both positional arguments

The coordinator SHALL construct `original_envelope` with the complete argument string preserved. Claude Code SHALL carry the full command argument string in `arguments_value`; opencode SHALL copy the complete substituted value after its change-name argument label into `wrapper_echo_value`, preserving both the change name and optional parent branch for worker-owned parsing.

#### Scenario: Routed review receives a parent branch
- **WHEN** the user invokes `/sai-5-review my-change develop`
- **THEN** the worker receives both `my-change` and `develop` through the original envelope
- **AND** the coordinator does not resolve or discard either positional value

### Requirement: Coordinator performs no technical review I/O

The review coordinator SHALL NOT run prerequisites, resolve a change, read or write artifacts, inspect git, load a diff, perform review passes, run tests, apply mutations, or make findings. Those operations SHALL belong exclusively to the review worker.

#### Scenario: Technical work is requested
- **WHEN** review requires repository, artifact, git, diff, test, or mutation information
- **THEN** the coordinator delegates it to the review worker
- **AND** the coordinator performs no equivalent technical operation itself

### Requirement: Review lifecycle results are closed and validated

The coordinator SHALL validate every worker result before acting on it. A terminal result SHALL use exactly one of `completed`, `needs_input`, `failed`, or `cancelled`, with a string `summary` and string-list `changed_files`; `needs_input` SHALL also contain an exact question, ordered options, and binding-owned continuation metadata. After change resolution, payloads SHALL carry `resolved_change_name`.

#### Scenario: Worker returns a malformed result
- **WHEN** a worker result has an unknown status, missing required field, wrong field type, or invalid option shape
- **THEN** the coordinator treats it as a failed lifecycle result
- **AND** it does not perform technical recovery or invent missing payload data

#### Scenario: Worker requests change selection
- **WHEN** the worker returns `needs_input`
- **THEN** the coordinator presents the exact worker-authored question and ordered options through the native picker
- **AND** forwards the exact selected value through the active binding

### Requirement: Coordinator maintains the changed-files union

The coordinator SHALL initialize an invocation-scoped ordered, duplicate-free `changed_files` union and SHALL add every worker-reported path in first-seen order. It SHALL preserve the union across input, continuation, and replacement-worker recovery.

#### Scenario: Worker reports repeated paths
- **WHEN** multiple lifecycle results report the same path or report paths in different orders
- **THEN** the terminal union contains each path once
- **AND** paths retain their first-seen order

### Requirement: Coordinator retries continuation before replacement

The coordinator SHALL attempt same-worker continuation first. If continuation fails, it SHALL preserve the original envelope, changed-files union, exact opaque input history, and required review reconstruction fields, and SHALL dispatch at most one replacement worker. If required reconstruction data is unavailable, it SHALL return a failed lifecycle result without dispatching a replacement.

#### Scenario: Same-worker continuation fails
- **WHEN** the active binding cannot continue the review worker
- **THEN** the coordinator dispatches no more than one replacement worker with complete reconstruction state
- **AND** it does not send the prior worker journal or artifact contents to the replacement

### Requirement: Terminal output preserves the review completion boundary

After a completed worker result, the coordinator SHALL print the worker-authored `summary` verbatim. That summary SHALL contain severity counts, top three Blockers when present, report path, parent-branch statement, and the existing `## Recommended Audits` block with all three audit lines. The coordinator SHALL never parse, split, reconstruct, or recompose the summary or its audit block. It SHALL then print the exact existing review completion boundary, `Review done.`, and stop without presenting an artifact-feedback gate.

#### Scenario: Review completes
- **WHEN** the worker returns `completed`
- **THEN** the coordinator prints the worker-authored summary verbatim, including all three recommended-audit lines
- **AND** it prints the invocation-scoped changed-file union
- **AND** it prints `Review done.`
- **AND** it does not read `review.md`, parse or recompose the summary, add findings, or start another lifecycle phase

#### Scenario: Review fails or is cancelled
- **WHEN** the worker returns `failed` or `cancelled`
- **THEN** the coordinator prints the supplied blocking or clean-stop summary and changed-file union
- **AND** it stops without technical recovery

