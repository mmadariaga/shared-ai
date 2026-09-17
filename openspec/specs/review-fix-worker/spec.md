# review-fix-worker Specification

## Purpose
TBD - created by archiving change review-direct-build-option. Update Purpose after archive.

## Requirements

### Requirement: Findings-Driven Code Fix
The review-fix worker SHALL apply the supplied review and audit findings directly on code without regenerating implementation.md or tasks.md.
#### Scenario: Code-only application
- **WHEN** findings cite code paths with concrete corrections
- **THEN** the worker modifies only code, tests, required configuration, or shipped schemas and leaves implementation artifacts untouched

### Requirement: Fix Loop Convergence Guard
The fix loop SHALL cap at three rounds and SHALL make no commit when findings do not converge.
#### Scenario: Non-convergence
- **WHEN** a third completed round still carries findings
- **THEN** the run reports for the manual route with no staging and no commit

### Requirement: Review-Fix Worker Registration
The installation SHALL register sai-review-fix-worker as the fifteenth matrix worker with bindings and agents for both harnesses.
#### Scenario: Roster expansion
- **WHEN** the manifest is expanded for either harness
- **THEN** fifteen worker bindings and fifteen managed agents are projected including the review-fix worker
