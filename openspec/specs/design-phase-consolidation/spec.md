# design-phase-consolidation Specification

## Purpose
Define the consolidated design phase: `sai/commands/design/phase-contract.md` as the authoritative source for the plans, routing, write surface, and result union; coordinator/worker plan parity; coordinator-supplied step pointers; and where the file-manifest fold and resolved-change-name placeholder rules live.

## Requirements

### Requirement: coordinator-and-worker-plan-parity
The coordinator and the worker SHALL resolve to the same progress-plan variant for a given invocation, selected from raw `--overview-lang` token presence: a present token selects the opted-in six-step plan, an absent token selects the unopted five-step plan. Neither plan contains a `review` step. Because both read the same canonical declaration, parity holds by construction rather than by duplicated enumeration.

#### Scenario: Present token selects the seven-step plan
- **WHEN** an invocation envelope contains an `--overview-lang` token in any form
- **THEN** both surfaces resolve the six-step plan whose ordered step ids are `prereqs-resolution`, `research`, `design`, `tasks`, `interfaces`, `overview`

#### Scenario: Absent token selects the six-step plan
- **WHEN** an invocation envelope contains no `--overview-lang` token
- **THEN** both surfaces resolve the five-step plan whose ordered step ids are `prereqs-resolution`, `research`, `design`, `tasks`, `interfaces`
- **AND** the `overview` step is omitted with no replacement step in its position

### Requirement: file-manifest-algorithm-lives-with-its-input

The deterministic net-fold algorithm that produces the `### File Manifest` subsection SHALL be implemented by `sai/tools/file-manifest.js` and invoked from `sai/commands/design/steps/tasks.md`, where its input — the per-step `**Files Affected**` entries — is authored; the normative fold rules remain those of the `design-target-state` capability. `sai/commands/design/steps/tasks.md` SHALL NOT restate the fold transition table in prose. `sai/commands/design/steps/design.md` SHALL state that the section exists and that the tasks step produces it through the tool, and SHALL NOT plan, author, or restate the algorithm.

#### Scenario: The fold is specified where its input exists

- **WHEN** a design run reaches the tasks step
- **THEN** that step's instruction file directs running `file-manifest.js fold` on the written `tasks.md`, and `sai/commands/design/steps/design.md` carries a reference to it rather than a second copy

### Requirement: placeholder-resolution-uses-resolved-change-name
Step instruction files under `sai/commands/design/steps/` SHALL denote the resolved change identifier with the placeholder `{resolved_change_name}` and SHALL NOT use `$ARGUMENTS`, which on a flag-bearing envelope interpolates the raw argument string into artifact paths.

#### Scenario: Step files carry the placeholder
- **WHEN** any of `research.md`, `design.md`, `interfaces.md`, or `tasks.md` names an artifact path
- **THEN** the path reads `openspec/changes/{resolved_change_name}/...`
- **AND** no occurrence of `$ARGUMENTS` remains in any step file

#### Scenario: A flag-bearing envelope does not corrupt the path
- **WHEN** the worker resolves a change from an envelope such as `{name} --fast-track --supervised`
- **THEN** the artifact path derives from the resolved change name alone
- **AND** no flag token appears in any path segment
