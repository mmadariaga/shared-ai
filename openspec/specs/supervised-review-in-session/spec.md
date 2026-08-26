# supervised-review-in-session Specification

## Purpose

TBD - seeded from delta spec `supervised-review-in-session` in change `supervised-in-situ-review`.

## Requirements

### Requirement: Run supervised review rounds under Plan

The existing in-session supervised review rounds SHALL be associated with Plan (unattended), retain their phase-specific counters and three-round bounds, and remain separate from the manual review loop.

#### Scenario: Plan enters review

- **WHEN** a Plan phase produces the required artifacts
- **THEN** the existing supervised review rounds process those artifacts with unchanged marking and convergence rules.

### Requirement: coordinator-performs-each-round

In the selector-dispatched supervised flow, each review round of a phase's artifacts SHALL be performed by the explore coordinator session itself through the review engine of the `review-engine-extraction` capability, invoked with the authoritative change name and the phase's artifact-set designator — `sai-1` for the spec phase (`proposal.md` and every `specs/**/*.md`), `sai-2` for the design phase (`design.md`, `tasks.md`, and `interfaces.md`). The pipeline SHALL NOT dispatch a reviewer subagent for any round: no fresh reviewer, persistent reviewer, reviewer result variant, reviewer binding, or install projection exists in the supervised flow. Each round SHALL produce its findings from that round's engine transaction over freshly read artifacts in their current state.

#### Scenario: spec rounds invoke the engine

- **WHEN** the supervised pipeline runs a spec-phase review round
- **THEN** the coordinator invokes the engine with the change name and the `sai-1` artifact-set designator
- **AND** no reviewer subagent is dispatched for that round

#### Scenario: design rounds invoke the engine

- **WHEN** the supervised pipeline runs a design-phase review round
- **THEN** the coordinator invokes the engine with the change name and the `sai-2` artifact-set designator
- **AND** no reviewer subagent is dispatched for that round

#### Scenario: no reviewer result variants exist

- **WHEN** a supervised review round completes
- **THEN** it produces findings, not a `review_complete`, `review_failed`, or `review_cancelled` result
- **AND** the pipeline does not create a reviewer binding, continuation, or install projection for the round

### Requirement: phase-picks-the-artifact-set

Auto SHALL NOT present the five-option picker and SHALL NOT stop to ask which artifacts to review: the coordinator SHALL select the artifact set by phase — `sai-1` during the spec phase, `sai-2` during the design phase — and proceed without user selection. The run does not stop to ask which artifacts to review because the phase determines the set.

#### Scenario: auto never presents the picker

- **WHEN** the supervised pipeline is ready to review a phase's artifacts
- **THEN** it does not present the five-option picker and does not ask which artifacts to review
- **AND** it selects the artifact set by phase and proceeds

#### Scenario: spec phase selects the sai-1 set

- **WHEN** the supervised pipeline reviews the spec phase's artifacts
- **THEN** the coordinator selects the `sai-1` artifact set without user selection

#### Scenario: design phase selects the sai-2 set

- **WHEN** the supervised pipeline reviews the design phase's artifacts
- **THEN** the coordinator selects the `sai-2` artifact set without user selection

### Requirement: explore-writes-nothing-directly

The in-session review SHALL be strictly read-only on the artifacts it reviews: explore SHALL NOT create, modify, or delete `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, `interfaces.md`, `change-overview.md`, or any other file under the change directory, and SHALL NOT write `overview.state` in any `.openspec.yaml`. Every artifact edit arising from a round's findings SHALL be made by the phase worker through the machine-feedback path of the `artifact-feedback-gate` capability; explore SHALL NOT repair artifacts directly from review output.

#### Scenario: review output never edits artifacts

- **WHEN** a supervised review round produces findings
- **THEN** explore does not edit any artifact from those findings
- **AND** every accepted correction is applied by the phase worker through the machine-feedback path

#### Scenario: explore remains read-only throughout the rounds

- **WHEN** any supervised review round runs
- **THEN** no file under the change directory is created, modified, or deleted by the review
- **AND** no `overview.state` is written

### Requirement: no-reviewer-failure-outcomes

Because the reviewer is the coordinator session itself, the outcomes `review_failed`, `review_cancelled`, and severity-out-of-contract rejection SHALL NOT exist as possible results of a supervised review round: the pipeline SHALL NOT report, retry, or classify any round by those results, SHALL NOT fabricate findings, and SHALL NOT handle a round as failed because its findings are not reviewer output. The coordinator forms findings through the engine per the shared review finding contract, so there is no reviewer output to validate against a severity contract.

#### Scenario: reviewer failure is not a possible result

- **WHEN** a supervised review round runs
- **THEN** no `review_failed` or `review_cancelled` result is produced, handled, or reported for it
- **AND** the pipeline does not retry, repair, or end the run on account of a reviewer failure

#### Scenario: severity out of contract is not a possible result

- **WHEN** a supervised review round produces findings
- **THEN** the findings are formed per the shared review finding contract of `sai/policies/artifact-review-contract.md`
- **AND** no severity-contract rejection path exists for the round's findings
