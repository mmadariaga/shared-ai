# explore-two-phase-startup Specification

## Purpose
Start every pre-crystallization `sai-explore` budget-explorer dispatch with a ready-only phase, and state that handshake in `sai/commands/explore/body.md`, the only surface that uses it.

## Requirements

### Requirement: Ready-only initial dispatch is strict-zero
Pre-crystallization sai-explore budget-explorer dispatches SHALL start ready-only with base instructions only and SHALL withhold goal, output contract, change or topic, and provenance until after ready. The ready prompt SHALL never name a tool and the tool-preference ladder SHALL govern tool choice.
#### Scenario: Strict-zero ready dispatch
- **WHEN** the main explore agent starts a pre-crystallization budget-explorer dispatch
- **THEN** the initial prompt carries base instructions only with no goal or output contract

### Requirement: Explorer ready return is exact event
The explorer SHALL return exactly event ready with empty changed_files before any expensive work and SHALL perform no analysis, research, or review pass before that return.
#### Scenario: Exact ready before work
- **WHEN** an explorer receives a ready-only initial dispatch
- **THEN** it returns event ready with empty changed_files without expensive work

### Requirement: Task travels only in post-ready continuation
The goal plus output contract SHALL travel only in the post-ready continuation on the same task handle, with each parallel explorer performing its own independent ready and no shared batch ready existing. On Claude Code the continuation SHALL use SendMessage to the captured agent handle with no run_in_background change, and on opencode the continuation SHALL use task with the captured task ID with no run_in_background change.
#### Scenario: Same-handle task continuation
- **WHEN** an explorer has returned ready
- **THEN** it receives goal plus output contract only in the continuation on its own handle

### Requirement: Guard absence and split retry discipline
Explore ready SHALL open no guard window and SHALL retain the handle or task ID with no guard snapshot, for the post-ready continuation and, because the explorer is live for the whole run, for every later sequential search sent as a further continuation on the same handle with no new ready. A missing ready SHALL be a dispatch failure relaunched fresh with the original minimal envelope and no resume-before-ready. Ready and task SHALL retry separately with identical prompts under the shared bounded retry budget with at most two retries per operation, and a closed result SHALL never be retried here.
#### Scenario: Missing ready relaunches fresh
- **WHEN** an initial ready-only dispatch yields no ready return
- **THEN** the caller relaunches fresh with the original minimal envelope
#### Scenario: Later sequential search reuses the retained handle
- **WHEN** a later sequential search starts after an earlier search on the same explorer completed
- **THEN** the caller sends its goal and output contract as a continuation on the retained handle without a new ready

### Requirement: Unchanged research rules and scope boundary
The ladder, output contract, and per-segment 40-call ceiling SHALL hold across both phases with no triviality bypass, explore SHALL declare no progress_plan with idea-list panel handling unchanged, supervised crystallization-close spec and design dispatches SHALL keep their routed two-phase with no double wrap, and the canonical worker-core contract SHALL remain unchanged with scope limited to sai-explore only.
#### Scenario: Ladder and ceiling hold across phases
- **WHEN** an explorer runs ready and task phases
- **THEN** ladder choice and the 40-call ceiling apply in each phase unchanged
