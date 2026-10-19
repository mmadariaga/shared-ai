# spec-block-intake-validation Specification

## Purpose
Validate Ready to Propose blocks pasted into `/sai-1-spec` creation with the dispatchable contract before any change resolution or write, covering the Manual route.

## Requirements

### Requirement: Block attempts are validated before resolution or any write

In creation mode a request SHALL be a block attempt when it carries the Ready to Propose heading or passes the loose profile. Before resolution or writes the spec worker SHALL validate the request with `check --profile dispatchable`, using `--block-file` for a verified supervised request and stdin for a manual paste. Structural violations SHALL write nothing and identify every block index, line, problem, and detail. A degraded paste SHALL fail validation. Existing implementation-item rules SHALL remain in force.

#### Scenario: Degraded paste is rejected

- **WHEN** a block with lost bold labels is pasted into `/sai-1-spec`
- **THEN** the worker writes nothing and shows the violations with line numbers

#### Scenario: Block without an implementation item is rejected

- **WHEN** a pasted block carries `**Implementation Details**` as `- None`
- **THEN** validation fails before change resolution and nothing is written

### Requirement: Flagged lines are judged before creation proceeds

When validation lists pending flagged lines the worker SHALL judge exactly those lines, save a JSON-array verdict file, and rerun dispatchable validation with `--block-file` and `--verdicts-file` through the shared composer. Manual pasted requests SHALL first be saved to a file for this step. A violation SHALL prevent resolution and writes and report its clause, line, and evidence. Creation SHALL proceed only on `dispatchable: true`, then resolve the block change name. Manual requests SHALL remain validated on their own merits without hash comparison; supervised requests SHALL first pass stored-file verification.

#### Scenario: Hand-edited dispatchable block proceeds

- **WHEN** a hand-edited block passes the profile and every flagged line receives a `context` verdict
- **THEN** the worker resolves the change name from the block and proceeds as creation

### Requirement: Refinement mode is unchanged

A request carrying an existing change name plus feedback and no block SHALL follow refinement mode without dispatchable validation.

#### Scenario: Refinement skips block validation

- **WHEN** `/sai-1-spec` receives an existing change name with feedback
- **THEN** no dispatchable check runs and refinement proceeds as before
