# rerun-research-exception Specification

## Purpose
TBD - created by archiving change implement-enhancements. Update Purpose after archive.
## Requirements
### Requirement: The implement instruction SHALL permit a scoped research subagent when re-running a partially-applied plan

When `/sai-3-implement` detects a non-empty applied-steps set (i.e., Step 1b found at least one fully-checked step in an existing `implementation.md`), the research phase MUST allow — as an explicit exception to the normal no-subagents-for-research rule — spawning a subagent scoped exclusively to elements introduced since the last run.

The exception does NOT apply on a fresh run (no existing `implementation.md` or empty applied-steps set); in that case the original no-subagents rule holds.

#### Scenario: fresh run — no research subagent permitted

- **WHEN** `implementation.md` does not exist or the applied-steps set is empty
- **THEN** the research phase proceeds without spawning any subagent; only the files listed under `## Required Documentation` are read directly

#### Scenario: re-run with applied steps — scoped subagent permitted

- **WHEN** Step 1b detects one or more fully-applied steps (applied-steps set is non-empty)
- **THEN** the research phase MAY spawn a subagent restricted to the new elements introduced since the last run, rather than requiring the main agent to read all documentation directly

#### Scenario: re-run exception does not expand research scope

- **WHEN** a research subagent is spawned under the re-run exception
- **THEN** it is scoped only to the elements not yet applied; it does NOT re-research already-applied steps or perform open-ended codebase exploration

