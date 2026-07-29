# Design Behavioral Parity Specification

## Purpose

Define the behavioral parity requirements that the design coordinator-worker refactor SHALL preserve from the existing design phase, ensuring that the refactored path produces identical observable behavior across routed and inline paths.

## Requirements

### Requirement: Routed and inline design paths preserve artifact parity
The routed Claude Code and opencode paths and the inline Copilot path SHALL produce the same `design.md`, `tasks.md`, and `interfaces.md` formats, required sections, provenance and verify-first markers, routing metadata, Implementation Context, Required Documentation, Manual Verification, and cross-artifact step alignment required by the current design workflow.

#### Scenario: Equivalent change is designed on different harnesses
- **WHEN** the same proposal, approved specs, codebase snapshot, glossary, learnings, and user answers are processed through a routed path and the Copilot inline path
- **THEN** both paths SHALL satisfy the same artifact schemas and design-quality constraints without coordinator-specific content in the artifacts

### Requirement: Approval and amendment semantics remain unchanged
The migration SHALL preserve required source-artifact checks, specs approval metadata merge behavior, fast-track auto-approval, explicit amendment consent, amendment audit metadata, and the route back to `/sai-1-spec` when a correction is not clear. Moving these operations into the worker SHALL not add or remove an approval gate.

#### Scenario: Fast-track design starts
- **WHEN** `/sai-2-design {name} --fast-track` runs on any harness
- **THEN** universal prerequisites SHALL run first; only after they pass SHALL the existing fast-track banner print exactly once, specs auto-approval behavior occur, and every unnamed gate remain in force

#### Scenario: Fast-track design fails prerequisites
- **WHEN** `/sai-2-design {name} --fast-track` fails a universal prerequisite
- **THEN** the existing prerequisite error SHALL print without any fast-track banner, matching the inline ordering

#### Scenario: User declines specs approval
- **WHEN** fast-track is inactive and the user answers `no` to specs approval
- **THEN** the workflow SHALL stop without generating design artifacts, regardless of whether the path is routed or inline

### Requirement: Questions, summaries, and artifact feedback remain behaviorally equivalent
The migration SHALL preserve Open Questions resolution, the artifact-derived decision summary, the shared feedback gate's option order and iteration behavior, selective per-item feedback application, discard reporting, and summary recomputation. Routed coordinators SHALL relay these interactions without changing their semantics.

#### Scenario: First feedback gate is presented
- **WHEN** design artifacts have been written and verified
- **THEN** the user SHALL receive the same two artifact-feedback options, with feedback first and recommended only on the initial presentation

#### Scenario: Feedback changes a decision and task
- **WHEN** legitimate feedback affects both `design.md` and `tasks.md`
- **THEN** the responsible inline agent or design worker SHALL update and verify all affected design artifacts and emit a summary derived from the updated files

### Requirement: Stop and Continue navigation remain equivalent
The workflow SHALL present a single post-feedback terminal behavior on every harness: after the artifact-feedback gate is satisfied, the design command SHALL emit its mandatory design completion stop and end. There SHALL be no Continue-now choice and no same-prompt generation of `implementation.md` on any harness. Routed harnesses and the Copilot inline path SHALL be equivalent at this boundary, differing only in the harness-specific mechanism used within the design phase itself.

#### Scenario: routed harness ends at design completion
- **WHEN** routed design completes on Claude Code or opencode
- **THEN** the coordinator SHALL emit the mandatory design completion stop exactly once, SHALL NOT reset lifecycle state into an implementation namespace, SHALL NOT dispatch the implementation-worker binding, and SHALL NOT generate `implementation.md`

#### Scenario: Copilot ends at design completion
- **WHEN** inline Copilot design completes
- **THEN** it SHALL emit the same mandatory design completion stop and SHALL NOT run its inline implementation planning path
