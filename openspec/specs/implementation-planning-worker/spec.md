# Implementation Planning Worker Specification

## Purpose

Define the complete technical implementation-planning ownership, existing prerequisite and selection ownership, durable artifact verification, and worker reasoning ownership responsibilities of the implementation-planning worker.

## Requirements

### Requirement: Complete implementation planning ownership
The implementation-planning worker SHALL perform the complete current `/sai-3-implement` technical phase, including the exact prerequisite checks and wrapper-echo/0-1-N change-picker behavior relocated from the routed command body, change-name resolution, reading required change artifacts and codebase context, planning, verification, and direct writing of `implementation.md`. It SHALL also own every write currently authorized by that phase, including explicitly approved ADR/DDR files and ADR index maintenance, while leaving unauthorized project changes untouched. The preserved Copilot inline body SHALL retain the same prerequisite and change-picker behavior for the inline path; the coordinator SHALL own none of it.

#### Scenario: First planning run
- **WHEN** the selected change has no completed implementation plan
- **THEN** the worker SHALL read the applicable proposal, specs, design, tasks, interfaces, and audit artifacts, generate the implementation plan, and write it directly under the selected change directory while reporting every authorized file write

### Requirement: Existing prerequisite and selection ownership
The routed worker SHALL own the existing prerequisite and change-picker behavior relocated from `sai/commands/sai-3-implement.md`, including wrapper-echo precedence and 0/1/N change selection, and SHALL return `needs_input` rather than performing user interaction itself when a selection or clarification is required. The worker-authored payload SHALL contain the question and options but SHALL NOT contain a harness continuation identifier.

#### Scenario: Zero active changes
- **WHEN** raw arguments contain no change name and zero active changes are available
- **THEN** the worker SHALL return `failed` with exactly `No active changes found. Run \`/sai-1-spec\` to create one.`, SHALL not ask a question, and SHALL not write a planning artifact

#### Scenario: One active change
- **WHEN** raw arguments contain no change name and exactly one active change named `{name}` is available
- **THEN** the worker SHALL return `needs_input` with exactly `Use change '{name}'?` and the closed options `yes` and `no`; `yes` SHALL resolve the change, while any other answer SHALL return `cancelled` and stop without retrying

#### Scenario: Multiple active changes
- **WHEN** raw arguments contain no change name and two or more active changes are available
- **THEN** the worker SHALL return `needs_input` with exactly `Which change?` and one option per active change; invalid answers SHALL cause an unbounded re-prompt with the same options, without starting a second worker

#### Scenario: Required prerequisite is absent
- **WHEN** any required prerequisite or change artifact is absent
- **THEN** the worker SHALL preserve the existing stop message, including `openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec`, `OpenSpec not initialized in this project. Run: openspec init`, `openspec/config.yaml does not declare \`schema: sai-workflow\`. The sai commands require this schema. Add \`schema: sai-workflow\` to the top of openspec/config.yaml.`, `Change '{change-name}' not found. Run /sai-1-spec to create it first.`, `design.md not found for '{change-name}'. Run /sai-2-design first.`, or `tasks.md not found for '{change-name}'. Run /sai-2-design first.` as applicable, and SHALL not modify files

### Requirement: Durable artifact verification
The worker SHALL verify that its generated `implementation.md` exists at the selected change path and satisfies the implementation artifact contract before reporting completion.

#### Scenario: Direct artifact write succeeds
- **WHEN** the worker finishes writing the implementation plan
- **THEN** it SHALL verify the durable artifact and include `implementation.md` in the changed-file list returned to the coordinator

### Requirement: Worker reasoning ownership
The worker SHALL own technical reasoning and artifact decisions, and its response SHALL be a status report rather than a transport channel for the contents of `implementation.md`.

#### Scenario: Large implementation artifact
- **WHEN** `implementation.md` contains the completed plan
- **THEN** the worker SHALL return only the lifecycle status, concise summary, and changed-file list, leaving the artifact as the source of truth
