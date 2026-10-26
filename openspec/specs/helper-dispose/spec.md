# helper-dispose Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Helpers are disposed after their result

An executor, a task subagent, or any other helper other than the explorer SHALL arm like any subagent when its task message carries a warming line, and its dispatcher SHALL dispose it as soon as it has the result, unless the card being followed reuses it; when in doubt, the dispatcher SHALL dispose it. The budget executor and budget subagent skills on both harnesses SHALL fetch `@sai/policies/cache-warming.md` and state this rule.

#### Scenario: Executor result read
- **WHEN** a coordinator reads an executor's result and the card does not reuse it
- **THEN** the coordinator disposes the executor at once

#### Scenario: Helper of a worker
- **WHEN** a worker that cannot dispose dispatches its own helper
- **THEN** it sends no warming line, so the helper never arms
