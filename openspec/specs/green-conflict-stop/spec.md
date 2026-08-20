# green-conflict-stop Specification

## Purpose
Defines the bounded GREEN conflict and human-stop behavior for apply steps.
## Requirements
### Requirement: Bounded GREEN iteration with a defined unpassable boundary

The implementation dispatch iterates on the implementation — confined to non-test files — to make the test-writer's tests pass. This iteration is bounded: the dispatch SHALL STOP and report the Step as unpassable when either (a) it concludes the tests cannot be satisfied by any change confined to non-test files (i.e. passing would require editing a test file or the declared interface), or (b) repeated implementation attempts make no progress toward the failing assertion. It SHALL NOT iterate indefinitely, and SHALL NOT cross the boundary into editing tests or the interface to force a pass. A recovery continuation SHALL use the same boundary and SHALL not convert a plan-artifact correction owned by the coordinator into permission for production or test edits.

#### Scenario: Implementation change would require editing a test

- **WHEN** the implementation subagent determines the only way to make a failing test pass is to change the test or the interface it asserts against
- **THEN** it STOPs and reports the Step as unpassable rather than continuing to iterate or editing the test

#### Scenario: Repeated attempts make no progress

- **WHEN** the implementation subagent has made repeated implementation-only attempts and the assertion still fails with no progress
- **THEN** it STOPs and reports the Step as unpassable rather than iterating indefinitely

### Requirement: An unpassable GREEN halts to the coordinator, never resolved by the subagent

When the implementation dispatch cannot make the test-writer's tests pass within the bounded iteration above, it SHALL STOP and report the failure to the coordinator, leaving all test files unmodified per the implementation-subagent test-file prohibition in `apply-test-impl-split`. A failing GREEN is either an implementation bug or a wrong test/interface, and which one it is SHALL be decided by a human, never by the subagent — even when the subagent believes the test is wrong. The worker's terminal lifecycle result SHALL be `status: failed`, `failure_class: blocking-contradiction`, and boolean `unrecoverable`; it SHALL set `unrecoverable: true` only when concrete worker-side evidence establishes that continuation is unsafe. Its summary SHALL name the Step, relevant test or interface artifact and concrete point, verification command or assertion, and observed failure boundary without including raw output. When the veto is false, the coordinator SHALL apply the shared Cause Locus eligibility rule rather than treating the class alone as a veto. This STOP SHALL not be converted into a validation-failure continuation without that coordinator diagnosis.

#### Scenario: Implementation cannot pass the test

- **WHEN** the implementation subagent has exhausted bounded implementation-only iteration and the test-writer's tests still fail
- **THEN** it STOPs and returns the failed blocking-contradiction outcome with concrete evidence, leaving the test files unmodified
- **AND** it does not edit the test to make it pass or enter recovery itself; the coordinator may apply the shared Cause Locus route only when the worker veto is false and a clear safe in-scope correction is proven

#### Scenario: Subagent suspects the test is wrong

- **WHEN** the implementation subagent believes the failing test encodes a wrong assertion or a wrong interface
- **THEN** it still does NOT edit the test
- **AND** it returns the failed blocking-contradiction outcome with the evidence needed for a human to decide whether the fault is in the implementation, test, or interface

#### Scenario: E13 GREEN STOP has evidence and no recovery attempt

- **WHEN** the GREEN worker reports `GREEN result = fail` and `STOP reached? = yes` for an unpassable Step
- **THEN** the coordinator validates the closed failure metadata and evidence
- **AND** if `unrecoverable: true`, spends zero recovery attempts, marks no checkbox, proposes no commit, and does not advance the Step

#### Scenario: E13 GREEN STOP with a false veto can use coordinator locus

- **WHEN** an unpassable GREEN STOP carries `failure_class: blocking-contradiction`, `unrecoverable: false`, and coordinator evidence proves a clear safe in-scope production correction
- **THEN** the coordinator SHALL retain the STOP evidence and use the shared Cause Locus and diagnosis-key rules
- **AND** it MAY spend one new recovery slot on the same GREEN worker without editing tests or interfaces

#### Scenario: An out-of-scope GREEN claim names its evidence boundary

- **WHEN** the coordinator considers whether a GREEN discrepancy is outside the worker's authorized scope
- **THEN** the evidence SHALL identify the relevant artifact and concrete point, verification assertion or command, and observed boundary
- **AND** absent that evidence the coordinator SHALL record an unresolved cause and spend zero recovery attempts rather than asserting out-of-scope

### Requirement: Coordinator surfaces the GREEN conflict to the human

When the implementation dispatch reports an unpassable GREEN, the coordinator SHALL independently rerun the Step's Verification Checklist and compare the baseline, changed paths, allowed files, and report before routing the conflict. When the worker veto is true, the Cause Locus is out-of-scope or unresolved, or the correction is unsafe, it SHALL surface the conflict to the user and SHALL NOT mark the Step's checkboxes, propose a commit, or advance to the next Step until the human resolves it. When `unrecoverable: false` and coordinator evidence proves a clear safe in-scope correction, it MAY enter the shared same-worker recovery route before the human gate. Independent verification SHALL not authorize the coordinator or GREEN worker to edit a test or interface, and SHALL not reduce the Step's verification coverage.

#### Scenario: Coordinator receives a GREEN-conflict report

- **WHEN** the implementation subagent reports that GREEN will not pass for a testable Step
- **THEN** the coordinator performs its independent verification and does not mark that Step complete
- **AND** it presents the conflict to the user when the veto, locus, or safety evidence blocks recovery, otherwise it may route one eligible same-worker diagnosis before the human gate

#### Scenario: Coordinator verification cannot erase the conflict

- **WHEN** the coordinator's independent evidence confirms the unpassable boundary or cannot disprove it safely
- **THEN** the coordinator preserves the failed blocking-contradiction outcome and human gate when the worker veto is true, the cause is out-of-scope or unresolved, or no safe correction exists
- **AND** it does not authorize prohibited test/interface edits; a false-veto in-scope cause follows the shared eligibility rule instead of being blocked by the class alone

