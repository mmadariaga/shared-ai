# Design Phase Navigation Specification

## Purpose
Define the terminal boundary between design completion and explicit implementation planning.

## Requirements

### Requirement: sai-2-design terminates after design artifacts and feedback

`/sai-2-design` SHALL end after the design artifacts are complete and the shared artifact-feedback gate has been satisfied. When the user selects the gate's proceed option, the command SHALL emit its existing mandatory design completion stop and SHALL stop immediately. It SHALL NOT present any further navigation question and SHALL NOT dispatch, continue, or inline any implementation-planning work in the same prompt.

#### Scenario: proceeding through the feedback gate ends the command

- **WHEN** the user selects the artifact-feedback gate's proceed option after design artifacts are written
- **THEN** the command SHALL print exactly `Design done in openspec/changes/{name}/. Run \`/sai-3-implement {name}\` **in a new chat** when ready.` and SHALL stop

#### Scenario: no continuation question is presented

- **WHEN** the artifact-feedback gate completes
- **THEN** no Stop-versus-Continue-now choice SHALL be presented through any option picker or plain-text prompt

#### Scenario: no implementation worker is dispatched

- **WHEN** `/sai-2-design` completes
- **THEN** no implementation-planning worker SHALL be dispatched and `implementation.md` SHALL NOT be created or modified

### Requirement: Implementation planning requires a fresh invocation

Implementation planning SHALL begin only through an explicit `/sai-3-implement {name}` invocation. The durable OpenSpec artifacts under `openspec/changes/{name}/` SHALL be the sole handoff between the design phase and the implementation-planning phase.

Two levels of isolation SHALL be distinguished. **Enforceable:** no design-phase invocation state — changed-file union, continuation reference, opaque input history, pending feedback, fast-track banner flag, feedback iteration counter, or worker session — SHALL be forwarded into the implementation invocation, and the implementation worker SHALL receive its change name only through its own wrapper envelope. **Not enforceable:** whether the user types `/sai-3-implement` in a new chat or the same one is the user's choice; the command SHALL NOT claim to prevent same-chat invocation. Same-chat conversational carryover SHALL be addressed by the existing Isolation Mode block, and the new-chat instruction SHALL be stated as the recommended workflow in the completion message rather than as an enforced constraint.

#### Scenario: sai-3 reconstructs context from artifacts

- **WHEN** `/sai-3-implement {name}` is invoked after `/sai-2-design {name}` completed
- **THEN** the implementation-planning phase SHALL run its established behavior unchanged, reading its context from the persisted change artifacts

#### Scenario: design lifecycle state is not exported

- **WHEN** `/sai-2-design` stops
- **THEN** it SHALL NOT persist or forward its changed-file union, continuation reference, opaque input history, pending feedback, fast-track banner flag, or feedback iteration counter to any later phase

#### Scenario: same-chat invocation relies on Isolation Mode

- **WHEN** the user invokes `/sai-3-implement {name}` in the same chat rather than a new one
- **THEN** the command SHALL still run, and its existing Isolation Mode block SHALL be the mechanism that discards prior conversational context

### Requirement: sai-2 wrappers no longer preload the implementation worker binding

The `/sai-2-design` wrappers SHALL NOT load the `sai-3-implementation-worker` binding skill, because sai-2 no longer dispatches that worker. Tool grants required by the design worker's own dispatch and continuation SHALL be retained.

#### Scenario: Claude sai-2 wrapper drops the sai-3 binding fetch

- **WHEN** `commands/claude/sai-2-design.md` is read
- **THEN** it SHALL fetch the design-worker binding skill and SHALL NOT fetch the `sai-3-implementation-worker` binding skill
- **AND** its `allowed-tools` SHALL still permit `Skill`, `Agent`, `SendMessage`, and `AskUserQuestion`

#### Scenario: opencode sai-2 wrapper drops the sai-3 binding fetch

- **WHEN** `commands/opencode/sai-2-design.md` is read
- **THEN** it SHALL fetch the design-worker binding skill and SHALL NOT fetch the `sai-3-implementation-worker` binding skill

### Requirement: The routed coordinator-worker seam is preserved

The logical coordinator SHALL remain a role defined by the grouped `sai/commands/design/coordinator.md` and `sai/commands/implement/coordinator.md` bodies and their invocation bodies plus the canonical coordinator contract, dispatching technical work to a routed worker. This change SHALL NOT collapse the worker into the primary session and SHALL NOT implement complexity-based worker selection; it SHALL only leave that path open.

#### Scenario: coordinator role survives profile removal

- **WHEN** a routed `/sai-2-design` or `/sai-3-implement` invocation runs
- **THEN** the primary session SHALL act as the coordinator described by the canonical coordinator contract and SHALL dispatch exactly one routed worker for technical work

#### Scenario: complexity routing is not implemented

- **WHEN** this change is applied
- **THEN** no worker selection SHALL be conditioned on the proposal's `**Complexity**` value
