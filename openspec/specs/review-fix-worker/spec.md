# review-fix-worker Specification

## Purpose
TBD - created by archiving change review-direct-build-option. Update Purpose after archive.

## Requirements

### Requirement: Findings-Driven Code Fix

The review-fix worker SHALL apply only the supplied selected findings directly on code without regenerating implementation.md or tasks.md. The labeled exclusion list SHALL remain unresolved, and if a selected fix necessarily resolves an excluded finding, the worker SHALL return a failed result before writing so the user can revise the selection.

#### Scenario: Code-only application

- **WHEN** findings cite code paths with concrete corrections
- **THEN** the worker modifies only code, tests, required configuration, or shipped schemas and leaves implementation artifacts untouched

#### Scenario: Selected finding is applied without an excluded fix

- **WHEN** a selected finding cites a code path with a concrete correction that does not require an excluded finding
- **THEN** the worker SHALL modify only the permitted repository artifacts needed for the selected correction and SHALL leave the excluded finding unresolved.

#### Scenario: Selected and excluded findings are coupled

- **WHEN** applying a selected finding necessarily resolves an excluded finding
- **THEN** the worker SHALL return a failed result before writing and SHALL explain the dependency.

### Requirement: Fix Loop Convergence Guard

The fix loop SHALL cap at three rounds and SHALL make no commit when selected findings do not converge. Continuations SHALL carry only the ordered outstanding selected findings or a verification note, while the initial exclusion list remains in force.

#### Scenario: Non-convergence

- **WHEN** a third completed round still carries findings
- **THEN** the run reports for the manual route with no staging and no commit

#### Scenario: Non-convergence respects exclusions

- **WHEN** a third completed round still carries selected findings or an unauthorized change
- **THEN** the worker SHALL return the remaining selected scope or verification issue without treating excluded findings as outstanding, and the coordinator SHALL stage nothing and commit nothing.

### Requirement: Review-Fix Worker Registration
The installation SHALL register sai-review-fix-worker as the fifteenth matrix worker with bindings and agents for both harnesses.
#### Scenario: Roster expansion
- **WHEN** the manifest is expanded for either harness
- **THEN** fifteen worker bindings and fifteen managed agents are projected including the review-fix worker
