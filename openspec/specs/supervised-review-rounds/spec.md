# supervised-review-rounds Specification

## Purpose

TBD - seeded from delta spec `supervised-review-rounds` in change `supervised-in-situ-review`.

## Requirements

### Requirement: three-round-cap-per-phase

The supervised pipeline SHALL run at most three review rounds per phase. The cap SHALL be per phase: the spec phase's three rounds and the design phase's three rounds are counted separately under distinct phase counters. The initial round is round one; a round consists of one in-session engine review plus the phase worker's processing of every finding that review returns. Per-finding processing SHALL NOT increment the round count; a round SHALL be counted once however many per-finding continuation steps it takes.

#### Scenario: spec phase has its own three-round cap

- **WHEN** the supervised spec phase runs review rounds
- **THEN** at most three rounds run for the spec phase
- **AND** the spec phase's round counter is separate from the design phase's counter

#### Scenario: design phase has its own three-round cap

- **WHEN** the supervised design phase runs review rounds
- **THEN** at most three rounds run for the design phase
- **AND** the design phase's round counter is separate from the spec phase's counter

#### Scenario: per-finding continuations count once

- **WHEN** one review round returns multiple findings that require separate worker continuations
- **THEN** all of those continuations belong to the same round
- **AND** they consume only one of the three allowed rounds for the phase

### Requirement: each-round-rereads-from-disk

Every review round SHALL reread the phase's artifacts from disk through the engine's transaction sequence and SHALL form findings only from those fresh reads. Prior rounds' findings, cached artifact contents, and cached existence state SHALL be invalid evidence for the current round; the pipeline SHALL NOT conclude that contents or findings are unchanged without rereading. This is the same reread rule the manual review loop already applies per transaction.

#### Scenario: every round rereads the artifacts

- **WHEN** a supervised review round runs after an earlier round of the same phase
- **THEN** the engine rereads every available requested artifact from disk for the new round
- **AND** the round forms findings only from those fresh reads

#### Scenario: earlier findings are not evidence

- **WHEN** a later round of the same phase forms findings
- **THEN** findings from earlier rounds are not reused as evidence for the later round
- **AND** the pipeline does not claim earlier findings hold without rereading

### Requirement: round-repeat-until-no-high

A completed round containing at least one `High` finding SHALL dispatch another round when fewer than three rounds have completed for the phase. A completed round containing no `High` finding SHALL stop the loop: its `Medium` and `Low` findings SHALL still be processed through the machine-feedback path and SHALL remain visible, but they SHALL NOT dispatch another round. Each round's stop condition SHALL be judged only from that round's own fresh reads: a `High` finding freshly re-formed from the current round's disk reread — even when equivalent to a finding of an earlier round — SHALL count for the current round's stop condition, because earlier rounds' findings are not evidence and the coordinator does not carry findings forward as already handled.

#### Scenario: High findings dispatch another round

- **WHEN** a completed review round contains at least one `High` finding and fewer than three rounds have completed for the phase
- **THEN** the pipeline dispatches another review round
- **AND** the round's findings are processed through the machine-feedback path before the next round

#### Scenario: no-High findings stop the loop

- **WHEN** a completed review round contains no `High` finding
- **THEN** the pipeline stops the review loop for the phase
- **AND** no further round is dispatched even though the cap is not exhausted

#### Scenario: Medium and Low findings are processed but do not extend the loop

- **WHEN** a completed round returns only `Medium` and/or `Low` findings
- **THEN** those findings receive normal per-finding machine-feedback processing
- **AND** the loop stops because no `High` finding blocks the stop condition

#### Scenario: a High finding re-formed by a later round's reread blocks the stop condition

- **WHEN** feedback processing legitimately discards a `High` finding during an earlier round, and a later round's fresh disk reread re-forms an equivalent `High` finding
- **THEN** the re-formed finding counts for the later round's stop condition
- **AND** its feedback disposition is evaluated and reported as a finding of that later round

### Requirement: cap-exhaustion-applies-last-round-findings

When the third round still contains `High` findings, the pipeline SHALL process the last round's findings through the machine-feedback path, SHALL NOT dispatch a fourth round, and SHALL continue the run either way: a spec-phase cap exhaustion proceeds to the chained design phase, and a design-phase cap exhaustion proceeds to supervised completion. Cap exhaustion SHALL NOT be classified as a failure, SHALL NOT stop the run, and SHALL NOT assert that `High` findings remain in the resulting artifact state, because the last round's findings were applied and the resulting state was not re-read by a later round.

#### Scenario: spec cap exhaustion continues to design

- **WHEN** the third spec-phase round still contains `High` findings and its findings have been applied
- **THEN** the pipeline reports cap exhaustion and proceeds to the chained design phase
- **AND** it does not classify the ending as failure and does not stop the run

#### Scenario: design cap exhaustion continues to completion

- **WHEN** the third design-phase round still contains `High` findings and its findings have been applied
- **THEN** the pipeline reports cap exhaustion and proceeds to supervised completion
- **AND** it does not classify the ending as failure

#### Scenario: cap exhaustion does not claim outstanding High findings

- **WHEN** a phase ends by cap exhaustion after applying the last round's findings
- **THEN** the pipeline does not assert that `High` findings remain in the current artifact state
- **AND** it does not claim the edited state was re-reviewed

### Requirement: worker-failure-ends-cycle

If the phase worker returns `failed` or `cancelled` mid-cycle, the review cycle SHALL end with that worker result, SHALL preserve the already-applied fixes, and SHALL NOT launch a review round over the half-finished state. A later `start-pipeline` attempt SHALL begin a new three-round bound over the preserved artifact state rather than regenerate over accepted corrections.

#### Scenario: worker fails mid-cycle

- **WHEN** the phase worker returns `failed` or `cancelled` while a review cycle is in progress
- **THEN** the review cycle ends with that worker result
- **AND** no review round is launched over the half-finished artifacts
- **AND** the already-applied fixes are preserved

#### Scenario: retry starts a new three-round bound

- **WHEN** the user later selects the uncompleted change in a new `start-pipeline` attempt
- **THEN** the new attempt starts a new three-round bound over the preserved artifact state
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
