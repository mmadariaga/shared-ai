# Shared Text Neutrality Specification

## Purpose
TBD

## Requirements

### Requirement: Shared picker prose remains harness-neutral

The shared `sai/policies/artifact-feedback-gate.md` SHALL not embed a picker-tool example for one harness when the canonical harness mapping already lives in `sai/policies/remember.md`. This prohibition SHALL preserve the gate's two-choice order, proceed-label behavior, feedback iteration, and native-picker requirement.

#### Scenario: Artifact feedback gate delegates picker mapping
- **WHEN** a user reaches the artifact feedback gate
- **THEN** the shared gate text contains no single-harness picker example and the harness-specific picker mapping continues to come from `sai/policies/remember.md`

#### Scenario: Gate behavior remains unchanged
- **WHEN** the user selects feedback or the step-specific proceed label
- **THEN** the gate preserves its existing feedback-first ordering, iteration behavior, and proceed semantics across supported harnesses
