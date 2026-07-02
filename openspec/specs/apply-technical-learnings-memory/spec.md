# apply-technical-learnings-memory Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.
## Requirements
### Requirement: Coordinator accumulates technical learnings across Steps

The coordinator SHALL maintain an accumulated technical-learnings memory built from the technical-learnings field of each subagent's report. This memory SHALL be held only by the coordinator; subagents SHALL NOT communicate with each other directly.

#### Scenario: Subagent reports reusable friction

- **WHEN** a subagent's report includes one or more technical-learnings entries
- **THEN** the coordinator incorporates those entries into its accumulated memory after verifying the Step

#### Scenario: No cross-subagent channel exists

- **WHEN** two Steps are executed by two different subagents
- **THEN** the only path for a learning from the first to reach the second is through the coordinator's memory and selective re-injection — the subagents never exchange information directly

### Requirement: Coordinator re-injects only relevant learnings, never a full dump

When dispatching a subagent, the coordinator SHALL select and inject only the accumulated learnings it deems relevant to that Step. It SHALL NOT dump the entire learnings memory into the dispatch, because that would reintroduce the execution noise the delegation is designed to avoid.

#### Scenario: Dispatching a Step that touches a previously-troublesome API

- **WHEN** the coordinator dispatches a Step whose work involves an API a prior subagent already characterized
- **THEN** the dispatch includes that specific learning (and other relevant ones) but not the unrelated remainder of the memory

#### Scenario: Dispatching a Step unrelated to prior friction

- **WHEN** none of the accumulated learnings are relevant to the Step being dispatched
- **THEN** the coordinator injects no learnings for that Step rather than dumping the full memory

