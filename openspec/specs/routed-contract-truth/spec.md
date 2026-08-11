# Routed Contract Truth Specification

## Purpose

TBD — seeded from the `repair-copilot-contract-prose` delta spec.

## Requirements

### Requirement: Retired-party prose has a maintained verification guard

The repository SHALL maintain one retired-party prose guard, shared by this capability and `invocation-core-provenance`. Its active invocation-core inventory is every file matching `sai/commands/*/invocation.md`. Its live contract inventory is deliberately fixed for this slice at exactly `openspec/specs/design-coordinator/spec.md`, `openspec/specs/implementation-harness-bindings/spec.md`, `openspec/specs/implementation-coordinator/spec.md`, `openspec/specs/coordinator-instruction-loading/spec.md`, `openspec/specs/review-phase-worker/spec.md`, `openspec/specs/security-phase-worker/spec.md`, `openspec/specs/accessibility-phase-worker/spec.md`, `openspec/specs/accessibility-worker-bindings/spec.md`, `openspec/specs/accessibility-worker-installation/spec.md`, and `openspec/specs/deduplicate-sai-2-design/spec.md`. The guard SHALL fail and identify the offending file and line when any audited active source positively assigns current behavior, ownership, support, entrypoint, or projection to `Copilot`, `Inline Coordinator Adapter`, `sai/orchestration/inline-invocation.md`, or `inline caller`. It SHALL allow retirement or absence evidence when the containing assertion explicitly uses the existing audit's retirement markers (`absent`, `exclude`, `historical`, `retired`, `removed`, `cleanup`, `former`, or `not available`) or an explicit negative marker (`no`, `not`, `without`, `never`, `does not`, `do not`, or `no longer`). This mirrors the existing `isRetirementEvidence` behavior while preserving the distinction between a positive current-party assignment and a legitimate negative assertion. The guard SHALL exclude `openspec/specs/_archived/copilot-harness-instructions/spec.md` and `openspec/specs/_archived/model-variant-wrappers/spec.md` and preserve the existing retired-source audit behavior. The guard checks retired-party strings and their assertion polarity only; semantic content obligations remain requirements of the contracts below and are verified by review. The fixed live contract inventory SHALL be extended in the same change whenever a new live specification defines one of these routed contract surfaces or a listed specification moves.

#### Scenario: Current routed prose passes the retired-party guard

- **WHEN** the maintained prose guard audits the corrected active inventory
- **THEN** it passes because the active inventory names only the supported routed contract
- **AND** it continues to enforce the existing retired-source checks

#### Scenario: Negative retirement evidence passes the retired-party guard

- **WHEN** an audited active source states that a retired party, adapter, or projection is absent, excluded, unsupported, or not added
- **THEN** the guard accepts the assertion as retirement evidence
- **AND** it does not require the negative coverage to be deleted

#### Scenario: Reintroduced retired-party prose fails the guard

- **WHEN** a current-party assertion containing one of the retired-party patterns is added to an audited active source
- **THEN** the guard fails
- **AND** its failure identifies the offending file and line without treating archived historical prose as an active violation

#### Scenario: Fixed-scope inventory maintenance is explicit

- **WHEN** a future change adds or moves a live specification that defines a routed coordinator, invocation core, worker binding, worker installation, or phase-worker contract
- **THEN** that change extends the fixed live contract inventory and the guard in the same change
- **AND** the existing ten-file slice remains a deliberate scope boundary rather than an accidentally stale list

### Requirement: Live coordinator contracts describe the supported routed boundary

Live coordinator and routing contracts SHALL describe Claude Code and opencode as the supported routed harnesses. Their active entrypoint, adapter, wrapper, and worker-binding prose SHALL not assign current behavior to GitHub Copilot or `sai/orchestration/inline-invocation.md`.

#### Scenario: Corrected coordinator contracts state the routed entrypoint boundary

- **WHEN** a reviewer examines the corrected design and implementation entrypoint contracts
- **THEN** the active contract names the Claude Code and opencode routed coordinator and matching worker-binding paths
- **AND** it does not require a Copilot inline entry, inline adapter, or compatibility loader

#### Scenario: Corrected coordinator contracts preserve the active boundary

- **WHEN** a reviewer examines the corrected instruction-loading and deduplication contract assertions
- **THEN** the prose describes only the supported routed instruction and binding resolution behavior
- **AND** the existing routed loading, artifact, approval, feedback, and navigation semantics remain unchanged

### Requirement: Audit worker specifications assign shared cores to routed workers

Live review, security, and accessibility worker specifications SHALL assign their shared invocation-core loading and technical workflow to the routed phase worker. They SHALL preserve each phase's existing prerequisites, scope, audit policy, lifecycle ownership, artifact contract, and verification behavior while no longer describing an inline caller as a supported party.

#### Scenario: Corrected audit-worker contracts state routed core ownership

- **WHEN** a reviewer examines the corrected review, security, and accessibility worker contracts
- **THEN** each contract assigns core loading and the technical workflow to the corresponding routed worker
- **AND** each preserves the existing phase ownership without an inline caller branch

### Requirement: Routed worker binding and installation specifications contain no retired compatibility party

Live implementation and accessibility binding and installation specifications SHALL describe only the active Claude Code and opencode routed worker bindings, projections, continuation behavior, and inventory. They SHALL not require Copilot inline behavior, a Copilot caller body, a Copilot worker exception, or a Copilot/inline projection.

#### Scenario: Corrected binding and installation contracts state active harnesses

- **WHEN** a reviewer examines the corrected implementation and accessibility binding and installation contracts
- **THEN** the required worker surfaces and lifecycle behavior are defined for Claude Code and opencode
- **AND** no retired Copilot or inline asset is part of the required binding or installation inventory

### Requirement: Archived historical prose remains outside the correction

The correction SHALL not edit `openspec/specs/_archived/copilot-harness-instructions/spec.md` or `openspec/specs/_archived/model-variant-wrappers/spec.md`. The already-correct routed-only assertions in `openspec/specs/routed-harness-support/spec.md` and `openspec/specs/orchestration-source-layout/spec.md` SHALL remain unchanged and serve as the live semantic baseline.

#### Scenario: Review confirms archived and baseline specifications remain outside the correction

- **WHEN** a reviewer compares the change's source files with the two archived and two baseline specifications
- **THEN** both named archived specifications are absent from the changed-file set
- **AND** the routed-only baseline specifications are not rewritten as part of this prose correction
