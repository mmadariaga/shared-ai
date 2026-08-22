# apply-test-retirement Specification

## Purpose
TBD - created by archiving change red-block-test-retirement. Update Purpose after archive.
## Requirements
### Requirement: The RED dispatch removes exactly the plan-named retired test files

When a Step's plan names obsolete test files as retired — each with its exact repository-relative path inside the RED block — the test-authoring dispatch (the split-flow blind RED worker or the green-exception RED worker) MAY remove exactly those named files and nothing else. Every path not named as retired remains forbidden to write, modify, or remove. The exception grants no read access: removal MUST NOT require reading production files or change artifacts.

#### Scenario: Plan names a retired guard test

- **WHEN** a Step's RED block lists `test/report-template-parity.test.js` marked `retired`
- **THEN** the RED dispatch removes exactly that file and reports it in field 8, leaving every other test file untouched

#### Scenario: Removal attempt beyond the named set

- **WHEN** a RED dispatch would remove a test file the plan does not name as retired
- **THEN** the removal is out of scope and follows the existing forbidden-path handling

### Requirement: Retirement removal authorization survives recovery continuations

A `continue_after_recovery` continuation of the same test-authoring worker SHALL inherit the bounded retirement removal authorization for exactly the same plan-named retired test files and no others.

#### Scenario: Coordinator seals a missed retirement

- **WHEN** the coordinator's Verification Checklist finds a named retired file still present after the RED dispatch returns
- **THEN** the cause is in-scope for the RED worker and the coordinator continues the same worker to perform the removal before GREEN may be dispatched

### Requirement: Plans confine retirements to RED blocks with checklist sealing

Retirement entries SHALL live ONLY inside RED blocks, each carrying its exact repository-relative path marked `retired`; a green-direct Step SHALL NOT carry retirements. Every Step whose RED block retires files SHALL carry one Verification Checklist item per retired file asserting the file's absence, executed by the coordinator after the RED dispatch returns and before GREEN may be dispatched.

#### Scenario: Planner authors a guard-test-replacing Step

- **WHEN** a Step replaces an obsolete guard test with a new one
- **THEN** the plan lists the old file as retired inside the RED block and the Verification Checklist asserts its absence between RED return and GREEN dispatch

