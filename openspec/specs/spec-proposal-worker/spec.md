# Spec Proposal Worker Specification

## Purpose

Define the spec-proposal worker's progress-event emission: carrying only the canonical spec plan step ids in plan order, the changed files, and the terminal-payload closing contract.

## Requirements

### Requirement: Spec worker emits progress events

The spec-proposal worker SHALL emit progress events, after prerequisite checks and change resolution complete, whenever one or more plan steps complete. Every event SHALL carry worker-authored `emitted_on`, only the canonical step ids enumerated by `spec-progress-plan` (`prereqs-and-change`, `research`, `proposal`, `specs`, `validation`, `review`), in plan order, plus the files changed since the preceding result. The worker SHALL NOT author, extend, or reorder the plan, and SHALL NOT emit a progress event before resolution or in place of a terminal payload.

The worker SHALL report one batch per completed act: the startup act (prerequisite checks plus change resolution) carries `prereqs-and-change`; the unconditional structured research act carries `research`; writing `proposal.md` carries `proposal`; writing the change's `specs/**/*.md` carries `specs`; artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation carry `validation`; a completed review pass reporting `High=0` carries `review` per `review-step-evidence-marking`. The research batch SHALL be emitted after the startup handshake and before proposal generation, even when the `Ready to Propose` handoff supplies Research Leads. A research batch MAY carry an empty `changed_files` list because research writes no file.

A feedback turn SHALL NOT emit a progress event, except that a feedback turn which runs a review pass reporting `High=0` while the `review` step is still unmarked SHALL emit exactly one progress event carrying `review`. No feedback turn SHALL emit a progress event carrying any other step id.

#### Scenario: startup batch

- **WHEN** the spec worker passes prerequisite checks and resolves the change
- **THEN** it SHALL emit one progress event carrying `prereqs-and-change`

#### Scenario: research batch

- **WHEN** the spec worker completes structured research for the resolved request
- **THEN** it SHALL emit one progress event carrying only `research`
- **AND** the event SHALL occur after `prereqs-and-change` and before `proposal`
- **AND** structured research SHALL have reached the existing approximately 80% research-confidence threshold defined by `spec-research-consumption`, whether or not the request carries a Ready to Propose handoff
- **AND** the event SHALL still be emitted when Research Leads are present in the handoff

#### Scenario: research batch has no file writes

- **WHEN** structured research completes without writing a file
- **THEN** the `research` progress event SHALL carry `changed_files: []`
- **AND** the existing coordinator/shared-runner progress validation SHALL accept that empty list without requiring a file write

#### Scenario: proposal batch

- **WHEN** the spec worker has written `proposal.md`
- **THEN** it SHALL emit one progress event carrying `proposal`, with `changed_files` listing every path written since the preceding result

#### Scenario: specs batch

- **WHEN** the spec worker has written the change's `specs/**/*.md`
- **THEN** it SHALL emit one progress event carrying `specs`, with `changed_files` listing every path written since the preceding result, including any permitted root `GLOSSARY.md` update and any consistency-driven re-edit of `proposal.md`

#### Scenario: validation batch

- **WHEN** the spec worker completes artifact verification and derives the decision summary
- **THEN** it SHALL emit one progress event carrying `validation`

#### Scenario: review batch

- **WHEN** a worker-owned review pass completes and reports `High=0`
- **THEN** the worker SHALL emit one progress event carrying `review`

#### Scenario: ordinary feedback turns emit no progress

- **WHEN** the spec worker processes coordinator-forwarded artifact feedback that runs no review pass
- **THEN** it SHALL NOT emit a progress event, because no plan step completes during that turn

#### Scenario: a user-requested review pass during a feedback turn may mark review

- **WHEN** a feedback turn runs a user-requested review pass that reports `High=0` and the `review` step is not yet marked
- **THEN** the worker SHALL emit exactly one progress event carrying `review`
- **AND** it SHALL carry no other step id

#### Scenario: progress never closes the run

- **WHEN** the spec worker finishes the phase
- **THEN** it SHALL still return exactly one terminal lifecycle status and SHALL NOT close with a progress event

### Requirement: Spec-proposal worker classifies failures and owns its repair surface

The spec-proposal worker SHALL replace an unguided generic failed-blocker outcome with the shared `failure_class` rule. After resolution, every failed result SHALL carry the closed worker `failure_class` and boolean `unrecoverable` fields in addition to the existing lifecycle metadata. The worker's authorized artifact surface SHALL be `proposal.md`, `specs/**/*.md`, and permitted root `GLOSSARY.md` updates; it SHALL not write design, task, interface, implementation, or recovery metadata. A same-worker recovery continuation SHALL accept only the coordinator's ordered diagnosis and SHALL re-run the existing spec verification before returning `completed`.

#### Scenario: Spec generation failure is classified
- **WHEN** proposal or spec generation fails after change resolution
- **THEN** the worker SHALL return `generation-error` unless a more specific shared class applies
- **AND** the result SHALL include concrete non-raw evidence and `unrecoverable`

#### Scenario: Spec validation failure is classified
- **WHEN** the worker's proposal/spec consistency, scenario, or completion validation fails
- **THEN** it SHALL return `validation-failed` with evidence naming the failed validation boundary
- **AND** it SHALL not return the generic phrase `failed for blockers` as its only diagnosis

#### Scenario: Unsafe spec continuation is vetoed
- **WHEN** worker evidence shows that a correction would require editing a forbidden phase artifact or resolving an authoritative contradiction outside the worker
- **THEN** the worker SHALL set `unrecoverable: true` when continuation is unsafe
- **AND** SHALL return the applicable class without claiming a coordinator Cause Locus

#### Scenario: Recovery remains worker-owned
- **WHEN** the coordinator sends `continue_after_recovery` with a diagnosis whose correction boundary is inside the spec surface
- **THEN** the same spec worker SHALL apply the correction and verify `proposal.md` and `specs/**`
- **AND** the worker SHALL return `completed` only after verification while the coordinator writes nothing

### Requirement: Spec failure classification preserves normal progress and feedback

Adding classification and recovery continuation SHALL not change the canonical spec progress plan, artifact-feedback gate, worker-owned feedback edits, automatic-review behavior, or terminal payload rules. Recovery announcements and diagnosis records are coordinator conversation text and SHALL not mark, extend, or alter the progress plan.

#### Scenario: Clean spec path is unchanged
- **WHEN** spec work completes without a non-clean closure
- **THEN** progress, feedback, review, changed-file ordering, and the existing terminal lifecycle SHALL be unchanged
- **AND** no diagnosis route SHALL run

#### Scenario: Recovery does not create a new progress step
- **WHEN** a spec worker resumes after a diagnosis
- **THEN** it SHALL use only the existing progress ids and terminal statuses
- **AND** it SHALL not emit a recovery progress id or persist a recovery counter
