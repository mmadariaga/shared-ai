# apply-red-existing-test-update Specification

## Purpose
This capability defines the RED dispatch's authority to update exactly the existing tests a plan names, the validity of their declared failure as a RED failure, and the enforcement of the allowed set by `apply-step.js verify`, while GREEN keeps its absolute test-file prohibition.

## Requirements

### Requirement: RED may modify exactly the plan-named existing tests to update

When the brief of `/sai-3-implement` names existing tests for update or removal, the RED worker MAY modify exactly those files. Every other existing test SHALL remain forbidden to modify.

#### Scenario: RED updates a plan-named existing test

- **WHEN** a step's brief names `test/legacy.test.js` for update
- **THEN** the RED worker may modify exactly that file and reports it in `changed_files`

#### Scenario: RED modifies an unnamed existing test

- **WHEN** a RED dispatch modifies an existing test the brief does not name
- **THEN** the coordinator treats the RED pass as not proven and sends RED a corrected instruction, which is an attempt of the step

#### Scenario: Recovery continuation keeps the update permission

- **WHEN** the coordinator continues the same RED worker with `continue_after_recovery`
- **THEN** the worker may still modify exactly the same brief-named files and no others

### Requirement: GREEN keeps the absolute test-file prohibition

A GREEN dispatch SHALL NOT modify any test file, including a test the brief names for update.

#### Scenario: GREEN modifies a plan-named updated test

- **WHEN** a GREEN dispatch modifies a test file the brief names for update
- **THEN** the coordinator restores that file from the index and counts the touch as an attempt of the step
