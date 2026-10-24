# merge-lifecycle-validation-seam Specification

## Purpose
Defines the coordinator-owned merge lifecycle state machine: its states, the exhaustive permitted-transition table, and the validation the coordinator runs before each operation.

## Requirements

### Requirement: Merge run state replaces the lifecycle table

`/sai-merge` SHALL have no lifecycle state table or transition validator: `sai/commands/merge/lifecycle.md` SHALL be retired with a retirement entry in `sai/install-manifest.json`, and the run's progress SHALL be held by the `merge-run@1` machine and the git state, the git state winning when they disagree.

#### Scenario: Lifecycle card is retired

- **WHEN** the install manifest is read
- **THEN** it carries a retirement entry for `commands/merge/lifecycle.md` and no active projection of it
