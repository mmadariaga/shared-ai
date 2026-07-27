# Worker Lifecycle Protocol Specification

## Purpose

Define the common lifecycle protocol shared across all worker types (design, implementation, review, etc.), including terminal statuses, continuation semantics, binding metadata, changed-file aggregation, and reconstruction metadata.

## Requirements

### Requirement: implementation-worker-terminal-statuses

Implementation workers SHALL retain exactly the four terminal statuses.

#### Scenario: four statuses present
- **WHEN** an implementation worker produces a lifecycle payload
- **THEN** the status field SHALL be exactly one of: `completed`, `needs_input`, `failed`, or `cancelled`
- **AND** no other status value SHALL be accepted

### Requirement: implementation-workers-excluded-from-notices

Implementation workers SHALL NOT receive design notices or reconstruction extensions.

#### Scenario: notice never delivered to implementation worker
- **WHEN** a design notice is emitted
- **THEN** the coordinator SHALL NOT deliver it to the implementation worker

### Requirement: binding-metadata-separate-capture

Binding metadata captures agent/task IDs separately from worker payloads.

#### Scenario: IDs captured separately
- **WHEN** a worker is dispatched
- **THEN** the binding SHALL capture the agent ID (Claude) or task ID (opencode) as separate metadata
- **AND** this metadata SHALL NOT appear in any worker-authored payload

### Requirement: continuation-before-replacement

Continuation is attempted first before dispatching a replacement worker.

#### Scenario: continuation attempted first
- **WHEN** a `needs_input` payload is produced
- **THEN** the coordinator SHALL attempt continuation on the same worker using the captured continuation reference
- **AND** only if continuation fails SHALL a fresh worker be dispatched

### Requirement: changed-files-ordered-union

Changed files SHALL be maintained as an ordered union across continuation and replacement-worker results.

#### Scenario: union across continuation
- **WHEN** a continuation produces changed files
- **THEN** the coordinator SHALL append each new path to the ordered list, preserving the first occurrence of each path

#### Scenario: union across replacement
- **WHEN** a replacement worker is dispatched after continuation failure
- **THEN** the coordinator SHALL preserve the existing ordered union and add new files from the replacement worker

### Requirement: incomplete-reconstruction-metadata

Incomplete opaque reconstruction metadata SHALL return a restart failure instead of dispatching a replacement worker.

#### Scenario: incomplete metadata detected
- **WHEN** reconstruction metadata lacks required fields
- **THEN** the coordinator SHALL return a restart failure
- **AND** SHALL NOT dispatch a replacement worker or attempt to repair the metadata

### Requirement: Structured worker result
Every routed SAI planning worker SHALL author a structured payload with exactly one lifecycle status from `completed`, `needs_input`, `failed`, or `cancelled`, a concise summary, a complete changed-file list, and phase-specific outcome metadata needed by the coordinator for nontechnical navigation. As a design-only extension, after prerequisites pass a design worker MAY return a nonterminal notice event containing exactly `event: notice`, a user-facing `message`, and `changed_files`; the binding SHALL retain the same continuation reference, the coordinator SHALL print the message without interpretation, and the same worker SHALL resume after the coordinator sends the fixed protocol acknowledgement `continue_after_notice`. This notice extension SHALL NOT apply to implementation planning workers or alter their four-status contract. The notice acknowledgement is protocol-only and SHALL NOT be recorded as user input, opaque interaction history, or pending feedback. A `needs_input` payload SHALL additionally include a user-facing question and a closed option set when the decision is closed-choice. A harness binding SHALL capture the agent ID or task ID returned by dispatch and associate it with intermediate or `needs_input` results as coordinator-owned continuation metadata; the worker-authored payload SHALL NOT contain `continuation_reference` or be required to discover its own harness identifier. The coordinator SHALL accumulate the ordered union of `changed_files` from every payload or notice in the current invocation and SHALL retain that aggregate across continuation attempts and fresh-worker fallback, without reading git or artifacts to reconstruct it. `changed_files` SHALL include every authorized write since dispatch or the preceding result, not only the phase's primary artifact. A `failed` payload SHALL include a concise blocking summary. A `cancelled` payload SHALL represent a deliberate clean stop rather than an execution failure; no result SHALL include the contents of durable artifacts.

#### Scenario: Successful worker result
- **WHEN** an implementation planning or design planning worker completes its work and verification
- **THEN** its payload SHALL have status `completed`, a concise summary, and the files changed during the worker session

#### Scenario: Worker cannot proceed
- **WHEN** required user input is missing or execution fails
- **THEN** its payload SHALL have status `needs_input` or `failed` respectively, include the blocking summary, and include the changed files up to the point of the result

#### Scenario: Worker requests a closed choice
- **WHEN** change selection, approval, ADR/DDR consent, artifact feedback, or another phase decision requires a closed user choice
- **THEN** the worker-authored `needs_input` payload SHALL include the question, ordered option labels and values, and the current changed-file list, while the harness binding SHALL separately attach the dispatch identifier as coordinator-owned continuation metadata

#### Scenario: Continuation follows earlier writes
- **WHEN** one or more payloads report changed files before a continuation succeeds or falls back to a fresh worker
- **THEN** the coordinator SHALL union each payload's `changed_files` into the invocation aggregate and SHALL report the aggregate with the eventual terminal outcome even when a replacement worker does not report paths changed before fallback

