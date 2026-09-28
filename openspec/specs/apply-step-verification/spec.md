# apply-step-verification Specification

## Purpose
Scopes `/sai-4-apply` test runs: each Step runs only its own test command, and the full repository suite runs once, at the terminal gate, before the functional review.

## Requirements

### Requirement: Step test command source of truth
Each RED block SHALL define one exact step-test-command selecting only tests authored by that Step, with explicit paths, selectors, and arguments. The plan SHALL define one full-suite-command for terminal use. The Step command SHALL NOT be the full-suite command. A plan written before the step-test-command line existed SHALL use the command of its RED block's `Verify RED` checkbox as the step-test-command.
#### Scenario: Plan defines scoped and terminal commands
- **WHEN** the plan verification commands are read
- **THEN** each RED block provides its Step-only command and the plan level provides the full suite command for terminal use

#### Scenario: Legacy plan without a step-test-command line
- **WHEN** a RED block has no step-test-command line
- **THEN** the command of its `Verify RED` checkbox is the step-test-command

### Requirement: Steps without a RED block
A Step without a RED block (green-direct or green-exception test-only) SHALL receive its own Automated checklist commands as its verification commands. No worker task disclosure SHALL carry the full-suite-command.
#### Scenario: Test-only Step verification
- **WHEN** a green-exception test-only Step is dispatched
- **THEN** its task disclosure carries only that Step's Automated checklist commands

### Requirement: RED execution scope
The RED worker SHALL run the injected step-test-command with its exact paths, selectors, and arguments, scoped to the current Step tests. An assertion failure on the behavior under test SHALL be classified as valid.
#### Scenario: RED runs the Step command
- **WHEN** RED executes its injected command
- **THEN** only the current Step tests run and a behavior assertion failure is reported as valid

### Requirement: GREEN execution scope
The GREEN worker SHALL run only the exact step-test-command copied unchanged from the current Step RED block, with identical paths, selectors, and arguments. GREEN SHALL NOT run tests from earlier or later Steps and SHALL NOT run the full repository suite at Step time.
#### Scenario: GREEN reruns the same Step command
- **WHEN** GREEN executes after valid RED
- **THEN** the same Step-only command passes without running other Steps or the full suite

### Requirement: Step verification gate
The coordinator SHALL run only executable Automated checks for the current Step, including the exact step-test-command after GREEN, and SHALL preserve the RED assertion-failure observation for the RED checklist item. The gate SHALL block advancement and commit on failure and SHALL exclude the full suite and Functional checks.
#### Scenario: Step gate stays scoped
- **WHEN** the coordinator verifies a Step after a dispatch return
- **THEN** only current-Step Automated checks are evaluated and a failure blocks commit and advancement

#### Scenario: Automated item runs the full suite
- **WHEN** a Step Automated item's command is the plan's full-suite-command
- **THEN** the coordinator classifies it an `out-of-scope` plan defect and hands it back to `/sai-3-implement` without running it

### Requirement: Terminal full-suite verification before functional review
The coordinator SHALL run the plan full-suite-command once after the last Step commit gate and before terminal functional review. Terminal functional review SHALL start only after the full suite passes.
#### Scenario: Terminal suite gates review
- **WHEN** all Steps have committed and the terminal gate runs
- **THEN** the full suite runs once and a passing result starts functional review

#### Scenario: Terminal suite fails
- **WHEN** the full-suite-command is missing from an existing `## Verification commands` section, cannot run, or fails
- **THEN** the coordinator reports the command and failure, runs no later terminal section, marks no Functional check, and the next apply run re-enters the terminal gate

#### Scenario: Legacy plan without a verification commands section
- **WHEN** the plan has no `## Verification commands` section
- **THEN** the coordinator prints `> Terminal suite gate: skipped — plan has no full-suite command` and continues to the functional review
