# step-machine-wiring-verification Specification

## Purpose
TBD - created by archiving change extract-step-machine-routing. Update Purpose after archive.

## Requirements

### Requirement: Coordinator-machine fetch validation

For each coordinator that declares `step_machine: <name>@<version>`, a test MUST verify that the coordinator file loads `@sai/policies/stage-machine.md` via a fetch directive.

**Scope:** Static validation to prevent incomplete wiring.

#### Scenario: Coordinator with declared machine loads policy

- **WHEN** a coordinator declares `step_machine: security-standalone@1`
- **THEN** a test confirms that the same coordinator.md file contains `Fetch @sai/policies/stage-machine.md`

### Requirement: Machine registration verification

For each coordinator that declares `step_machine: <name>@<version>`, a test MUST verify that the named machine is registered in `sai-state/registry.js`.

**Scope:** Runtime availability validation; prevents wiring to machines that don't exist.

#### Scenario: Declared machine is registered

- **WHEN** a coordinator declares `step_machine: security-standalone@1`
- **THEN** a test confirms that `registry.has('security-standalone@1')` returns true

### Requirement: Coordinator step id alignment validation

Tests SHALL verify exact ordered agreement between every declared coordinator progress plan and its registered machine STEPS. Review SHALL have exactly `resolve-change`, `establish-diff-scope`, `resolve-review-analysis`, and `close-review-outcome`; security, performance, and accessibility SHALL retain their five-step lists. Other phase lists SHALL remain unchanged. The spec and design coordinators declare no progress plan; their machines are verified by the spec and design step machine file alignment requirement.

#### Scenario: Implement coordinator step ids read from card and match machine STEPS
- **WHEN** implement declares its current STEPS
- **THEN** a test extracts the coordinator ids and verifies exact agreement

#### Scenario: Performance coordinator step ids read from card and match machine STEPS
- **WHEN** performance declares `resolve-performance-scope`, `map-stack-hot-paths`, `audit-performance-tiers`, `resolve-diagnostics`, `close-performance-outcome`
- **THEN** a test verifies exact coordinator agreement

#### Scenario: Review coordinator step ids read from card and match machine STEPS
- **WHEN** review declares `resolve-change`, `establish-diff-scope`, `resolve-review-analysis`, `close-review-outcome`
- **THEN** a test verifies exact coordinator agreement with no mutation id

#### Scenario: Security coordinator step ids read from card and match machine STEPS
- **WHEN** security declares `resolve-security-scope`, `discover-module-map`, `resolve-sast-analysis`, `resolve-sca`, `close-security-outcome`
- **THEN** a test verifies exact coordinator agreement

#### Scenario: Accessibility coordinator step ids read from card and match machine STEPS
- **WHEN** accessibility declares `resolve-accessibility-scope`, `map-ui-framework`, `resolve-static-audit`, `resolve-runtime-audit`, `close-accessibility-outcome`
- **THEN** a test verifies exact coordinator agreement

### Requirement: Spec and design step machine file alignment validation

Tests MUST verify that the `spec-steps@1` and `design-steps@1` machines' STEPS and STAGE_FILES match the canonical spec and design step files, and that `design-steps@1` carries no `overview` entry. Prevents file path divergence between machine routing and the step libraries.

#### Scenario: Machine step file paths match the canonical spec step files

- **WHEN** spec-steps@1 STAGE_FILES are read
- **THEN** a test verifies that `spec-intake` maps to `none` and `research`, `proposal`, `specs`, and `validation` map to their files under `sai/commands/spec/steps/`

#### Scenario: Design file paths match the canonical design step files

- **WHEN** design-steps@1 STAGE_FILES are read
- **THEN** a test verifies that `design-intake` maps to `none`, `research`, `design`, `tasks`, and `interfaces` map to their files under `sai/commands/design/steps/`, and no `overview` entry exists

### Requirement: Step-machine coordinator discovery and bulk validation

Tests MUST discover all coordinators declaring `step_machine` by scanning `sai/commands/*/coordinator.md` files for the `step_machine:` field pattern and MUST validate every discovered coordinator against the preceding requirements without false positives. The discovered coordinators SHALL be exactly security, performance, and accessibility: the spec and design coordinators drive `spec-steps@1` and `design-steps@1` from their own cards outside the shared orchestration and declare no `step_machine` field.

#### Scenario: All coordinators with step_machine pass validation

- **WHEN** the test suite runs the coordinator discovery and validation
- **THEN** every coordinator declaring `step_machine` passes all validation checks (fetch, registration, step ids)

#### Scenario: Test catches newly declared unwired machine

- **WHEN** a new coordinator adds `step_machine: new-machine@1` without loading the policy
- **THEN** the test fails with a clear message indicating missing fetch or unregistered machine

#### Scenario: Discovery finds exactly the three audit coordinators

- **WHEN** the coordinator discovery scan completes
- **THEN** it identifies exactly security, performance, and accessibility declaring `step_machine` with registered implementations