#### Scenario: Phase navigation needs a resolved identifier
- **WHEN** a worker resolves a change name that a coordinator needs for a later nontechnical navigation action
- **THEN** the worker SHALL include that value as phase outcome metadata, without placing harness continuation identifiers in the worker-authored payload

#### Scenario: Design worker emits a preflight notice
- **WHEN** design prerequisites pass and fast-track parsing requires the existing banner
- **THEN** the worker SHALL return a nonterminal notice event with the exact banner message, the binding SHALL attach the existing continuation reference, and the coordinator SHALL print it and continue that same worker using `continue_after_notice`

#### Scenario: Notice acknowledgement is not interaction history
- **WHEN** the coordinator continues a design worker using `continue_after_notice`
- **THEN** the acknowledgement SHALL be excluded from opaque input history, user-answer handling, and pending feedback and SHALL NOT alter implementation-worker lifecycle behavior

#### Scenario: User declines a one-change selection
- **WHEN** the coordinator forwards an answer other than `yes` to the one-change selection question
- **THEN** the worker SHALL return `cancelled` with a concise clean-stop summary and SHALL not request the same selection again

### Requirement: Resumable worker sessions
The coordinator SHALL support continuing an existing implementation planning or design planning worker session using harness dispatch metadata captured by the binding while keeping durable OpenSpec artifacts as the authoritative workflow state.

#### Scenario: Resume available worker
- **WHEN** the binding has captured a worker session identifier for the current invocation
- **THEN** the coordinator SHALL resume that worker instead of starting a duplicate worker, and the worker SHALL use its current context plus durable artifacts as needed

### Requirement: Failed-resume fallback
When continuing an implementation planning worker fails, the established fallback SHALL remain unchanged: the coordinator dispatches a fresh implementation worker with the original invocation envelope and durable-artifact reconstruction instruction. When continuing a design planning worker fails, the coordinator SHALL dispatch a fresh design worker with the original invocation envelope, design-scoped opaque input history, any exact `pending_feedback`, the `fast_track_banner_emitted` presentation flag, and an instruction to reconstruct state independently from current durable artifacts. Each opaque-history entry SHALL contain only the exact `question` and ordered `options` from one prior worker-authored `needs_input` payload plus the exact user-supplied `answer_value`; coordinator-authored prompts, labels, summaries, feedback-gate presentation, and inferred state SHALL be excluded. `pending_feedback` SHALL contain only the exact free-form artifact feedback awaiting a worker result that confirms application or discard and artifact verification. The coordinator SHALL forward these values without interpreting them or reading and packaging artifact context itself. If the coordinator lacks complete design reconstruction metadata needed for safe reconstruction, it SHALL return a failed result that asks the user to restart rather than risk repeating or losing an accepted decision, feedback turn, or user-visible notice.

#### Scenario: Stale worker identifier
- **WHEN** a stored design worker identifier cannot be resumed
- **THEN** the coordinator SHALL start a fresh design worker with the original envelope, opaque input history, pending feedback when present, and reconstruction instruction, preserve the design invocation's accumulated changed-file union, and report the binding-augmented terminal result with that aggregate

#### Scenario: Implementation worker continuation fails
- **WHEN** a stored implementation worker identifier cannot be resumed
- **THEN** the coordinator SHALL use the preceding slice's original-envelope and durable-artifact fallback without requiring design interaction history, pending feedback, or presentation counters

#### Scenario: Continuation fails while artifact feedback is pending
- **WHEN** a design worker cannot be resumed after free-form artifact feedback was submitted but before completion was confirmed
- **THEN** the coordinator SHALL pass the exact `pending_feedback` to the replacement design worker and SHALL clear it only after the replacement confirms selective application or discard and artifact verification

#### Scenario: Safe reconstruction context is incomplete
- **WHEN** continuation fails after user input but the coordinator cannot provide a complete opaque interaction history for that input
- **THEN** it SHALL stop with a restart request and SHALL NOT dispatch a replacement worker that could repeat or lose the accepted decision

### Requirement: Conversation-scoped worker identity
Every worker session identifier SHALL be retained only in coordinator conversation-scoped state for the current command invocation, SHALL never be persisted in OpenSpec artifacts, and SHALL not be reused by a new command invocation or a new chat. Opaque input history, `pending_feedback`, `fast_track_banner_emitted`, and feedback-presentation counters SHALL be design-lifecycle-scoped extensions only. A Continue-now transition SHALL create a new implementation lifecycle namespace and SHALL carry none of those design extensions or the design changed-file aggregate into implementation planning.

#### Scenario: Invocation boundary resets worker state
- **WHEN** the user starts a new routed SAI planning invocation or opens a new chat
- **THEN** the coordinator SHALL start or resolve a fresh worker session from current durable artifacts and SHALL not rely on an identifier from the prior invocation

#### Scenario: Design transitions to implementation in the same invocation
- **WHEN** Continue now dispatches an implementation planning worker after design completion
- **THEN** the implementation worker SHALL receive a new continuation namespace, empty changed-file aggregate, no design opaque history, no pending feedback, and no design presentation counter


