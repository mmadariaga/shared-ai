# Worker Lifecycle Protocol Specification

## Purpose

Define the common lifecycle protocol shared across all worker types (design, implementation, review, etc.), including terminal statuses, continuation semantics, binding metadata, changed-file aggregation, and reconstruction metadata.

## Requirements

### Requirement: Canonical shared lifecycle ownership
The worker lifecycle protocol SHALL be defined once at the shared orchestration lifecycle seam and SHALL be consumed by every routed planning worker and coordinator. Phase contracts MAY extend the protocol only with phase-specific fields or events already permitted by their capability specifications.

#### Scenario: Common lifecycle mechanics are changed
- **WHEN** a maintainer changes statuses, payload validation, binding-owned continuation metadata, changed-file aggregation, continuation, or fallback mechanics
- **THEN** the change SHALL be made in the canonical shared lifecycle contract
- **AND** routed phase contracts SHALL consume that contract without duplicating its normative mechanics

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

Binding metadata SHALL capture agent/task IDs separately from worker payloads.

#### Scenario: IDs captured separately
- **WHEN** a worker is dispatched
- **THEN** the binding SHALL capture the agent ID (Claude) or task ID (opencode) as separate metadata
- **AND** this metadata SHALL NOT appear in any worker-authored payload

### Requirement: continuation-before-replacement

Continuation SHALL be attempted first before dispatching a replacement worker.

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

### Requirement: Every closed payload carries worker emission time

Every terminal status, design notice, and progress event SHALL carry worker-authored `emitted_on` immediately after its `status` or `event` discriminator in `YYYY-MM-DDTHH:MM:SS±HH:MM` form. The value SHALL be validated and forwarded verbatim, including for pre-resolution and no-plan results.

#### Scenario: Lifecycle stream is timestamped
- **WHEN** any worker returns a terminal result, notice, or progress event
- **THEN** the coordinator validates its offset-bearing `emitted_on` value and preserves it without recomputing or formatting it.

### Requirement: Audit workers share the timestamped progress extension

Review, security, performance, and accessibility workers SHALL use the same timestamped progress-event lifecycle as planning workers when their adapters declare a progress plan. The extension SHALL remain additive and SHALL not change terminal status semantics.

#### Scenario: An audit worker reports progress
- **WHEN** an audit worker completes one or more declared plan steps
- **THEN** it returns `event: "progress"` with `emitted_on`, `step_ids`, and `changed_files` before continuing the same worker.

### Requirement: Resumable worker sessions
The coordinator SHALL support continuing an existing implementation planning or design planning worker session using harness dispatch metadata captured by the binding while keeping durable OpenSpec artifacts as the authoritative workflow state.

#### Scenario: Resume available worker
- **WHEN** the binding has captured a worker session identifier for the current invocation
- **THEN** the coordinator SHALL resume that worker instead of starting a duplicate worker, and the worker SHALL use its current context plus durable artifacts as needed

### Requirement: Failed-resume fallback
When continuing an implementation planning worker fails, the established fallback SHALL remain unchanged: the coordinator dispatches a fresh implementation worker with the original invocation envelope and durable-artifact reconstruction instruction. When continuing a design planning worker fails, the coordinator SHALL dispatch a fresh design worker with the original invocation envelope, design-scoped opaque input history, any exact `pending_feedback`, and an instruction to reconstruct state independently from current durable artifacts — the retired `fast_track_banner_emitted` presentation flag SHALL NOT be part of design reconstruction metadata. Each opaque-history entry SHALL contain only the exact `question` and ordered `options` from one prior worker-authored `needs_input` payload plus the exact user-supplied `answer_value`; coordinator-authored prompts, labels, summaries, feedback-gate presentation, and inferred state SHALL be excluded. `pending_feedback` SHALL contain only the exact free-form artifact feedback awaiting a worker result that confirms application or discard and artifact verification. The coordinator SHALL forward these values without interpreting them or reading and packaging artifact context itself. If the coordinator lacks complete design reconstruction metadata needed for safe reconstruction, it SHALL return a failed result that asks the user to restart rather than risk repeating or losing an accepted decision, feedback turn, or user-visible notice.

#### Scenario: Design replacement reconstructs without banner-dedup state
- **WHEN** a fresh design worker is dispatched after a continuation failure
- **THEN** its reconstruction metadata carries the original envelope, opaque input history, pending feedback, and resolved name but no `fast_track_banner_emitted` field

