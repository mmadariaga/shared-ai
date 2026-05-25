# rerun-guard-subagent Specification

## Purpose
TBD - created by archiving change implement-enhancements. Update Purpose after archive.
## Requirements
### Requirement: Step 1b of the implement instruction SHALL execute in a separate subagent

The `sai/instructions/implement.md` Step 1b (re-run guard) MUST carry a directive instructing the executing agent to run that step in a dedicated subagent rather than inline in the main agent context.

This keeps the full read of the existing `implementation.md` and the checkbox-scan loop out of the main agent's working context, reducing token cost on re-runs.

#### Scenario: re-run guard directive present in instruction

- **WHEN** `sai/instructions/implement.md` Step 1b is read
- **THEN** the step contains a blockquote directive `> **Subagent:** Run this step in a separate subagent.` immediately before the conditional logic

#### Scenario: subagent handles file read and checkbox scan

- **WHEN** `/sai-3-implement` detects that `implementation.md` already exists
- **THEN** the file read and per-step checkbox evaluation occur inside a subagent, with only the resulting applied-steps set returned to the main agent

