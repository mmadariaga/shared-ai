# rerun-research-exception Specification

## Purpose
Allow narrowly scoped research on a `/sai-3-implement` re-run without widening first-run research.

## Requirements
### Requirement: The implement instruction SHALL permit a scoped research subagent when re-running a plan

When `implementation.md` existed at the start of the `/sai-3-implement` invocation (keyed on file presence, not on how many steps were collapsed), the documentation-review step MUST allow — as an explicit exception to the normal no-subagents-for-research rule — spawning one `budget-subagent` scoped exclusively to elements introduced since the last run.

The exception does NOT apply on a first run (no existing `implementation.md`); in that case the no-subagents rule holds.

#### Scenario: first run — no research subagent permitted

- **WHEN** `implementation.md` does not exist at the start of the invocation
- **THEN** the documentation-review step proceeds without spawning any subagent; only the files listed under `## Required Documentation` are read directly

#### Scenario: re-run — scoped subagent permitted

- **WHEN** `implementation.md` exists at the start of the invocation, including when every prior step is VERIFY-PENDING and nothing was collapsed
- **THEN** the documentation-review step MAY spawn one subagent restricted to the new elements introduced since the last run

#### Scenario: re-run exception does not expand research scope

- **WHEN** a research subagent is spawned under the re-run exception
- **THEN** it is scoped only to the elements not yet applied; it does NOT re-research already-applied steps or perform open-ended codebase exploration
