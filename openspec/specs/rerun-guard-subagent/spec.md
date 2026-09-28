# rerun-guard-subagent Specification

## Purpose
Keep the full read of an existing `implementation.md` out of the implementation worker's context on re-runs.

## Requirements
### Requirement: The re-run guard SHALL execute in a separate subagent

The `collapse-implemented-steps` step (`sai/commands/implement/steps/collapse-implemented-steps.md`) MUST direct the worker to run the re-run guard in a dedicated subagent rather than inline in the worker's context.

This keeps the full read of the existing `implementation.md` and the checkbox-scan loop out of the worker's working context, reducing token cost on re-runs.

#### Scenario: re-run guard directive present in the step

- **WHEN** `sai/commands/implement/steps/collapse-implemented-steps.md` is read
- **THEN** it directs the worker to delegate the read and rewrite to one `budget-subagent` before the subagent prompt

#### Scenario: subagent handles file read and checkbox scan

- **WHEN** `/sai-3-implement` runs on a change whose `implementation.md` already exists
- **THEN** the file read and per-step checkbox evaluation occur inside a subagent, with only the resulting report returned to the worker
