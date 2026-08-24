# implementation-planning-worker — Spec

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: Implementation phase policy isolation

The implementation-planning worker contract SHALL layer implementation-only Phase Policy over the shared worker lifecycle and SHALL remain separate from the design-worker contract. It SHALL own implementation prerequisites, change resolution, planning research, rerun handling, audit ingestion, RED -> GREEN planning, STOP & COMMIT planning, interface conformance, ADR/DDR evaluation and authorized writes, and `implementation.md` verification without adding those rules to the Orchestration Core or importing design-only feedback and notice behavior.

Under the step-gated instruction delivery experiment, the phase-policy rule home SHALL be the step instruction library under `sai/commands/implement/steps/`: `steps/common.md` is fetched at worker dispatch and stays in force for the entire run, carrying the communication mode, expertise profile contract, hard rules, code quality priority stack, and contextual intelligence, while each remaining progress-plan step executes from its own step file named by the coordinator's `Active step:` pointer line. The worker contract plus `steps/common.md` is the sealed initial surface; `prereqs-resolution` runs from it before the first progress event.

#### Scenario: Implementation-only rule changes

- **WHEN** a maintainer changes an implementation planning rule
- **THEN** the rule SHALL be defined in the implementation step library under `sai/commands/implement/steps/`, the implementation worker card, or caller-neutral implementation planning policy
- **AND** neither the shared worker lifecycle nor the design worker SHALL acquire an implementation-specific conditional branch

#### Scenario: Worker returns phase progress

- **WHEN** implementation planning needs user input or reaches a terminal outcome
- **THEN** the worker SHALL return lifecycle metadata only and SHALL leave `implementation.md` as the authoritative transport for technical planning content

#### Scenario: Replacement worker reconstructs planning state

- **WHEN** a replacement worker receives the original envelope, `resolved_change_name` when already known, exact `opaque_input_history`, `durable_artifact_reconstruction_instruction`, and `active_step_id`
- **THEN** it SHALL replay only the recorded input decisions, rerun prerequisites, and independently reread current durable artifacts from disk
- **AND** it SHALL start a new empty write journal without treating the coordinator's accumulated changed-file union as its own writes
- **AND** its first continuation SHALL carry the correct pointer line for the active step named by `active_step_id`
