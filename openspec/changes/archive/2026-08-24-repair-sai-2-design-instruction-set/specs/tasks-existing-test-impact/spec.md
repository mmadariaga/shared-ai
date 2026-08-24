## MODIFIED Requirements

### Requirement: Each tasks.md step declares the existing tests it breaks
The active task-generation step at `sai/commands/design/steps/tasks.md` SHALL require every `## Step N` section of `openspec/changes/{name}/tasks.md` to declare which **existing** tests the step's change breaks.

The declaration SHALL be emitted under the pinned literal label `**Existing Tests Broken**`, as the fifth and last sub-field of the step section, immediately following `**Testing Strategy**`. The label and position are fixed by the `tasks-scaffold-format` capability; this capability defines the field's content.

The field SHALL name the affected test files or test suites concretely. When the step breaks no existing test, the field SHALL be emitted with an explicit `None` rather than omitted, so a reader can distinguish "no impact" from "not analyzed".

The field concerns *existing* tests only. New tests the step adds are covered by the step's `**Testing Strategy**` and by `interfaces.md`; they SHALL NOT be listed here.

#### Scenario: step breaking existing tests names them
- **WHEN** a step changes behavior that existing tests assert on
- **THEN** the step's existing-tests-broken field names the affected test files or test suites

#### Scenario: step breaking no existing test
- **WHEN** a step breaks no existing test
- **THEN** the field is present with an explicit `None`
- **AND** it is NOT omitted from the step

#### Scenario: new tests are not listed in this field
- **WHEN** a step adds new tests
- **THEN** those new tests appear in `**Testing Strategy**` and `interfaces.md`
- **AND** they do NOT appear in the existing-tests-broken field

#### Scenario: task-test-impact-uses-live-authority
- **WHEN** a task step is generated
- **THEN** its existing-test-impact field is emitted according to the active step-local task rule.

