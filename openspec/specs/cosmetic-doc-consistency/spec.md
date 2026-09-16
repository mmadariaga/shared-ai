# cosmetic-doc-consistency Specification

## Purpose
TBD - created by archiving change fix-cosmetic-doc-drift. Update Purpose after archive.

## Requirements

### Requirement: Safe-operations consumer count
The AGENTS.md safe-operations row SHALL state 10 sai-* commands instead of 9 wrappers.
#### Scenario: Count corrected
- **WHEN** a reader opens the safe-operations row in AGENTS.md
- **THEN** the row states Loaded by 10 sai-* commands with no wrapper-only wording

### Requirement: Boot example coordinator path
The SAI_LEARNINGS.md boot guidance SHALL cite apply/coordinator.md instead of apply/body.md in its concrete examples.
#### Scenario: Example path current
- **WHEN** a reader follows the boot card-selection examples in SAI_LEARNINGS.md
- **THEN** the examples resolve to installed coordinator cards including apply/coordinator.md

### Requirement: Dual-canonical rationale accuracy
The ADR 0173a record SHALL describe instructions.md as a cited reference and SHALL NOT claim byte-for-byte untouched status for apply or invocation.md authority.
#### Scenario: Rationale corrected
- **WHEN** a reader opens the ADR Context, Decision, and Consequences sections
- **THEN** the text describes steps as worker-canonical and instructions.md as a cited reference with no sync mechanism

### Requirement: Boot paren punctuation
Both boot cards SHALL close the utility body example without an extra closing paren.
#### Scenario: Punctuation fixed
- **WHEN** a reader opens either sai/adapters/claude/boot.md or sai/adapters/opencode/boot.md line 8
- **THEN** the explore body example ends with a single period and no stray paren

### Requirement: ADR-DDR consumer coverage
The adr-ddr-criteria policy SHALL list design steps, implement instructions Step 3, implement steps/artifact-analysis.md, and explore steps/pipeline-direct-build.md as consumers and SHALL state that no fetching body restates the criteria inline.
#### Scenario: Consumer list complete
- **WHEN** a reader checks the consumer list in sai/policies/adr-ddr-criteria.md
- **THEN** all four consumers are listed and the single-source rule names no restating body

### Requirement: Apply projection consumer reference
The todo-structure policy SHALL cite sai/commands/apply/coordinator.md as the consuming surface for the apply step projection.
#### Scenario: Projection reference current
- **WHEN** a reader follows the apply step projection consumer reference
- **THEN** the reference resolves to apply/coordinator.md with no instructions.md mention

### Requirement: Fetch resolution table completeness
The fetch SKILL disambiguation table SHALL document project-local and user-global rows for both sai commands and commands prefixes.
#### Scenario: Table covers both roots
- **WHEN** a reader opens the disambiguation table in skills/opencode/fetch/SKILL.md
- **THEN** the table shows four rows covering project-local and user-global for each prefix
