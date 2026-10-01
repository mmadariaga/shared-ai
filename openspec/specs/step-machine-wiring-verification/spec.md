# step-machine-wiring-verification Specification

## Purpose
TBD - created by archiving change extract-step-machine-routing. Update Purpose after archive.

## Requirements

### Requirement: Coordinator-machine fetch validation

For each coordinator that declares `step_machine: <name>@<version>`, a test MUST verify that the coordinator file loads `@sai/policies/stage-machine.md` via a fetch directive.

**Scope:** Static validation to prevent incomplete wiring.

#### Scenario: Coordinator with declared machine loads policy

- **WHEN** a coordinator declares `step_machine: spec-standalone@1`
- **THEN** a test confirms that the same coordinator.md file contains `Fetch @sai/policies/stage-machine.md`

### Requirement: Machine registration verification

For each coordinator that declares `step_machine: <name>@<version>`, a test MUST verify that the named machine is registered in `sai-state/registry.js`.

**Scope:** Runtime availability validation; prevents wiring to machines that don't exist.

#### Scenario: Declared machine is registered

- **WHEN** a coordinator declares `step_machine: spec-standalone@1`
- **THEN** a test confirms that `registry.has('spec-standalone@1')` returns true

### Requirement: Step id alignment validation

Tests SHALL verify exact ordered agreement between every declared coordinator progress plan and its registered machine STEPS, including both design variants. Review SHALL have exactly `resolve-change`, `establish-diff-scope`, `resolve-review-analysis`, and `close-review-outcome`; security, performance, and accessibility SHALL retain their five-step lists. Other phase lists SHALL remain unchanged.

#### Scenario: Coordinator progress_plan matches machine STEPS
- **WHEN** the spec machine declares its current STEPS
- **THEN** a test verifies the spec coordinator declares the same ids in the same order

#### Scenario: Design variant steps match both machine arrays
- **WHEN** design declares UNOPTED_STEPS and OPTED_IN_STEPS
- **THEN** a test verifies each corresponding coordinator variant matches its array

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

### Requirement: Step file path alignment validation

For spec and design coordinators that declare `step_machine`, tests MUST verify that the machine's STAGE_FILES map paths match those in the phase-contract files. Prevents file path divergence between machine routing and coordinator documentation.

#### Scenario: Machine step file paths match phase-contract

- **WHEN** spec-standalone@1 STAGE_FILES declares `research: 'sai/commands/spec/steps/research.md'`
- **THEN** a test verifies that the same step in `sai/policies/spec-phase-contract.md` declares the same path

#### Scenario: Design file paths match active variant

- **WHEN** design-standalone@1 STAGE_FILES declares paths for all unopted and opted-in variant steps
- **THEN** a test verifies that paths in `sai/commands/design/phase-contract.md` match the active variant's stage files

### Requirement: Coordinator discovery and bulk validation

Tests MUST discover all coordinators declaring `step_machine` by scanning `sai/commands/*/coordinator.md` files for the `step_machine:` field pattern and MUST validate every discovered coordinator against the preceding requirements without false positives. As of this change, discovered coordinators include spec, design, implement, performance, review, security, and accessibility.

#### Scenario: All coordinators with step_machine pass validation

- **WHEN** the test suite runs the coordinator discovery and validation
- **THEN** every coordinator declaring `step_machine` passes all validation checks (fetch, registration, step ids, file paths)

#### Scenario: Test catches newly declared unwired machine

- **WHEN** a new coordinator adds `step_machine: new-machine@1` without loading the policy
- **THEN** the test fails with a clear message indicating missing fetch or unregistered machine

#### Scenario: Discovery finds exactly spec, design, implement, and review

- **WHEN** the coordinator discovery scan completes
- **THEN** spec, design, implement, and review are each discovered as `step_machine` coordinators with registered machines (security, performance, and accessibility are additionally covered by later scenarios)

#### Scenario: Discovery finds spec, design, implement, review, and security with step machines

- **WHEN** the coordinator discovery scan completes
- **THEN** spec, design, implement, review, and security are each discovered as `step_machine` coordinators with registered machines (performance and accessibility are additionally covered by later scenarios)

#### Scenario: Discovery finds exactly six coordinators with step machines

- **WHEN** the coordinator discovery scan completes
- **THEN** spec, design, implement, performance, review, and security are each discovered as `step_machine` coordinators with registered implementations (accessibility is additionally covered by the seven-coordinator scenario)

#### Scenario: Discovery finds exactly seven coordinators with step machines

- **WHEN** the coordinator discovery scan completes
- **THEN** it identifies exactly spec, design, implement, performance, review, security, and accessibility declaring `step_machine` with registered implementations
