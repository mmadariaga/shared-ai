# green-conflict-stop Specification

## ADDED Requirements

### Requirement: Bounded GREEN iteration with a defined unpassable boundary

The implementation dispatch iterates on the implementation — confined to non-test files — to make the test-writer's tests pass. This iteration is bounded: the dispatch SHALL STOP and report the Step as unpassable when either (a) it concludes the tests cannot be satisfied by any change confined to non-test files (i.e. passing would require editing a test file or the declared interface), or (b) repeated implementation attempts make no progress toward the failing assertion. It SHALL NOT iterate indefinitely, and SHALL NOT cross the boundary into editing tests or the interface to force a pass.

#### Scenario: Implementation change would require editing a test

- **WHEN** the implementation subagent determines the only way to make a failing test pass is to change the test or the interface it asserts against
- **THEN** it STOPs and reports the Step as unpassable rather than continuing to iterate or editing the test

#### Scenario: Repeated attempts make no progress

- **WHEN** the implementation subagent has made repeated implementation-only attempts and the assertion still fails with no progress
- **THEN** it STOPs and reports the Step as unpassable rather than iterating indefinitely

### Requirement: An unpassable GREEN halts to the coordinator, never resolved by the subagent

When the implementation dispatch cannot make the test-writer's tests pass within the bounded iteration above, it SHALL STOP and report the failure to the coordinator, leaving all test files unmodified per the implementation-subagent test-file prohibition in `apply-test-impl-split`. A failing GREEN is either an implementation bug or a wrong test/interface, and which one it is SHALL be decided by a human, never by the subagent — even when the subagent believes the test is wrong.

#### Scenario: Implementation cannot pass the test

- **WHEN** the implementation subagent has exhausted bounded implementation-only iteration and the test-writer's tests still fail
- **THEN** it STOPs and reports the failure to the coordinator, leaving the test files unmodified, rather than editing the test to make it pass

#### Scenario: Subagent suspects the test is wrong

- **WHEN** the implementation subagent believes the failing test encodes a wrong assertion or a wrong interface
- **THEN** it still does NOT edit the test; it STOPs and reports its suspicion to the coordinator so a human can decide whether the fault is in the implementation, the test, or the interface

### Requirement: Coordinator surfaces the GREEN conflict to the human

When the implementation dispatch reports an unpassable GREEN, the coordinator SHALL surface the conflict to the user and SHALL NOT mark the Step's checkboxes, propose a commit, or advance to the next Step until the human resolves it.

#### Scenario: Coordinator receives a GREEN-conflict report

- **WHEN** the implementation subagent reports that GREEN will not pass for a testable Step
- **THEN** the coordinator presents the conflict to the user, does not mark that Step complete, and does not proceed to the next Step until the human decides
