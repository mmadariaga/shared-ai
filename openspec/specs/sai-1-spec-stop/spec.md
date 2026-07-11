# sai-1-spec Stop Specification

## Requirements

### Requirement: sai-1-spec termination behavior
After writing all spec files, sai-1-spec SHALL present the feedback gate (per the `artifact-feedback-gate` capability) and SHALL stop only after the user selects the proceed option `Finish step`. On that selection it prints the existing sai-1 stop message unchanged and exits. This change does not alter the wording of that message. The gate is NOT an approval gate: it MUST NOT ask for approval and MUST NOT write to `.openspec.yaml`.

#### Scenario: stop fires after Finish step
- **WHEN** sai-1-spec finishes writing `proposal.md` and `specs/**/*.md`, presents the feedback gate, and the user selects `Finish step`
- **THEN** it prints the existing sai-1 stop message (unchanged by this change) and exits without any follow-up question

#### Scenario: stop is deferred until Finish step
- **WHEN** sai-1-spec has written all artifacts but the user has not yet selected `Finish step` in the gate
- **THEN** the stop message is NOT printed and the step does not terminate

#### Scenario: no approval and no yaml write
- **WHEN** the user selects `Finish step` in the gate
- **THEN** sai-1-spec does not ask for approval and does not write to `.openspec.yaml`
