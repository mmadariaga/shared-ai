# apply-branch-selection-step Specification

## Purpose
Own the apply-time branch selection in a dedicated apply step file, outside the generated plan, loaded only when the picker must be presented.

## Requirements

### Requirement: Apply SHALL own branch selection in a dedicated step file
The branch-selection logic (current-branch detection, dynamic default-branch resolution, the three-option picker, and the branch-base picker) SHALL live in `sai/commands/apply/steps/branch-selection.md`. The implementation plan template SHALL carry no branch prelude.

#### Scenario: Branch logic lives in the apply step file
- **WHEN** a consumer looks for the branch-selection logic
- **THEN** it is found in `sai/commands/apply/steps/branch-selection.md`

#### Scenario: Plan template carries no branch prelude
- **WHEN** `sai/commands/implement/implementation-plan.template.md` is read
- **THEN** it contains no `## Prerequisites` section and no branch-selection prompt

### Requirement: Apply SHALL load the branch-selection step only when the picker must be presented
The apply coordinator SHALL fetch `sai/commands/apply/steps/branch-selection.md` as a plain fetch, not a machine step and without any change to `apply-standalone@1`, only when the picker must be shown: without fast-track, or with fast-track and a detached HEAD. With fast-track and a non-empty current branch, it SHALL stay on the current branch without loading the file.

#### Scenario: Run without fast-track loads the step
- **WHEN** `/sai-4-apply` runs without fast-track
- **THEN** the coordinator fetches `sai/commands/apply/steps/branch-selection.md` and presents the picker

#### Scenario: Fast-track on a named branch loads nothing
- **WHEN** `/sai-build` or `/sai-4-apply --fast-track` runs on a non-detached current branch
- **THEN** the coordinator stays on the current branch, prints `> Fast-track: staying on current branch "{current-branch}"`, and does not load `branch-selection.md`

#### Scenario: Fast-track with detached HEAD loads the step
- **WHEN** fast-track is active and HEAD is detached
- **THEN** the coordinator fetches `branch-selection.md` and presents the current three-option question with no auto-stay announcement

### Requirement: A prelude in an older plan SHALL be ignored
Branch selection SHALL be governed only by `sai/commands/apply/steps/branch-selection.md`. A `## Prerequisites` section in an older `implementation.md` SHALL be ignored by apply and SHALL NOT be migrated.

#### Scenario: Older plan still carries Prerequisites
- **WHEN** apply runs on an `implementation.md` that still contains a `## Prerequisites` prelude
- **THEN** apply ignores that section and applies the branch-selection rules of `branch-selection.md` only
