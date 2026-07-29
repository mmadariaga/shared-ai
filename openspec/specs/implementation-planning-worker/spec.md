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
The routed worker SHALL own the existing prerequisite and change-picker behavior relocated into the grouped `sai/commands/implement/coordinator.md` and `sai/commands/implement/invocation.md` bodies, including wrapper-echo precedence and 0/1/N change selection, and SHALL return `needs_input` rather than performing user interaction itself when a selection or clarification is required. The worker-authored payload SHALL contain the question and options but SHALL NOT contain a harness continuation identifier.

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

### Requirement: Implementation phase policy isolation
The implementation-planning worker contract SHALL layer implementation-only Phase Policy over the shared worker lifecycle and SHALL remain separate from the design-worker contract. It SHALL own implementation prerequisites, change resolution, planning research, rerun handling, audit ingestion, RED -> GREEN planning, STOP & COMMIT planning, interface conformance, ADR/DDR evaluation and authorized writes, and `implementation.md` verification without adding those rules to the Orchestration Core or importing design-only feedback and notice behavior.

#### Scenario: Implementation-only rule changes
- **WHEN** a maintainer changes an implementation planning rule
- **THEN** the rule SHALL be defined in the implementation worker or caller-neutral implementation planning policy
- **AND** neither the shared worker lifecycle nor the design worker SHALL acquire an implementation-specific conditional branch

#### Scenario: Worker returns phase progress
- **WHEN** implementation planning needs user input or reaches a terminal outcome
- **THEN** the worker SHALL return lifecycle metadata only and SHALL leave `implementation.md` as the authoritative transport for technical planning content

#### Scenario: Replacement worker reconstructs planning state
- **WHEN** a replacement worker receives the original envelope, `resolved_change_name` when already known, exact `opaque_input_history`, and `durable_artifact_reconstruction_instruction`
- **THEN** it SHALL replay only the recorded input decisions, rerun prerequisites, and independently reread current durable artifacts from disk
- **AND** it SHALL start a new empty write journal without treating the coordinator's accumulated changed-file union as its own writes

### Requirement: Durable artifact verification
The worker SHALL verify before reporting completion that the selected change contains a non-empty `implementation.md`; that every `tasks.md` task is represented in order; that each planned step contains the required verification and STOP & COMMIT markers; that each testable step places an assertion-based RED phase before its GREEN phase; that signatures and assertions conform to applicable `interfaces.md` Step Contracts; that automated and human verification use the established encoding; and that the planning run executed no implementation step and checked no implementation-plan checkbox. A failed verification SHALL return a non-completed lifecycle result and SHALL NOT emit the mandatory completion message.

#### Scenario: Direct artifact write succeeds
- **WHEN** the worker finishes writing an implementation plan that satisfies every durable verification check
- **THEN** it SHALL include `implementation.md` in `changed_files` and MAY return `completed`

#### Scenario: Durable artifact verification fails
- **WHEN** `implementation.md` is missing, empty, out of task order, lacks a required marker, violates RED-before-GREEN or an interface contract, mis-encodes a human check, or reflects executed implementation work
- **THEN** the worker SHALL return `failed` with a concise blocking summary and SHALL NOT claim planning completion

### Requirement: Worker reasoning ownership
The worker SHALL own technical reasoning and artifact decisions, and its response SHALL be a status report rather than a transport channel for the contents of `implementation.md`.

#### Scenario: Large implementation artifact
- **WHEN** `implementation.md` contains the completed plan
- **THEN** the worker SHALL return only the lifecycle status, concise summary, and changed-file list, leaving the artifact as the source of truth
