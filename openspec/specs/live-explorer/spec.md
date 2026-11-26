# live-explorer Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: One live explorer per coordinator

A coordinator SHALL keep one explorer for its whole run and reuse it for every sequential search. The first search SHALL open the explorer through the unchanged ready handshake, and each later sequential search SHALL be a continuation on the same handle with no new ready and its own per-segment tool-call ceiling. Searches that run at once SHALL start additional explorers, which are reused the same way. Explorer task messages and continuations SHALL end with the warming switch of `cache-warming.md` only when their dispatcher disposes the explorer (a coordinator or the `/sai-explore` main session); a worker that dispatches its own explorers SHALL send no switch, so those explorers never arm. An explorer that received the switch SHALL arm after each result and stay warm between searches until it is disposed or its `max` window closes, and its always-present `warming` field SHALL be the diagnostic of that policy. A live explorer SHALL NOT be disposed between searches. The coordinator SHALL dispose every live explorer, under `sai/policies/worker-lifecycle.md` and whatever its latest `warming` diagnostic, at the route end, on abandon or stop, and at run close. `/sai-explore` SHALL dispose all its live explorers when a route starts: right after the `route-choice` emit of a Plan - Unattended, Direct Build - Unattended, or Manual answer is accepted and before the route's first dispatch, as one same-turn batch of the stop calls and the `transfer.js close` of its helper report directory (`sai/commands/explore/steps/route-selector.md` § Route start). Entering the `--no-specs` POC lane SHALL NOT be a route start, and its explorer SHALL stay alive and be reused. A search that the same invocation needs after a route start SHALL create a new explorer with its ready handshake and open a new helper directory. ADR 0202 SHALL record this as an amendment of ADR 0188 decision 3, referencing ADR 0194.

#### Scenario: Second sequential search reuses the explorer
- **WHEN** a coordinator runs a second sequential search after the first completed
- **THEN** it sends the goal and output contract as a continuation to the same explorer handle with no new ready handshake

#### Scenario: Parallel searches
- **WHEN** a coordinator runs two searches at once
- **THEN** it starts an additional explorer for the second search and reuses each explorer for later searches

#### Scenario: Explore route ends
- **WHEN** a `/sai-explore` route ends or is abandoned while an explorer is still live
- **THEN** the coordinator disposes all its live explorers, whatever their latest `warming` diagnostic

#### Scenario: Continuation keeps its own ceiling
- **WHEN** a live explorer receives a later search as a continuation
- **THEN** that continuation has its own 40 tool-call ceiling

#### Scenario: No dispose between searches
- **WHEN** a live explorer returns a search result and the coordinator will run another sequential search
- **THEN** the coordinator does not dispose that explorer

#### Scenario: Explore route starts
- **WHEN** the user answers the `/sai-explore` route selector with Plan - Unattended, Direct Build - Unattended, or Manual and the `route-choice` emit is accepted
- **THEN** the session disposes all its live explorers and closes its helper report directory in one same-turn batch before the route's first dispatch

#### Scenario: POC lane is not a route start
- **WHEN** a `/sai-explore` slice enters the `--no-specs` POC lane
- **THEN** its live explorer is not disposed and is reused

#### Scenario: Search after a route start
- **WHEN** the same `/sai-explore` invocation needs a search after a route start, such as a `review-loop` or the selector of the next slice
- **THEN** it creates a new explorer with its ready handshake and opens a new helper directory

#### Scenario: Explorer of a worker
- **WHEN** a worker dispatches its own `budget-explorer`
- **THEN** its task message and continuations carry no warming switch, and the explorer arms no wait
