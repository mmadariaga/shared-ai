# supervised-review-rounds Specification

## Purpose

TBD - seeded from delta spec `supervised-review-rounds` in change `supervised-in-situ-review`.

## Requirements

### Requirement: three-round-cap-per-phase

The supervised pipeline SHALL run at most three rounds per phase per Auto attempt. This is a three-round budget for each phase on each Auto attempt: the spec phase's rounds and the design phase's rounds are counted separately under distinct phase counters, and those counters SHALL reset to zero at the start of each new Auto attempt for that phase. Rounds consumed in an earlier failed or cancelled attempt SHALL NOT count against a later attempt's three-round bound. Under selector-dispatched supervision the worker-owned automatic review loop is suppressed, so these in-session rounds are the sole automatic convergence mechanism for the phase; they are not a single cross-check layered on top of a co-running worker-owned loop. The initial round of an attempt is round one; a round consists of one in-session engine review plus the phase worker's processing of every finding that review returns through exactly one batched same-worker machine-feedback continuation carrying the round's complete ordered findings list. The batched continuation SHALL NOT increment the round count; a round SHALL be counted once regardless of how many findings the batched continuation carries.

#### Scenario: batched transport counts one round

- **WHEN** a completed review round's findings are processed through the single batched same-worker machine-feedback continuation
- **THEN** the round counts once regardless of the number of findings carried and consumes only one of the phase's allowed rounds

### Requirement: each-round-rereads-from-disk

Every review round SHALL reread the phase's artifacts from disk through the engine's transaction sequence and SHALL form findings only from those fresh reads. Prior rounds' findings, cached artifact contents, and cached existence state SHALL be invalid evidence for the current round; the pipeline SHALL NOT conclude that contents or findings are unchanged without rereading. This is the same reread rule the manual review loop already applies per transaction.

#### Scenario: every round rereads the artifacts

- **WHEN** a supervised review round runs after an earlier round of the same phase from a previous `Auto` attempt
- **THEN** the engine rereads every available requested artifact from disk for the new round
- **AND** the round forms findings only from those fresh reads

#### Scenario: earlier findings are not evidence

- **WHEN** a later round of the same phase, in a new `Auto` attempt, forms findings
- **THEN** findings from earlier rounds are not reused as evidence for the later round
- **AND** the pipeline does not claim earlier findings hold without rereading

### Requirement: round-closes-the-bound

A completed round containing at least one `High` finding SHALL cause another round while the phase's three-round cap still permits one; when the third completed round still contains at least one `High` finding, the phase's bound closes as cap exhaustion after that round's findings are processed through the machine-feedback path. A completed round containing no `High` finding SHALL declare convergence at any round number within the cap: its `Medium` and `Low` findings SHALL still be processed through the machine-feedback path and SHALL remain visible, but they SHALL NOT dispatch another round. Each round's stop condition SHALL be judged only from that round's own fresh reads: a `High` finding freshly re-formed from the current round's disk reread — even when equivalent to a finding of an earlier round — SHALL count for the current round's stop condition, because earlier rounds' findings are not evidence and the coordinator does not carry findings forward as already handled.

#### Scenario: High findings extend the loop while the cap permits

- **WHEN** a completed review round contains at least one `High` finding and fewer than three rounds have completed for the phase
- **THEN** the pipeline processes the round's findings through the machine-feedback path
- **AND** it SHALL dispatch a further round while the three-round cap permits

#### Scenario: High findings on the third round close the bound as cap exhaustion

- **WHEN** the third completed review round contains at least one `High` finding
- **THEN** the pipeline processes the round's findings through the machine-feedback path and dispatches no further round
- **AND** the phase closes as non-failure cap exhaustion

#### Scenario: no-High findings stop the loop

- **WHEN** a completed review round contains no `High` finding
- **THEN** the pipeline stops the review loop for the phase
- **AND** no further round is dispatched

#### Scenario: Medium and Low findings are processed but do not extend the loop

