# Spec: Deduplicate sai-2-design wrappers

## ADDED requirements

### Requirement: Shared design instruction

The system SHALL provide a single `instructions/sai/design.md` file containing the approval gate and generation instructions for design.md and tasks.md.

#### Scenario: Both wrappers fetch shared instruction

- **WHEN** either `claude/commands/sai-2-design.md` or `opencode/commands/sai-2-design.md` is invoked
- **THEN** the wrapper fetches `instructions/sai/design.md` from the harness-specific path (`~/.claude/instructions/sai/` or `~/.config/opencode/instructions/sai/`)
- **AND** follows those instructions exactly
- **AND** the wrapper file contains only: frontmatter (description, model, optional argument-hint/effort), prereqs fetch, behavior fetches (explorer, glossary-format), the design.md fetch line, and remember.md fetch

### Requirement: No inline duplication

Neither `sai-2-design.md` wrapper SHALL contain inline generation instructions, approval gate logic, or section templates. All such content lives exclusively in `instructions/sai/design.md`.

#### Scenario: Mirror discipline maintained

- **WHEN** a change to design generation logic is needed
- **THEN** only `instructions/sai/design.md` is modified
- **AND** no changes are required to either wrapper beyond the harness-specific fetch path
