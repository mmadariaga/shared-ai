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
The workflow SHALL preserve the post-feedback Stop for new chat and Continue now choices and their mandatory stop semantics. Continue now SHALL generate `implementation.md` without applying it; routed harnesses SHALL use the implementation coordinator-worker architecture established by the preceding slice where applicable, while Copilot SHALL retain its inline implementation path.

#### Scenario: Continue now is selected on a routed harness
- **WHEN** the user selects Continue now after routed design completion
- **THEN** the coordinator SHALL reset lifecycle state, pass `resolved_change_name` as the `arguments_value` of an explicit envelope with empty `wrapper_echo_value` to the established implementation-worker binding, report only implementation-phase changed files from that new namespace, and stop after verified `implementation.md` generation without applying code

#### Scenario: Continue now is selected on Copilot
- **WHEN** the user selects Continue now after inline Copilot design completion
- **THEN** the existing inline implementation planning path SHALL run and preserve the same final mandatory stop
