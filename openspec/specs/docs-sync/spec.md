## ADDED Requirements

### Requirement: agents-md-structure-table
`AGENTS.md` structure table SHALL list `sai/commands/`, `sai/instructions/`, `commands/claude/`, `commands/opencode/`, and `configs/` as the canonical directory names. All previous path references (`commands/sai/`, `instructions/sai/`, `claude/commands/`, `opencode/commands/`, `opencode/opencode.jsonc`) SHALL be replaced with their new equivalents.

#### Scenario: structure table reflects new layout
- **WHEN** `AGENTS.md` is read
- **THEN** the structure table SHALL NOT contain `commands/sai/`, `instructions/sai/`, `claude/commands/`, `opencode/commands/`, or `opencode/opencode.jsonc` as directory/file names

#### Scenario: new paths present in table
- **WHEN** `AGENTS.md` is read
- **THEN** the structure table SHALL contain entries for `sai/commands/`, `sai/instructions/`, `commands/claude/`, `commands/opencode/`, and `configs/`

### Requirement: agents-md-fetch-convention-section
The Fetch convention section (or equivalent section describing how wrappers load command bodies and instructions) in `AGENTS.md` SHALL reference `@sai/commands/` and `@sai/instructions/` as the canonical Fetch paths. References to `@commands/sai/` and `@instructions/sai/` SHALL be removed.

#### Scenario: fetch convention updated
- **WHEN** the Fetch convention section of `AGENTS.md` is read
- **THEN** example Fetch paths SHALL use `@sai/commands/` and `@sai/instructions/`

### Requirement: adr-0003-amended
`docs/adr/0003-fetch-path-convention-commands-sai.md` SHALL be amended to reflect the new decision: `@sai/commands/<cmd>.md` is the canonical Fetch path for sai command bodies. The Decision and Rationale sections SHALL be updated; prior history SHOULD be preserved in a new `## Amendment` section.

#### Scenario: ADR decision updated
- **WHEN** `docs/adr/0003-fetch-path-convention-commands-sai.md` is read
- **THEN** the Decision section SHALL state `@sai/commands/<cmd>.md` as the canonical path

#### Scenario: ADR rationale updated
- **WHEN** the Rationale section of ADR 0003 is read
- **THEN** it SHALL explain the `sai/` grouping: sai payload grouped under `sai/` mirrors the source layout and aligns with the `sai/commands/` install destination

#### Scenario: original decision preserved
- **WHEN** ADR 0003 is read
- **THEN** the original `@commands/sai/` decision SHALL be documented (e.g., in an Amendment section) so the rationale history is traceable

## MODIFIED Requirements

## REMOVED Requirements
