# step-machine-wiring-verification Specification

## Purpose
TBD - created by archiving change extract-step-machine-routing. Update Purpose after archive.

## Requirements

### Requirement: Coordinator-machine fetch validation

For each coordinator that declares `step_machine: <name>@<version>`, a test MUST verify that the coordinator file loads `@sai/policies/stage-machine.md` via a fetch directive.

**Scope:** Static validation to prevent incomplete wiring.

#### Scenario: Coordinator with declared machine loads policy

- **WHEN** a coordinator declares `step_machine: <name>@<version>`
- **THEN** a test confirms that the same coordinator.md file contains `Fetch @sai/policies/stage-machine.md`

### Requirement: Machine registration verification

For each coordinator that declares `step_machine: <name>@<version>`, a test MUST verify that the named machine is registered in `sai-state/registry.js`. Tests MUST also verify that `security-steps@1`, `performance-steps@1`, and `accessibility-steps@1` are registered and that the retired `security-standalone@1`, `performance-standalone@1`, and `accessibility-standalone@1` are not.

**Scope:** Runtime availability validation; prevents wiring to machines that don't exist.

#### Scenario: Declared machine is registered

- **WHEN** a coordinator declares `step_machine: <name>@<version>`
- **THEN** a test confirms that `registry.has('<name>@<version>')` returns true

#### Scenario: Retired audit machines are unregistered

- **WHEN** the step-machine wiring tests run
- **THEN** `registry.has('security-standalone@1')`, `registry.has('performance-standalone@1')`, and `registry.has('accessibility-standalone@1')` return false and their files under `sai-state/machines/` do not exist

### Requirement: Spec and design step machine file alignment validation

Tests MUST verify that the `spec-steps@1` and `design-steps@1` machines' STEPS and STAGE_FILES match the canonical spec and design step files, and that `design-steps@1` carries no `overview` entry. Prevents file path divergence between machine routing and the step libraries.

#### Scenario: Machine step file paths match the canonical spec step files

- **WHEN** spec-steps@1 STAGE_FILES are read
- **THEN** a test verifies that `spec-intake` maps to `none` and `research`, `proposal`, `specs`, and `validation` map to their files under `sai/commands/spec/steps/`

#### Scenario: Design file paths match the canonical design step files

- **WHEN** design-steps@1 STAGE_FILES are read
- **THEN** a test verifies that `design-intake` maps to `none`, `research`, `design`, `tasks`, and `interfaces` map to their files under `sai/commands/design/steps/`, and no `overview` entry exists

### Requirement: No coordinator card declares a step_machine field

Tests MUST discover the coordinators declaring `step_machine` by scanning `sai/commands/*/coordinator.md` for the `step_machine:` field pattern, and the discovered set SHALL be empty: the shared audit coordinator drives the `{audit}-steps@1` machines directly, and the spec and design coordinators drive `spec-steps@1` and `design-steps@1` from their own cards. A test MUST verify that the audit coordinator resets `{audit}-steps@1`, opens the task message with the first pointer line from that `reset`, and that each audit's first filed step has its step file.

#### Scenario: Discovery finds no step_machine coordinator

- **WHEN** the coordinator discovery scan completes
- **THEN** it identifies no coordinator declaring `step_machine`

#### Scenario: Audit coordinator sends the first filed pointer

- **WHEN** the wiring tests read `sai/commands/audit/coordinator.md`
- **THEN** they find the `reset` of `{audit}-steps@1` and the task message opening with `Active step: <stage> — follow <pointer>`, and each audit's first filed step file exists
