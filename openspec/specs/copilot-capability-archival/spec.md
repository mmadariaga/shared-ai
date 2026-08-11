# copilot-capability-archival Specification

## Purpose
TBD - created by archiving change archive-copilot-capability-specs. Update Purpose after archive.
## Requirements
### Requirement: Retired Copilot capability specs leave the active tree

The archival change MUST move the following twenty-one capability specs from their active locations under `openspec/specs/` to matching locations under `openspec/specs/_archived/`: `copilot-budget-agent-models`, `copilot-apply-model-selection`, `copilot-harness-removal`, `copilot-command-model-routing`, `copilot-sai-folder-path`, `copilot-prompt-tools-probe`, `copilot-prompt-tools`, `copilot-cli-support-clarification`, `copilot-budget-subagent-model`, `copilot-budget-agents-user-invocable`, `copilot-model-routing`, `copilot-checkbox-discipline`, `copilot-budget-subagent-model-update`, `copilot-model-reference-documentation`, `accessibility-copilot-model`, `design-copilot-model`, `performance-copilot-model`, `review-copilot-model`, `security-copilot-model`, `spec-copilot-model`, and `skill-copilot-compatibility`. Each archived spec MUST retain its historical content, and no existing content under `openspec/specs/_archived/` MAY be modified.

#### Scenario: Every candidate is absent from the active tree

- **WHEN** the archival operation completes
- **THEN** each of the twenty-one named capability directories exists below `openspec/specs/_archived/` with its `spec.md`, and none of those named directories remains below the active `openspec/specs/` root

#### Scenario: Archived copies retain their historical record

- **WHEN** a candidate is moved to the canonical archive
- **THEN** its archived `spec.md` preserves the candidate's pre-archival content and the operation does not rewrite, reorganize, or correct any pre-existing archived spec

#### Scenario: Archival is terminal

- **WHEN** a candidate has been placed under `openspec/specs/_archived/`
- **THEN** later work treats that archived spec as historical and does not edit it as an active normative contract
