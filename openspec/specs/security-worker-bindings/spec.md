# security-worker-bindings Specification

## Purpose
TBD - created by syncing change sai-6-security-coordinator-worker-split. Update Purpose after archive.
## Requirements

### Requirement: Claude Code and opencode bindings dispatch the security worker

The Claude Code and opencode security-worker bindings SHALL dispatch the canonical managed security worker with the complete original envelope, attempt same-worker continuation first, and permit at most one replacement-worker recovery when the binding can provide the required reconstruction fields. They SHALL preserve opaque input history and resolved lifecycle state without sending artifact contents as a substitute for reconstruction data.

#### Scenario: Routed security worker is dispatched
- **WHEN** a Claude Code or opencode coordinator starts a security invocation
- **THEN** its matching binding dispatches the numbered security worker with the complete original envelope
- **AND** the other harness binding is not involved in the invocation

#### Scenario: Same-worker continuation fails
- **WHEN** the active binding cannot continue the security worker
- **THEN** it attempts no more than one replacement dispatch with the preserved envelope and required reconstruction fields
- **AND** it does not invent missing lifecycle data or send report contents as replacement context

### Requirement: Security bindings authorize read-only research and bounded dependency audits

The bindings SHALL authorize read-only `explore` research with the existing security output contract and shall authorize only bounded execution of the supported dependency-audit commands needed for SCA. They SHALL reject generic write-capable worker delegation, package installation, dependency updates, production edits, dependency-file edits, and configuration mutation.

#### Scenario: Large security diff needs research
- **WHEN** the worker delegates inspection of a diff over the existing 500-LOC threshold
- **THEN** the binding permits read-only `explore` research within the eight-call audit cap
- **AND** each delegated result uses the required bounded evidence fields

#### Scenario: Worker requests an unapproved operation
- **WHEN** the worker requests a command outside the supported audit-tool allowlist or requests a write-capable branch
- **THEN** the binding rejects the operation
- **AND** the security audit remains read-only

### Requirement: Binding results preserve the shared lifecycle contract

The bindings SHALL forward `completed`, `needs_input`, `failed`, and `cancelled` results without changing worker-authored summaries, questions, ordered options, or `changed_files`. After change resolution, forwarded results SHALL retain `resolved_change_name`; `needs_input` SHALL retain binding-owned continuation metadata. GitHub Copilot SHALL remain outside these routed bindings and use the shared inline security invocation core instead.

#### Scenario: Worker asks the user to select a change
- **WHEN** a worker returns `needs_input` with ordered change options
- **THEN** the binding forwards the exact question, options, and continuation metadata to the coordinator
- **AND** it does not resolve or select a change on the user's behalf

#### Scenario: Worker completes after resolution
- **WHEN** a worker returns `completed` after resolving a change
- **THEN** the binding forwards `resolved_change_name`, the worker-authored summary, and the changed-file paths unchanged
- **AND** the Copilot inline path remains independent of the routed binding
