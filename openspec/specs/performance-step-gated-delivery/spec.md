# performance-step-gated-delivery Specification

## Purpose
TBD - created by syncing change audit-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Performance Audit Carved Step Library

The performance command SHALL deliver its audit instruction mass through a
carved `sai/commands/performance/steps/` library — `common.md` plus one file
per non-fileless plan step (`map-stack-hot-paths`,
`audit-performance-tiers`, `resolve-diagnostics`,
`close-performance-outcome`) — while the original monolithic
`instructions.md` remains in place untouched beside it.

#### Scenario: Step files name their active step

- **WHEN** any file under `sai/commands/performance/steps/` other than `common.md` is read
- **THEN** it names exactly its own active step id in an `Active step:` declaration

### Requirement: Performance Coordinator Pointer Continuations

The performance coordinator SHALL send every progress-event continuation as exactly two lines whose second line is the deterministic `Active step:` pointer derived from the step machine per `@sai/policies/stage-machine.md` § Step machines. The coordinator SHALL deliver the terminal `Active step: none` line once the plan is fully marked, and SHALL carry no pointer line on continuations that are not progress-event continuations; replacement reconstruction fields SHALL include `active_step_id`.

#### Scenario: All-marked plan delivers the terminal pointer

- **WHEN** a progress event marks the last unmarked plan step
- **THEN** the next continuation's pointer line reads `Active step: none — complete remaining work and return your terminal result.`

#### Scenario: Non-progress continuation keeps the active step

- **WHEN** a picker answer is forwarded as a non-progress continuation
- **THEN** the payload carries no pointer line and the worker retains its previously named active step

### Requirement: Performance Worker Active Step Execution

The performance worker SHALL load `steps/common.md` at dispatch as part of
its sealed initial surface, run the fileless `resolve-performance-scope`
from that surface before the first pointer, and execute ONLY the step
named by the most recent `Active step:` pointer line — never prefetching,
opening, or following any other step instruction file.

#### Scenario: Worker ignores unnamed step files

- **WHEN** the current pointer names `audit-performance-tiers`
- **THEN** the worker does not open or follow any other step file in `sai/commands/performance/steps/`

### Requirement: Performance close runs a pre-save adversarial findings check
The performance close step SHALL challenge the in-memory draft before saving to discard false positives and correct severity. It SHALL skip the adversary on zero findings, otherwise dispatch exactly one budget-explorer subagent receiving only per-finding identifier, location, measured metric plus baseline reference, and one-line validation method without diff or raw code, scope the adversary to current diff findings only, require per-finding keep or discard or downgrade verdict with why under 40 words and total report under 800 words without fabricated numbers, let the worker accept or reject each verdict with discards invisible and tally recomputed over kept findings at final severity, and close with worker findings on subagent failure without blocking.
#### Scenario: Adversarial check filters performance draft
- **WHEN** the in-memory performance draft contains findings
- **THEN** the worker runs one bounded adversary and saves only kept findings with recomputed Summary tally
