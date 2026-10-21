# direct-build-reviews Specification

## Purpose
TBD - created by archiving change enhanced-direct-build-reviews. Update Purpose after archive.

## Requirements

### Requirement: Direct Build Review Executes Project, Structural, and Empirical Checks
The pipeline SHALL execute two review checks for every Direct Build functional fix-loop pass: an always-on structural check and empirical verification whenever feasible. The passes SHALL follow `sai/policies/incremental-review.md` with `base_sha` as the starting point: the first pass SHALL review the full diff (`git diff` from `base_sha`) against the block's Capabilities and Edge Cases, and every later pass SHALL run the same two checks on the delta since the previous pass's snapshot and on the direct consumers of the code it changed, nothing else. The ignored paths the implementer changed SHALL be passed to the snapshots as arguments. Project test checks SHALL NOT run inside the fix-loop round; they SHALL run once as the mandatory Step 2b suite gate after the fix loop. The structural check SHALL include an excess-scope check: the diff SHALL implement no item listed under the block's `**Out of scope Implementation Details**` and SHALL contain no anticipatory implementation — no whole item, stub, hook, "for later" abstraction, or reference whose only purpose is to serve a later slice. Each such occurrence SHALL be recorded as a finding that requires reverting it, within the existing fix-round budget and cap-exhaustion semantics.

#### Scenario: Three checks run together
- **WHEN** a Direct Build result is reviewed against its Capabilities and Edge Cases
- **THEN** each fix-loop pass runs the structural mapping, including the excess-scope check, plus empirical verification whenever feasible, over the full diff on the first pass and over the delta and its direct consumers on later passes, and the project's full test suite runs afterwards as the Step 2b suite gate

#### Scenario: Anticipatory implementation is a revert finding
- **WHEN** the reviewed diff implements an out-of-scope item or contains code whose only purpose is to serve a later slice
- **THEN** the round records a finding that requires reverting that code, and the same implementer is continued within the existing round budget

### Requirement: Empirical Verification Exercises the Runnable Surface
The review SHALL verify requested behavior by exercising the affected flow through the project's runnable surface rather than inferring correctness from the diff alone.

#### Scenario: Behavior exercised instead of inferred
- **WHEN** a capability claims behavior that can be exercised via tests, CLI, script, or app
- **THEN** the review exercises that flow and uses the observed outcome as evidence

### Requirement: Direct Build fix loop shares the implement cap rule

A Direct Build functional fix-loop pass with open findings SHALL continue the same implementer worker with exactly the ordered open-finding list and increment `fix_rounds`; a `Pre-existing` finding SHALL never be sent to the worker and SHALL be held for the terminal report; a pass with no open finding SHALL converge. After the third fix round the loop SHALL run one final pass over the round-3 delta and its consumers, which only reports: findings it still reports SHALL be non-failure cap exhaustion, reported with one line carrying that pass's exact base-form tally, and the route SHALL continue forward without further rounds.

#### Scenario: Findings remain after the final pass
- **WHEN** the final pass after the third fix round still reports findings
- **THEN** the route emits the cap-exhaustion line with that pass's tally, does not fail, and continues to the suite gate

### Requirement: Direct Build retains the review snapshot and ledger in conversation state

The Direct Build retained execution state (conversation-only, never persisted) SHALL keep the functional fix loop's findings ledger beside its findings and `review_snapshot`, the tree identifier of the latest functional-review pass snapshot. A compaction that loses `review_snapshot` SHALL make the next pass a full review.

#### Scenario: A compaction loses the snapshot
- **WHEN** the conversation is compacted during the functional fix loop and `review_snapshot` is no longer available
- **THEN** the next pass reviews the full diff from `base_sha`

### Requirement: Direct Build terminal report lists Pre-existing findings

The Direct Build terminal report's execution details SHALL carry a `Pre-existing findings` record listing every `Pre-existing` finding of the functional fix loop, one line each with its location and issue, and SHALL omit that record when there is none.

#### Scenario: The fix loop held Pre-existing findings
- **WHEN** the functional fix loop marked at least one finding `Pre-existing`
- **THEN** the terminal report's execution details list each one under `Pre-existing findings`
