# direct-build-reviews Specification

## Purpose
TBD - created by archiving change enhanced-direct-build-reviews. Update Purpose after archive.

## Requirements

### Requirement: Direct Build Review Executes Project, Structural, and Empirical Checks
The pipeline SHALL execute all three review checks for every Direct Build functional fix-loop round: project checks when available, an always-on structural check, and empirical verification whenever feasible. The structural check SHALL include an excess-scope check: the diff SHALL implement no item listed under the block's `**Out of scope Implementation Details**` and SHALL contain no anticipatory implementation — no whole item, stub, hook, "for later" abstraction, or reference whose only purpose is to serve a later slice. Each such occurrence SHALL be recorded as a finding that requires reverting it, within the existing fix-round budget and cap-exhaustion semantics.

#### Scenario: Three checks run together
- **WHEN** a Direct Build result is reviewed against its Capabilities and Edge Cases
- **THEN** the review runs project checks when available plus the structural mapping, including the excess-scope check, plus empirical verification whenever feasible

#### Scenario: Anticipatory implementation is a revert finding
- **WHEN** the reviewed diff implements an out-of-scope item or contains code whose only purpose is to serve a later slice
- **THEN** the round records a finding that requires reverting that code, and the same implementer is continued within the existing round budget

### Requirement: Empirical Verification Exercises the Runnable Surface
The review SHALL verify requested behavior by exercising the affected flow through the project's runnable surface rather than inferring correctness from the diff alone.

#### Scenario: Behavior exercised instead of inferred
- **WHEN** a capability claims behavior that can be exercised via tests, CLI, script, or app
- **THEN** the review exercises that flow and uses the observed outcome as evidence
