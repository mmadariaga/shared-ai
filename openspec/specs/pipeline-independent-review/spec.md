# pipeline-independent-review Specification

## Purpose

Define the isolated independent review pass for supervised spec artifacts.

## Requirements

### Requirement: Generated spec artifacts receive one independent review pass

For each successfully generated supervised change, the explore coordinator SHALL dispatch exactly one independent review pass after `proposal.md` and `specs/**` exist and before the normal user-facing artifact feedback gate is presented. The reviewer SHALL be an ad-hoc fresh subagent outside the shared routed worker lifecycle; it SHALL NOT add a lifecycle status, binding, continuation contract, or install projection. Its distinct non-lifecycle result variant SHALL be `review_complete` with a findings array that may be empty, `review_failed`, or `review_cancelled`. It SHALL evaluate proposal-to-spec consistency, coverage of the crystallized intent and constraints, testability of requirements and scenarios, and unsupported assumptions.

#### Scenario: spec artifacts are generated
- **WHEN** the supervised spec-proposal worker has produced `proposal.md` and `specs/**` for a tracked change
- **THEN** the pipeline runs one independent review pass over those artifacts
- **AND** it does not run a second review pass during the same supervised execution

#### Scenario: successful end-to-end review flow
- **WHEN** a supervised worker writes both spec artifacts and the reviewer returns findings
- **THEN** those findings are processed once through the artifact feedback gate capability's machine-feedback adapter
- **AND** the normal user-facing feedback gate follows at iteration 0 before the change reports completion

### Requirement: Reviewer context is independently isolated

The reviewer SHALL be a fresh subagent given only the emitted crystallized block and the resulting `proposal.md` and `specs/**`. It MUST NOT receive the explore conversation, the spec worker's reasoning history, prior reviewer state, other project files, or unrelated repository context.

#### Scenario: reviewer is dispatched
- **WHEN** the pipeline starts the independent review
- **THEN** the reviewer receives only the crystallized block and generated spec artifact set
- **AND** no explore or spec-worker reasoning transcript is included

### Requirement: Review findings pass through the artifact feedback gate

The reviewer SHALL return each finding as a separate item containing an identifier, severity, artifact location, issue statement, and recommended correction. Every actionable finding SHALL be supplied to the same spec-proposal worker through the artifact feedback gate capability's machine-feedback adapter. The pipeline SHALL NOT edit an artifact directly from reviewer output. After review findings are processed, the normal user-facing artifact feedback gate SHALL be presented at iteration 0, and every question raised while processing findings or presenting that gate SHALL be escalated to the user.

#### Scenario: reviewer returns actionable findings
- **WHEN** the independent reviewer identifies one or more actionable findings
- **THEN** the findings are processed through the artifact feedback gate capability's machine-feedback adapter
- **AND** all accepted edits are made by the spec-proposal worker
- **AND** discarded findings are reported with specific reasons
- **AND** machine-fed processing neither presents nor advances the user-facing gate

#### Scenario: reviewer returns no actionable findings
- **WHEN** the independent reviewer finds no actionable issue
- **THEN** no artifact edit is made on the reviewer's behalf
- **AND** the normal user-facing artifact feedback gate is still presented as `Give feedback (Recommended)` at iteration 0

#### Scenario: finding processing requires user input
- **WHEN** the spec-proposal worker returns `needs_input` while processing an independent-review finding
- **THEN** explore escalates the exact question and options to the user
- **AND** it continues the same worker only with the user's answer

### Requirement: Review failure does not authorize direct repair

If the independent reviewer fails or is cancelled, supervision SHALL report that the review pass did not complete and SHALL NOT fabricate findings, rerun the review automatically, or repair the artifacts directly. Reviewer failure or cancellation is non-terminal for the selected change: the generated artifacts SHALL remain available, the normal user-facing feedback gate SHALL still be presented at iteration 0, and the change's completed/uncompleted state SHALL ultimately follow the spec-proposal worker's terminal result rather than the reviewer result.

#### Scenario: reviewer fails
- **WHEN** the fresh review subagent returns `review_failed` or `review_cancelled`
- **THEN** explore reports that the independent review did not complete
- **AND** it performs no automatic retry or direct artifact edit
- **AND** it presents the normal user-facing artifact feedback gate
- **AND** the selected change's completion state remains governed by the spec-proposal worker
