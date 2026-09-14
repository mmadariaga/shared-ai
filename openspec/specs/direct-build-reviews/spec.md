# direct-build-reviews Specification

## Purpose
TBD - created by archiving change enhanced-direct-build-reviews. Update Purpose after archive.
## Requirements
### Requirement: Direct Build Review Executes Project, Structural, and Empirical Checks
The pipeline SHALL execute all three review checks for every Direct Build functional fix-loop round: project checks when available, an always-on structural check, and empirical verification whenever feasible.

#### Scenario: Three checks run together
- **WHEN** a Direct Build result is reviewed against its Capabilities and Edge Cases
- **THEN** the review runs project checks when available plus the structural mapping plus empirical verification whenever feasible

### Requirement: Empirical Verification Exercises the Runnable Surface
The review SHALL verify requested behavior by exercising the affected flow through the project's runnable surface rather than inferring correctness from the diff alone.

#### Scenario: Behavior exercised instead of inferred
- **WHEN** a capability claims behavior that can be exercised via tests, CLI, script, or app
- **THEN** the review exercises that flow and uses the observed outcome as evidence

