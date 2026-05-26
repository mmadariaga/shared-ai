# spec: sai-command-registry

## ADDED Requirements

### Requirement: Universal skill lists all /sai-* commands with fetch paths

The `sai-commands` skill SHALL provide a command registry table mapping each `/sai-*` command to its corresponding `@commands/sai-<name>.md` fetch path, along with a one-line description of what the command does.

#### Scenario: LLM invokes /sai-3-implement
- **WHEN** the user invokes `/sai-3-implement`
- **THEN** the skill registry maps it to `@commands/sai-3-implement.md` with description "Granular implementation plan"

#### Scenario: LLM invokes /sai-backfill
- **WHEN** the user invokes `/sai-backfill`
- **THEN** the skill registry maps it to `@commands/sai-backfill.md` with description "Post-hoc backfill"

#### Scenario: all numbered and unnumbered commands present
- **WHEN** the skill is loaded
- **THEN** the registry table contains entries for: sai-explore, sai-1-spec, sai-2-design, sai-3-implement, sai-4-apply, sai-5-review, sai-6-security, sai-7-performance, sai-8-accessibility, sai-archive, sai-pr, sai-commit, sai-backfill, and budget

### Requirement: Skill declares fetch-before-execute rule

The skill SHALL state that the LLM MUST resolve `/sai-*` commands by reading the corresponding file from `@commands/sai-<name>.md` and MUST NOT interpret or execute a sai-* task directly.

#### Scenario: LLM attempts to skip command loading
- **WHEN** the LLM receives a `/sai-*` invocation
- **THEN** it MUST fetch the command file first, not interpret the task freely

### Requirement: Skill explains why loading matters

The skill SHALL document the quality layers that sai-* commands provide: prerequisite checks, caveman communication mode, cost discipline via budget skills, phase-specific instructions, and OpenSpec skill chaining.

#### Scenario: LLM understands consequence of skipping
- **WHEN** the LLM considers skipping the command file
- **THEN** it recognizes that skipping means skipping all quality layers
