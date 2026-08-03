# pipeline-independent-review Specification

## Purpose

Define the isolated independent review pass for supervised spec artifacts.

## Requirements

### Requirement: Generated spec artifacts receive bounded independent review passes

For each successfully generated supervised change, the explore coordinator SHALL dispatch an independent review pass after `proposal.md` and `specs/**` exist and before the normal user-facing artifact feedback gate is presented. When a completed pass contains any `High` finding, it SHALL dispatch another fresh independent review after machine-feedback processing if fewer than three review passes have run. Each reviewer SHALL be an ad-hoc fresh subagent outside the shared routed worker lifecycle; it SHALL NOT add a lifecycle status, binding, continuation contract, or install projection. Its distinct non-lifecycle result variant SHALL be `review_complete` with a findings array that may be empty, `review_failed`, or `review_cancelled`. It SHALL evaluate proposal-to-spec consistency, coverage of the crystallized intent and constraints, testability of requirements and scenarios, and unsupported assumptions.

#### Scenario: spec artifacts are generated
- **WHEN** the supervised spec-proposal worker has produced `proposal.md` and `specs/**` for a tracked change
- **THEN** the pipeline runs an independent review pass over those artifacts
- **AND** it runs another fresh pass only when a completed pass contains a `High` finding and the three-pass bound permits it

#### Scenario: successful end-to-end review flow
- **WHEN** a supervised worker writes both spec artifacts and the reviewer returns findings
- **THEN** those findings are processed through the artifact feedback gate capability's machine-feedback adapter for that pass
- **AND** re-review follows when the severity stop condition is not met and the bound permits it
- **AND** the normal user-facing feedback gate follows at iteration 0 after the convergence loop terminates

### Requirement: Reviewer context is independently isolated

The reviewer SHALL be a fresh subagent given only the emitted crystallized block and the resulting `proposal.md` and `specs/**`. It MUST NOT receive the explore conversation, the spec worker's reasoning history, prior reviewer state, other project files, or unrelated repository context.

#### Scenario: reviewer is dispatched
- **WHEN** the pipeline starts the independent review
- **THEN** the reviewer receives only the crystallized block and generated spec artifact set
- **AND** no explore or spec-worker reasoning transcript is included

### Requirement: Review findings pass through the artifact feedback gate

The reviewer SHALL return each finding as a separate item containing an identifier, a `High`, `Medium`, or `Low` severity, artifact location, issue statement, and recommended correction. Every actionable finding from every completed pass SHALL be supplied to the same spec-proposal worker through the artifact feedback gate capability's machine-feedback adapter. The pipeline SHALL NOT edit an artifact directly from reviewer output. After convergence or cap exhaustion, the normal user-facing artifact feedback gate SHALL be presented at iteration 0, and every question raised while processing findings or presenting that gate SHALL be escalated to the user.

#### Scenario: reviewer returns actionable findings
- **WHEN** the independent reviewer identifies one or more actionable findings
- **THEN** the findings are processed through the artifact feedback gate capability's machine-feedback adapter
- **AND** all accepted edits are made by the spec-proposal worker
- **AND** discarded findings are reported with specific reasons
- **AND** machine-fed processing neither presents nor advances the user-facing gate

#### Scenario: reviewer returns no actionable findings

- **WHEN** the independent reviewer finds no actionable issue
- **THEN** no artifact edit is made on the reviewer's behalf
- **AND** the convergence loop terminates without another review pass
- **AND** the normal user-facing artifact feedback gate is still presented as `Give feedback (Recommended)` at iteration 0

#### Scenario: reviewer returns no actionable findings
- **WHEN** the independent reviewer finds no actionable issue
- **THEN** no artifact edit is made on the reviewer's behalf
- **AND** the normal user-facing artifact feedback gate is still presented as `Give feedback (Recommended)` at iteration 0

#### Scenario: finding processing requires user input
- **WHEN** the spec-proposal worker returns `needs_input` while processing an independent-review finding
- **THEN** explore escalates the exact question and options to the user
- **AND** it continues the same worker only with the user's answer

### Requirement: Review failure does not authorize direct repair

If any independent reviewer fails, is cancelled, or returns a `review_complete` result that violates the closed severity contract defined by the `pipeline-review-severity` capability, supervision SHALL report that the current review pass did not complete and SHALL NOT fabricate findings, rerun the failed review automatically, continue the convergence loop, or repair the artifacts directly. A severity contract violation SHALL enter this same failure path as `review_failed` without a new result variant, and SHALL be reported with its own cause so that a reviewer output-contract defect is distinguishable from a reviewer crash or cancellation. The report SHALL preserve the number of earlier completed passes, every finding and feedback disposition from those passes, and whether accepted artifact edits from the latest completed pass remain unvalidated by a later completed review. Reviewer failure or cancellation is non-terminal for the selected change: the generated artifacts SHALL remain available, the normal user-facing feedback gate SHALL still be presented at iteration 0, and the change's completed/uncompleted state SHALL ultimately follow the spec-proposal worker's terminal result rather than the reviewer result.

#### Scenario: reviewer fails
- **WHEN** the fresh review subagent returns `review_failed` or `review_cancelled`
- **THEN** explore reports that the independent review did not complete
- **AND** it performs no automatic retry or direct artifact edit
- **AND** it presents the normal user-facing artifact feedback gate
- **AND** the selected change's completion state remains governed by the spec-proposal worker

#### Scenario: reviewer violates the severity contract

- **WHEN** a fresh review subagent returns `review_complete` with a finding whose severity is missing or outside `High`, `Medium`, or `Low`
- **THEN** explore handles the pass as `review_failed` and reports that the independent review did not complete
- **AND** it performs no automatic retry, later review pass, or direct artifact edit
- **AND** it processes no finding from that pass through the machine-feedback adapter
- **AND** it reports the cause as a reviewer output-contract violation rather than a crash or cancellation
- **AND** it reports the count and findings history of every earlier completed pass with each feedback disposition
- **AND** it presents the normal user-facing artifact feedback gate

#### Scenario: first review pass fails

- **WHEN** the initial fresh review subagent returns `review_failed` or `review_cancelled`
- **THEN** explore reports zero completed review passes
- **AND** it reports no prior findings or unvalidated feedback edits

#### Scenario: later review pass fails after edits

- **WHEN** a review pass fails after an earlier completed pass accepted one or more artifact edits
- **THEN** explore preserves that earlier pass's findings and feedback dispositions
- **AND** it reports that the accepted edits were not validated by a later completed review
