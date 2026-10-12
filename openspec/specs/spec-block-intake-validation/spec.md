# spec-block-intake-validation Specification

## Purpose
Validate Ready to Propose blocks pasted into `/sai-1-spec` creation with the dispatchable contract before any change resolution or write, covering the Manual route.

## Requirements

### Requirement: Block attempts are validated before resolution or any write

In creation mode, a request SHALL be a block attempt when it carries the `## Ready to Propose` heading or passes the `loose` profile. For a block attempt the spec worker SHALL pipe the request body to `ready-to-propose.js check --profile dispatchable` before change resolution or any write; on a structural violation it SHALL write nothing and show every violation with its block index, line number, problem, and detail. A degraded paste such as lost bold labels or a missing `---` line SHALL fail this check.

#### Scenario: Degraded paste is rejected

- **WHEN** a block with lost bold labels is pasted into `/sai-1-spec`
- **THEN** the worker writes nothing and shows the violations with line numbers

#### Scenario: Block without an implementation item is rejected

- **WHEN** a pasted block carries `**Implementation Details**` as `- None`
- **THEN** validation fails before change resolution and nothing is written

### Requirement: Flagged lines are judged before creation proceeds

When the verdict lists pending flagged lines, the spec worker SHALL judge exactly those lines per `sai/policies/block-hygiene-judgment.md` and run the check again with the verdicts after a `<<<VERDICTS>>>` line. A `violation` verdict SHALL fail validation before change resolution, writing nothing and showing its clause, line number, and evidence. Creation SHALL proceed only when the verdict reports `"dispatchable": true`, after which the change name SHALL resolve from the block's `Change name`. No hash comparison SHALL apply, so a hand-edited block is validated on its own merits.

#### Scenario: Hand-edited dispatchable block proceeds

- **WHEN** a hand-edited block passes the profile and every flagged line receives a `context` verdict
- **THEN** the worker resolves the change name from the block and proceeds as creation

### Requirement: Refinement mode is unchanged

A request carrying an existing change name plus feedback and no block SHALL follow refinement mode without dispatchable validation.

#### Scenario: Refinement skips block validation

- **WHEN** `/sai-1-spec` receives an existing change name with feedback
- **THEN** no dispatchable check runs and refinement proceeds as before
