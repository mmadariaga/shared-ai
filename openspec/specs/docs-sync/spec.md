## ADDED Requirements

### Requirement: agents-md-structure-table
`AGENTS.md` structure table SHALL list `sai/commands/` (command cards carrying command-local `instructions.md` and co-located `.template.md` files), the root exceptions `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md`, `commands/claude/`, `commands/opencode/`, and `configs/` as the canonical source-layout names. The structure table SHALL NOT list a maintained `sai/instructions/` tree. All previous path references (`commands/sai/`, `instructions/sai/`, `claude/commands/`, `opencode/commands/`, `opencode/opencode.jsonc`) SHALL be replaced with their new equivalents.

#### Scenario: structure table reflects the folded layout
- **WHEN** `AGENTS.md` is read
- **THEN** the structure table SHALL NOT contain `sai/instructions/`, `commands/sai/`, `instructions/sai/`, `claude/commands/`, `opencode/commands/`, or `opencode/opencode.jsonc` as directory/file names

#### Scenario: folded paths present in table
- **WHEN** `AGENTS.md` is read
- **THEN** the structure table SHALL contain entries for `sai/commands/`, the command-local instruction/template pattern, the three root exceptions (`sai/change-overview.md`, `sai/adr-index.template.md`, `sai/ddr-index.template.md`), `commands/claude/`, `commands/opencode/`, and `configs/`

### Requirement: agents-md-fetch-convention-section
The Fetch convention section (or equivalent section describing how wrappers load command bodies and instructions) in `AGENTS.md` SHALL reference `@sai/commands/` (command cards, command-local `instructions.md`, and co-located `.template.md` files) as the canonical Fetch paths and SHALL NOT reference a maintained `@sai/instructions/` namespace. References to `@commands/sai/` and `@instructions/sai/` SHALL be removed.

#### Scenario: fetch convention updated
- **WHEN** the Fetch convention section of `AGENTS.md` is read
- **THEN** example Fetch paths SHALL use `@sai/commands/` and the root `sai` exception paths, and SHALL NOT use `@sai/instructions/`

### Requirement: adr-0003-amended
`docs/adr/0003-fetch-path-convention-commands-sai.md` SHALL be amended to reflect the folded decision: `@sai/commands/<name>.md` is the canonical Fetch path for command cards, command-local instructions and templates are folded into `sai/commands/{name}/`, and the three root exceptions (`sai/change-overview.md`, `sai/adr-index.template.md`, `sai/ddr-index.template.md`) install at the `sai` root. The Decision and Rationale sections SHALL be updated; the original decision and prior amendment history SHALL be preserved in the existing historical sections.

#### Scenario: ADR decision updated
- **WHEN** `docs/adr/0003-fetch-path-convention-commands-sai.md` is read
- **THEN** the Decision section SHALL state `@sai/commands/<name>.md` as the canonical path for command cards and SHALL name the folded command-local instruction/template paths and the three root exceptions

#### Scenario: ADR rationale updated
- **WHEN** the Rationale section of ADR 0003 is read
- **THEN** it SHALL explain the `sai/` grouping and the fold: sai payload grouped under `sai/` mirrors the source layout and aligns with the `sai/commands/` install destination, with command-local instructions and templates co-located beside their cards

#### Scenario: original decision preserved
- **WHEN** ADR 0003 is read
- **THEN** the original `@commands/sai/` decision and the prior `sai/instructions/` layout SHALL be documented in the amendment history so the rationale history is traceable

## MODIFIED Requirements

## REMOVED Requirements
