## ADDED Requirements

### Requirement: rename-plan-to-implement
`instructions/sai/plan.md` SHALL be renamed to `instructions/sai/implement.md`.

#### Scenario: plan.md absent after rename
- **WHEN** the rename is applied
- **THEN** `instructions/sai/plan.md` does not exist and `instructions/sai/implement.md` does exist

### Requirement: rename-implement-to-apply
`instructions/sai/implement.md` (the current apply-step instruction) SHALL be renamed to `instructions/sai/apply.md`.

#### Scenario: implement.md absent after rename
- **WHEN** the rename is applied
- **THEN** `instructions/sai/implement.md` does not exist and `instructions/sai/apply.md` does exist

### Requirement: update-wrapper-fetch-plan
Every wrapper line of the form `Fetch @~/.{claude,config/opencode}/instructions/sai/plan.md` SHALL be updated to reference `implement.md`.

#### Scenario: sai-3 claude wrapper updated
- **WHEN** `claude/commands/sai-3-implement.md` is read
- **THEN** it fetches `implement.md`, not `plan.md`

#### Scenario: sai-3 opencode wrapper updated
- **WHEN** `opencode/commands/sai-3-implement.md` is read
- **THEN** it fetches `implement.md`, not `plan.md`

### Requirement: update-wrapper-fetch-implement
Every wrapper line of the form `Fetch @~/.{claude,config/opencode}/instructions/sai/implement.md` SHALL be updated to reference `apply.md`.

#### Scenario: sai-4 claude wrapper updated
- **WHEN** `claude/commands/sai-4-apply.md` is read
- **THEN** it fetches `apply.md`, not `implement.md`

#### Scenario: sai-4 opencode wrapper updated
- **WHEN** `opencode/commands/sai-4-apply.md` is read
- **THEN** it fetches `apply.md`, not `implement.md`

### Requirement: update-inline-text-plan-md
All inline textual references to the filename `plan.md` within instruction files and wrappers (e.g., "the equivalent of `plan.md`") SHALL be updated to `implement.md`.

#### Scenario: pr.md inline references updated
- **WHEN** `instructions/sai/pr.md` is read
- **THEN** all occurrences of the text `plan.md` read `implement.md`

#### Scenario: sai-pr wrappers updated
- **WHEN** `claude/commands/sai-pr.md` is read
- **THEN** no occurrence of `plan.md` as a filename reference remains

### Requirement: update-self-reference-in-apply
`instructions/sai/apply.md` (formerly `implement.md`) SHALL not reference its own old filename `implement.md` internally.

#### Scenario: internal self-reference correct
- **WHEN** `instructions/sai/apply.md` is read
- **THEN** any self-referential passage names the file `apply.md`, not `implement.md`

### Requirement: no-new-apply-md-confusion
The rename must not introduce ambiguity: after the rename, the identifier `implement.md` refers unambiguously to the sai-3 step instruction (formerly `plan.md`), and `apply.md` refers unambiguously to the sai-4 step instruction (formerly `implement.md`).

#### Scenario: no stale plan.md references remain
- **WHEN** all files under `instructions/sai/`, `claude/commands/`, and `opencode/commands/` are searched for the string `plan.md`
- **THEN** zero matches that refer to the renamed file are found (incidental mentions in documentation are allowed only if they describe the old name in a historical context)