### Requirement: Conversation-scoped worker identity
Every worker session identifier SHALL be retained only in coordinator conversation-scoped state for the current command invocation, SHALL never be persisted in OpenSpec artifacts, and SHALL not be reused by a new command invocation or a new chat. Opaque input history, `pending_feedback`, and feedback-presentation counters SHALL be design-lifecycle-scoped extensions only. A Continue-now transition SHALL create a new implementation lifecycle namespace and SHALL carry none of those design extensions or the design changed-file aggregate into implementation planning.

#### Scenario: Implementation transition carries no design extensions
- **WHEN** a Continue-now transition opens the implementation lifecycle namespace
- **THEN** none of the design-scoped extensions or the design changed-file aggregate cross into it

### Requirement: user-facing-question-content-contract

Every `needs_input` question SHALL comply with the question-context policy (`@sai/policies/question-context.md`). The design-only notice `message` SHALL comply with the policy's informational-notice subset. Compliance is satisfied at the worker source; coordinators SHALL NOT rephrase, enrich, or restructure the forwarded question or message.

#### Scenario: needs_input question complies with the policy

- **WHEN** a worker authors a `needs_input` payload
- **THEN** its `question` SHALL comply with the question-context policy

#### Scenario: design notice message complies with the notice subset

- **WHEN** a design worker emits the nonterminal notice event
- **THEN** the notice `message` SHALL comply with the question-context policy's informational-notice subset

#### Scenario: coordinator forwarding stays verbatim

- **WHEN** a compliant `needs_input` question or notice message reaches the coordinator
- **THEN** the coordinator forwards it exactly as authored, without rephrasing or adding context

### Requirement: progress-event-extension

As a further planning-phase-scoped, additive extension, after prerequisite checks pass and change resolution completes a design, spec-proposal, or implementation-planning worker MAY return a nonterminal progress event containing exactly `event: progress`, `step_ids`, and `changed_files`; the coordinator SHALL mark the reported step ids in the invocation-scoped progress plan, add every path in the event's `changed_files` to the invocation-scoped changed-file union in first-seen order, and the same worker SHALL resume after the coordinator sends the fixed protocol acknowledgement `continue_after_progress`. The progress extension SHALL NOT apply to audit workers, SHALL NOT alter the four-terminal-status contract, and the acknowledgement SHALL be protocol-only, never recorded as user input, opaque interaction history, or pending feedback.

#### Scenario: Planning worker emits a progress event

- **WHEN** planning prerequisites pass, the change is resolved, and the worker completes one or more declared plan steps
- **THEN** the worker SHALL return a nonterminal progress event with the completed step ids and changed files
- **AND** the coordinator SHALL mark them, add the changed files to the invocation-scoped union, and continue that same worker using `continue_after_progress`

#### Scenario: Progress acknowledgement is not interaction history

- **WHEN** the coordinator continues a planning worker using `continue_after_progress`
- **THEN** the acknowledgement SHALL be excluded from opaque input history, user-answer handling, and pending feedback

### Requirement: Contextual continuation uses the existing worker lifecycle

A contextual merge decision SHALL use the existing `needs_input` lifecycle status. A `more-context` response SHALL continue the same worker with pending alternatives and SHALL not introduce a new status, progress event, continuation field, or mutation channel.

#### Scenario: More-context continues the same worker

- **WHEN** the user requests more context for a pending semantic merge decision
- **THEN** the coordinator forwards the exact answer to the same worker and the worker returns another contextual decision without writing or staging

### Requirement: Phase-defined closed nonterminal extensions

The shared worker lifecycle protocol SHALL permit a declared phase-specific closed nonterminal extension with its discriminator, worker-authored `emitted_on`, summary, changed-files list, and exact additional fields. The merge conflict extension SHALL use `affected_files` and `continuation_state` with values `language-selection` or `strategy-analysis`.

#### Scenario: Conflict extension is validated

- **WHEN** the merge worker returns `event: conflict_detected`
- **THEN** the runner validates its closed shape before invoking the coordinator extension handler

#### Scenario: Extension carries conflict inventory separately

- **WHEN** the conflict extension reports affected paths
- **THEN** the runner keeps `affected_files` separate from the worker-write `changed_files` union

### Requirement: Ordered union survives extension routing

The coordinator SHALL maintain an ordered duplicate-free `changed_files` union across extension handling, continuations, and replacement reconstruction without resetting it.

#### Scenario: Extension does not reset reported paths

- **WHEN** a worker returns a conflict extension after previously reporting changed files
- **THEN** the coordinator retains the prior paths and appends only newly reported paths in first-seen order
