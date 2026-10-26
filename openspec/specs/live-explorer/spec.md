# live-explorer Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: One live explorer per coordinator

A coordinator SHALL keep one explorer for its whole run and reuse it for every sequential search. The first search SHALL open the explorer through the unchanged ready handshake, and each later sequential search SHALL be a continuation on the same handle with no new ready and its own per-segment tool-call ceiling. Searches that run at once SHALL start additional explorers, which are reused the same way. Every explorer dispatch and continuation SHALL follow `cache-warming.md` for timings. All explorers SHALL be disposed at run close; a command with no run close SHALL dispose them when its route ends or is abandoned, and otherwise the `max` window SHALL bound them. ADR 0202 SHALL record this as an amendment of ADR 0188 decision 3, referencing ADR 0194.

#### Scenario: Second sequential search reuses the explorer
- **WHEN** a coordinator runs a second sequential search after the first completed
- **THEN** it sends the goal and output contract as a continuation to the same explorer handle with no new ready handshake

#### Scenario: Parallel searches
- **WHEN** a coordinator runs two searches at once
- **THEN** it starts an additional explorer for the second search and reuses each explorer for later searches

#### Scenario: Explore route ends
- **WHEN** a `/sai-explore` route ends or is abandoned
- **THEN** the coordinator disposes its live explorers

#### Scenario: Continuation keeps its own ceiling
- **WHEN** a live explorer receives a later search as a continuation
- **THEN** that continuation has its own 40 tool-call ceiling
