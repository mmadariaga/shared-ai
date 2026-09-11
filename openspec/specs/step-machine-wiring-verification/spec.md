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

For all coordinators that declare `step_machine` — spec, design, implement, and review — tests MUST verify that the coordinator's progress_plan step ids match the machine's STEPS array exactly. Prevents step mismatch between coordinator declarations and machine implementation.

#### Scenario: Coordinator progress_plan matches machine STEPS

- **WHEN** spec-standalone@1 machine declares STEPS as `['prereqs-and-change', 'research', 'proposal', 'specs', 'validation', 'review']`
- **THEN** a test verifies that the spec coordinator's progress_plan contains the same step ids in the same order

#### Scenario: Design variant steps match both machine arrays

- **WHEN** design-standalone@1 declares UNOPTED_STEPS and OPTED_IN_STEPS arrays
- **THEN** a test verifies that the unopted design coordinator variant's progress_plan matches UNOPTED_STEPS and the opted-in variant matches OPTED_IN_STEPS

#### Scenario: Implement coordinator step ids read from card and match machine STEPS

- **WHEN** implement-standalone@1 machine declares STEPS as `['prereqs-resolution', 'collapse-implemented-steps', 'artifact-analysis', 'documentation-review', 'plan-generation', 'validation']`
- **THEN** a test extracts the step ids from the implement coordinator's progress_plan and verifies exact match with the machine's STEPS

#### Scenario: Review coordinator step ids read from card and match machine STEPS

- **WHEN** review-standalone@1 machine declares STEPS as `['resolve-change', 'establish-diff-scope', 'resolve-review-analysis', 'resolve-mutation-analysis', 'close-review-outcome']`
- **THEN** a test extracts the step ids from the review coordinator's progress_plan and verifies exact match with the machine's STEPS

### Requirement: Step file path alignment validation

For spec and design coordinators that declare `step_machine`, tests MUST verify that the machine's STAGE_FILES map paths match those in the phase-contract files. Prevents file path divergence between machine routing and coordinator documentation.

#### Scenario: Machine step file paths match phase-contract

- **WHEN** spec-standalone@1 STAGE_FILES declares `research: 'sai/commands/spec/steps/research.md'`
- **THEN** a test verifies that the same step in `sai/policies/spec-phase-contract.md` declares the same path

#### Scenario: Design file paths match active variant

- **WHEN** design-standalone@1 STAGE_FILES declares paths for all unopted and opted-in variant steps
- **THEN** a test verifies that paths in `sai/commands/design/phase-contract.md` match the active variant's stage files

### Requirement: Coordinator discovery and bulk validation

Tests MUST discover all coordinators declaring `step_machine` by scanning `sai/commands/*/coordinator.md` files for the `step_machine:` field pattern and MUST validate every discovered coordinator against the preceding requirements without false positives. As of this change, discovered coordinators include spec, design, implement, and review.

#### Scenario: All coordinators with step_machine pass validation

- **WHEN** the test suite runs the coordinator discovery and validation
- **THEN** every coordinator declaring `step_machine` passes all validation checks (fetch, registration, step ids, file paths)

#### Scenario: Test catches newly declared unwired machine

- **WHEN** a new coordinator adds `step_machine: new-machine@1` without loading the policy
- **THEN** the test fails with a clear message indicating missing fetch or unregistered machine

#### Scenario: Discovery finds exactly spec, design, implement, and review

- **WHEN** the coordinator discovery scan completes
- **THEN** it identifies exactly these four coordinators declaring step_machine with registered implementations