- **WHEN** a completed round returns only `Medium` and/or `Low` findings
- **THEN** those findings receive normal per-finding machine-feedback processing
- **AND** the loop stops because no `High` finding blocks the stop condition

#### Scenario: a High finding re-formed by a later round's reread blocks the stop condition

- **WHEN** feedback processing legitimately discards a `High` finding during an earlier attempt's round, and a later `Auto` attempt's fresh disk reread re-forms an equivalent `High` finding
- **THEN** the re-formed finding counts for the later round's stop condition
- **AND** its feedback disposition is evaluated and reported as a finding of that later round

### Requirement: cap-exhaustion-applies-last-round-findings

When the phase's third capped round still contains `High` findings, the pipeline SHALL process that round's findings through the machine-feedback path, SHALL NOT dispatch another round, and SHALL continue the run either way: a spec-phase cap exhaustion proceeds to the chained design phase, and a design-phase cap exhaustion proceeds to supervised completion. Cap exhaustion SHALL NOT be classified as a failure, SHALL NOT stop the run, and SHALL NOT assert that `High` findings remain in the resulting artifact state, because the last round's findings were applied and the resulting state was not re-read by a later round.

#### Scenario: spec cap exhaustion continues to design

- **WHEN** the spec phase's third capped round still contains `High` findings and its findings have been applied
- **THEN** the pipeline reports cap exhaustion and proceeds to the chained design phase
- **AND** it does not classify the ending as failure and does not stop the run

#### Scenario: design cap exhaustion continues to completion

- **WHEN** the design phase's third capped round still contains `High` findings and its findings have been applied
- **THEN** the pipeline reports cap exhaustion and proceeds to supervised completion
- **AND** it does not classify the ending as failure

#### Scenario: cap exhaustion does not claim outstanding High findings

- **WHEN** a phase ends by cap exhaustion after applying the last round's findings
- **THEN** the pipeline does not assert that `High` findings remain in the current artifact state
- **AND** it does not claim the edited state was re-reviewed

### Requirement: worker-failure-ends-cycle

If the phase worker returns `failed` or `cancelled` mid-cycle, the review cycle SHALL end with that worker result, SHALL preserve the already-applied fixes, and SHALL NOT launch a review round over the half-finished state. Because the worker-owned automatic loop is suppressed under supervision, no automatic isolated-reviewer retry absorbs the failure. A later `Auto` attempt SHALL begin a new three-round bound over the preserved artifact state rather than regenerate over accepted corrections.

#### Scenario: worker fails mid-cycle

- **WHEN** the phase worker returns `failed` or `cancelled` while a review cycle is in progress
- **THEN** the review cycle ends with that worker result
- **AND** no review round is launched over the half-finished artifacts
- **AND** the already-applied fixes are preserved
- **AND** no automatic worker-owned reviewer is dispatched to absorb the failure

#### Scenario: retry starts a new three-round bound

- **WHEN** the user later selects the uncompleted change in a new `Auto` attempt
- **THEN** the new attempt starts a new three-round bound over the preserved artifact state with phase counters reset to zero
- **AND** it does not regenerate in a way that overwrites accepted corrections from the interrupted attempt

### Requirement: manual-loop-counts-are-separate

Reviews run through the manual post-crystallization review loop (the `review-loop-navigation` capability) SHALL NOT count toward the supervised pipeline's per-phase round caps, and supervised review rounds SHALL NOT count toward any manual-loop counter. The manual loop and the supervised pipeline keep separate counters, so a manual review of the same change neither consumes nor extends an auto-mode round.

#### Scenario: manual review does not consume an auto round

- **WHEN** the user reviews a change's artifacts through the manual review loop while the supervised pipeline also has round counters for that change
- **THEN** the manual review does not increment the supervised pipeline's round counters
- **AND** the supervised pipeline's three-round cap is unaffected by the manual review

#### Scenario: auto rounds do not consume manual-loop state

- **WHEN** the supervised pipeline runs review rounds over a change
- **THEN** those rounds do not alter the manual loop's tracked-set iteration or its own counters
