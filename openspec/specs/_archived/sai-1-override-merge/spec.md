## ADDED Requirements

### Requirement: override-section-in-spec-propose
A new section in `instructions/sai/spec.propose.md` SHALL specify that when invoked via sai-1-spec, the agent generates ONLY `proposal.md` and `specs/**/*.md`, and SHALL NOT generate `design.md` or `tasks.md`.

#### Scenario: override section present
- **WHEN** `instructions/sai/spec.propose.md` is read
- **THEN** it contains a section stating that `design.md` and `tasks.md` MUST NOT be generated during the sai-1 step

#### Scenario: override matches original wrapper intent
- **WHEN** `instructions/sai/spec.propose.md` is read
- **THEN** the override section preserves the full semantics of the text previously inline in both sai-1 wrappers (scope restriction to proposal + specs only, STOP+print handoff)

### Requirement: override-removed-from-claude-wrapper
The inline override text currently in `claude/commands/sai-1-spec.md` (the "generate ONLY proposal+specs, skip design/tasks" instruction) SHALL be removed from the wrapper.

#### Scenario: override absent from claude sai-1 wrapper
- **WHEN** `claude/commands/sai-1-spec.md` is read
- **THEN** no "generate ONLY" or "Do NOT generate design.md" instruction appears in the wrapper body

### Requirement: override-removed-from-opencode-wrapper
The inline override text currently in `opencode/commands/sai-1-spec.md` SHALL be removed from the wrapper.

#### Scenario: override absent from opencode sai-1 wrapper
- **WHEN** `opencode/commands/sai-1-spec.md` is read
- **THEN** no "generate ONLY" or "Do NOT generate design.md" instruction appears in the wrapper body

### Requirement: single-source-of-truth
After the merge, `instructions/sai/spec.propose.md` SHALL be the sole authoritative location for the sai-1 scope restriction. No wrapper SHALL contain a duplicate or partial copy of the override.

#### Scenario: no duplication across wrappers and instruction file
- **WHEN** all three files (`claude/commands/sai-1-spec.md`, `opencode/commands/sai-1-spec.md`, `instructions/sai/spec.propose.md`) are read
- **THEN** the scope restriction text appears only in spec.propose.md
