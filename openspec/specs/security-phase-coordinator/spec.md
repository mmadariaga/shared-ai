# security-phase-coordinator Specification

## Purpose
TBD - created by syncing change sai-6-security-coordinator-worker-split. Update Purpose after archive.
## Requirements

### Requirement: Routed security entrypoints use a terminal-only coordinator

The Claude Code and opencode `/sai-6-security` entrypoints SHALL invoke a security coordinator and their matching harness-specific security-worker binding. The coordinator SHALL own lifecycle routing and terminal presentation only. GitHub Copilot SHALL remain on its existing inline security path without requiring a routed worker or binding.

#### Scenario: Routed harness starts security
- **WHEN** Claude Code or opencode invokes `/sai-6-security`
- **THEN** the wrapper enters the security coordinator and matching security-worker binding
- **AND** it does not execute the inline security instruction as the coordinator's technical workflow

#### Scenario: Copilot starts security
- **WHEN** GitHub Copilot invokes `/sai-6-security`
- **THEN** its existing inline security prompt remains the execution path
- **AND** no routed security worker or binding is required

### Requirement: Coordinator supplies the shared phase adapter fields

The security coordinator SHALL reuse `sai/orchestration/coordinator-contract.md` unchanged and SHALL supply the seven adapter fields `original_envelope`, `dispatch_operation`, `continuation_operation`, `allowed_nonterminal_extensions`, `extension_handlers`, `replacement_reconstruction_fields`, and `terminal_navigation`. It SHALL preserve the complete invocation argument string for worker-owned parsing, including any change name and scope or parent-branch values.

#### Scenario: Routed security receives explicit arguments
- **WHEN** a routed invocation supplies a change name and additional supported security arguments
- **THEN** the coordinator places the complete argument string in the harness-defined original envelope field
- **AND** it does not parse, normalize away, or resolve those values before dispatch

### Requirement: Coordinator performs no technical security I/O

The security coordinator SHALL NOT run prerequisite checks, resolve a change, read or write change artifacts, inspect git, load or scope a diff, perform SAST or SCA, execute dependency-audit commands, delegate research, or make security findings. All such operations SHALL belong exclusively to the security worker.

#### Scenario: Technical audit work is requested
- **WHEN** security analysis requires repository, artifact, git, diff, SAST, SCA, or audit-tool information
- **THEN** the coordinator delegates the work to the security worker
- **AND** it performs no equivalent technical operation itself

### Requirement: Security lifecycle results preserve the terminal boundary

The coordinator SHALL validate every worker result before acting on it. A terminal result SHALL use exactly one of `completed`, `needs_input`, `failed`, or `cancelled`, with a string `summary` and string-list `changed_files`; `needs_input` SHALL preserve the worker-authored question, ordered options, and binding-owned continuation metadata. After change resolution, every lifecycle payload SHALL carry `resolved_change_name`. The coordinator SHALL preserve an ordered duplicate-free changed-file union across continuation or one replacement recovery, print a completed worker summary verbatim, print the exact existing stop message `Security audit done.`, and stop without an artifact-feedback gate or technical recovery.

#### Scenario: Security worker completes
- **WHEN** the worker returns `completed`
- **THEN** the coordinator prints the worker-authored summary and changed-file union without recomposing the summary
- **AND** it prints `Security audit done.` and stops

#### Scenario: Security worker requests input
- **WHEN** the worker returns `needs_input` for change selection or another supported lifecycle question
- **THEN** the coordinator presents the exact worker-authored question and ordered options through the native picker
- **AND** it forwards only the selected value through the active binding while preserving the continuation metadata

#### Scenario: Security worker reports repeated paths
- **WHEN** continuation or replacement recovery reports the same path more than once or reports paths in different orders
- **THEN** the coordinator's terminal changed-file union contains each path once
- **AND** paths retain their first-seen order across the full invocation

#### Scenario: Security worker fails or is cancelled
- **WHEN** the worker returns `failed` or `cancelled`
- **THEN** the coordinator prints the supplied blocking or clean-stop summary and changed-file union
- **AND** it stops without performing technical recovery
