# apply-red-existing-test-update Specification

## Purpose
This capability defines the RED dispatch's authority to update exactly the existing tests a plan names, the validity of their declared failure as a RED failure, and the enforcement of the allowed set by `apply-step.js verify`, while GREEN keeps its absolute test-file prohibition.

## Requirements

### Requirement: RED may modify exactly the plan-named existing tests to update

When a Step's RED block names existing tests under `**Existing tests to update:**`, each by exact repository-relative path with a `compile` or `runtime` mode, the RED worker MAY modify exactly those files and SHALL declare each in field 8 by that path. Every other existing test remains forbidden to modify. A recovery continuation of the same RED worker SHALL keep this permission for exactly the same files and no others.

#### Scenario: RED updates a plan-named existing test

- **WHEN** a Step's RED block names `test/legacy.test.js` under `**Existing tests to update:**`
- **THEN** the RED worker may modify exactly that file and reports it in field 8

#### Scenario: RED modifies an unnamed existing test

- **WHEN** a RED dispatch modifies an existing test the plan does not name
- **THEN** `apply-step.js verify` returns `ok: false` and lists that path in `out_of_allowed`

#### Scenario: Recovery continuation keeps the update permission

- **WHEN** the coordinator continues the same RED worker with `continue_after_recovery`
- **THEN** the worker may still modify exactly the same plan-named files and no others

### Requirement: A declared compile or runtime failure of a plan-named existing test is a valid RED failure

A RED verification SHALL classify as valid, besides an assertion failure on the behavior under test, the `compile` or `runtime` failure of a test named under `**Existing tests to update:**` when it matches the mode declared for that test. Every other setup, import, or compilation failure SHALL remain a `wrong-failure`. The plan's Verify RED checkbox and the coordinator's RED judgment SHALL apply the same rule.

#### Scenario: Updated test fails in its declared mode

- **WHEN** a plan-named updated test fails in the `compile` or `runtime` mode the plan declares
- **THEN** the RED failure is classified as valid

#### Scenario: Any other non-assertion failure stays invalid

- **WHEN** a RED failure is a setup, import, or compilation error in a test the plan does not name for update
- **THEN** it is classified as `wrong-failure`

### Requirement: apply-step.js verify takes the RED allowed set from the plan-named existing tests

For a RED dispatch, `apply-step.js verify` SHALL read the allowed test paths from the Step's `**Existing tests to update:**` line as well as its retirements, and SHALL accept a path on that line when it appears in field 8.

#### Scenario: Plan-named update is allowed for RED

- **WHEN** a RED dispatch modifies a test named under `**Existing tests to update:**` and reports it in field 8
- **THEN** `verify` returns `ok: true` with that path absent from `out_of_allowed`

### Requirement: GREEN keeps the absolute test-file prohibition

A GREEN dispatch SHALL NOT modify any test file, including a test named under `**Existing tests to update:**`.

#### Scenario: GREEN modifies a plan-named updated test

- **WHEN** a GREEN dispatch modifies a test file the plan names under `**Existing tests to update:**`
- **THEN** `apply-step.js verify` returns `ok: false` and lists that path in `out_of_allowed`
