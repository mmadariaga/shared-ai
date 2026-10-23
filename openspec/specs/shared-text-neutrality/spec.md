# Shared Text Neutrality Specification

## Purpose
TBD

## Requirements

### Requirement: Plan cycle picker prose remains harness-neutral

The shared plan segment cycle `sai/commands/plan/cycle.md` SHALL not embed a picker-tool example for one harness when the canonical harness mapping already lives in `sai/policies/remember.md`. This prohibition SHALL preserve the escalation's coordinator-written options, its stop option, and the native-picker requirement.

#### Scenario: Plan escalation delegates picker mapping

- **WHEN** a plan segment escalates an obstacle to the user
- **THEN** the shared cycle text contains no single-harness picker example and the harness-specific picker mapping continues to come from `sai/policies/remember.md`

#### Scenario: Escalation behavior remains unchanged

- **WHEN** the user selects a way to continue or the stop option
- **THEN** the escalation keeps its option order, its counter reset on continue, and its stop semantics across supported harnesses
