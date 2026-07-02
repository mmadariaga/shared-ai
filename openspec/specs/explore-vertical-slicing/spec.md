# explore-vertical-slicing Specification

## Purpose
TBD - created by applying change vertical-slices-in-sai-explore. Update Purpose after archive.

## Requirements
### Requirement: explore-slicing-assessment-before-crystallization

`sai-explore` SHALL assess whether the candidate idea fits a single OpenSpec change BEFORE emitting any `Ready to Propose` block.

The idea is "too big" for one change when any of these scope signals apply:
- several distinct user tasks with orthogonal concerns (not facets of one behavior);
- no end-to-end path achievable in ~1–3 days;
- touches more than one module boundary with no shared integration point.

Based on the assessment, `sai-explore` SHALL:
- route to the single-block crystallization protocol when the idea fits one change;
- route to the sliced crystallization protocol when the idea is too big — identifying one Walking Skeleton (the simplest end-to-end path covering every user task, reversible) plus the remaining work grouped into review-sized slices ordered by dependency.

#### Scenario: idea fits a single change
- **WHEN** the candidate idea passes the slicing assessment (none of the scope signals apply)
- **THEN** `sai-explore` uses the single-block crystallization protocol and emits exactly one `Ready to Propose` block

#### Scenario: idea is too big for one change
- **WHEN** the candidate idea trips one or more scope signals during the assessment
- **THEN** `sai-explore` identifies a Walking Skeleton slice and a dependency-ordered backlog of review-sized slices, and uses the sliced crystallization protocol to emit one block per slice

### Requirement: explore-sliced-crystallization-protocol

When the candidate idea was sliced, `sai-explore` SHALL emit one `Ready to Propose` block per slice under a short header that names the Walking Skeleton vs backlog split, with the following layout:

- The Walking Skeleton is slice 1; remaining work is grouped into slices each sized to be reviewable as a standalone unit (typically ~1–3 days, a handful of files with no deep refactor).
- Blocks are numbered in order (Walking Skeleton first, then backlog by dependency).
- Each backlog slice carries a one-line `Depends on:` pointing to the slice(s) it depends on.
- `sai-explore` SHALL instruct the user to take the FIRST block to a new chat with `/sai-1-spec` and explain that each later slice becomes its own change once its predecessor is specced (the "new change per follow-up" pattern).

Each emitted block SHALL use the standard single-block format (Change name, What, Why, Capabilities in scope, Key constraints).

#### Scenario: sliced feature crystallizes
- **WHEN** the candidate idea was assessed as too big and the user signals the idea is clear enough to crystallize
- **THEN** `sai-explore` emits an ordered set of `Ready to Propose` blocks (Walking Skeleton first, then backlog by dependency) with `Depends on:` lines on backlog slices, and instructs the user to take the first block to a new chat

#### Scenario: user wants to override the split recommendation
- **WHEN** the user prefers to keep a large feature as a single change after `sai-explore` recommended slicing
- **THEN** `sai-explore` states the review risk once and briefly, then proceeds with the single-block crystallization protocol — it does NOT re-litigate the recommendation
