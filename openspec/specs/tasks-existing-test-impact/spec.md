# tasks-existing-test-impact Specification

## Requirements

### Requirement: Each tasks.md step declares the existing tests it breaks

`sai/instructions/design.md` SHALL require every `## Step N` section of `openspec/changes/{name}/tasks.md` to declare which **existing** tests the step's change breaks.

The declaration SHALL be emitted under the pinned literal label `**Existing Tests Broken**`, as the fifth and last sub-field of the step section, immediately following `**Testing Strategy**`. The label and position are fixed by the `tasks-scaffold-format` capability; this capability defines the field's content.

The field SHALL name the affected test files or test suites concretely. When the step breaks no existing test, the field SHALL be emitted with an explicit `None` rather than omitted, so a reader can distinguish "no impact" from "not analyzed".

The field concerns *existing* tests only. New tests the step adds are covered by the step's `**Testing Strategy**` and by `interfaces.md`; they SHALL NOT be listed here.

#### Scenario: step breaking existing tests names them

- **WHEN** a step changes behavior that existing tests assert on
- **THEN** the step's existing-tests-broken field names the affected test files or suites

#### Scenario: step breaking no existing test

- **WHEN** a step breaks no existing test
- **THEN** the field is present with an explicit `None`
- **AND** it is NOT omitted from the step

#### Scenario: new tests are not listed in this field

- **WHEN** a step adds new tests
- **THEN** those new tests appear in `**Testing Strategy**` and `interfaces.md`
- **AND** they do NOT appear in the existing-tests-broken field

### Requirement: Each declared breakage states its failure mode

Every existing test named in the field SHALL state its failure mode as one of two tokens:

- `compile` — the test no longer compiles or resolves (a changed signature, a removed symbol, a renamed type). The failure is structural and surfaces before the test runs.
- `runtime` — the test compiles but its assertions no longer hold against the new behavior.

The distinction carries **effort and ordering** information: `compile` breakage is structural, mechanical, and bulk-fixable; `runtime` breakage requires per-test judgment about what the new expected value is.

The distinction SHALL NOT be read as a commit-boundary discriminator. Per `atomic-commit-planning`, both failure modes SHALL be resolved within the same step — a commit boundary never leaves the suite red. `runtime` records that the fix is costlier per test, not that it may be postponed.

#### Scenario: signature change breaks compilation

- **WHEN** a step changes a function signature that existing tests call
- **THEN** those tests are declared with failure mode `compile`

#### Scenario: behavior change breaks assertions only

- **WHEN** a step changes behavior without changing any signature the tests reference
- **THEN** the affected tests are declared with failure mode `runtime`

#### Scenario: failure mode is always stated

- **WHEN** any existing test is named in the field
- **THEN** it carries exactly one of `compile` or `runtime`

#### Scenario: runtime mode does not defer the fix

- **WHEN** a test is declared with failure mode `runtime`
- **THEN** its assertions are still updated within the same step
- **AND** the mode is NOT treated as permission to commit the step with that test failing

### Requirement: Central fixtures are ordered first within a step's breakage list

Within a step's existing-tests-broken field, shared or central test infrastructure — fixtures, builders, factories, base classes, and test helpers used by more than one test file — SHALL be listed before the individual test files that depend on them.

The ordering exists so the implementation phase updates the shared surface once, before the dependent tests, rather than discovering the shared dependency partway through.

#### Scenario: shared fixture listed before dependent tests

- **WHEN** a step breaks a shared test fixture and three test files that consume it
- **THEN** the fixture appears first in the field
- **AND** the three dependent test files follow it

#### Scenario: no shared infrastructure affected

- **WHEN** a step breaks only leaf test files with no shared fixture involved
- **THEN** no reordering obligation applies and the test files are listed directly

### Requirement: The field is a declaration, not a restatement of test content

The existing-tests-broken field SHALL name test files or suites and their failure mode. It SHALL NOT reproduce assertion values, expected outputs, or test body content — that content is excluded from `tasks.md` by the existing rule of conciseness and lives in `interfaces.md`.

#### Scenario: field stays at the naming altitude

- **WHEN** a step declares a broken test with failure mode `runtime`
- **THEN** the field names the test file and the failure mode
- **AND** it does NOT restate the assertion values that will change
