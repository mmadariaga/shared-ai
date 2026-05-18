# Deduplicate sai-2-design Specification

## Purpose
Deduplicate shared behavior between Claude Code and opencode wrappers by extracting shared instruction content into `instructions/sai/`, and reinforce artifact-only scope discipline and correct path references.

## Requirements

### Requirement: artifact-only-scope
`instructions/sai/spec.propose.md` SHALL contain an "Artifact-Only Scope" section that explicitly lists:
- What the spec command must NEVER create, modify, or delete (project source files, configuration files, infrastructure definitions, build artifacts)
- What commands it must NEVER run (build, test, lint, deploy, migrate)
- What files it MAY create or modify (only `openspec/changes/{name}/` artifacts)

#### Scenario: Artifact-Only Scope section present
- **WHEN** `instructions/sai/spec.propose.md` is read
- **THEN** it contains an "Artifact-Only Scope" heading with bullet lists for NEVER-touch categories and MAY-modify files

#### Scenario: scope covers file mutations
- **WHEN** the Artifact-Only Scope section is parsed
- **THEN** it lists at least: project source files, configuration files, infrastructure definitions, build artifacts as NEVER-touch
- **THEN** it lists exactly the `openspec/changes/{name}/` subset (proposal.md, specs/**/*.md, GLOSSARY.md, .openspec.yaml) as MAY-modify

#### Scenario: scope covers forbidden commands
- **WHEN** the Artifact-Only Scope section is parsed
- **THEN** it lists at least: build, test, lint, deploy, migrate as commands the spec agent must NEVER run

### Requirement: design-instruction
A shared instruction file `instructions/sai/design.md` SHALL exist containing the approval gate and generation instructions for sai-2-design. Both `claude/commands/sai-2-design.md` and `opencode/commands/sai-2-design.md` SHALL be thin wrappers that fetch and follow this shared instruction.

#### Scenario: shared design.md exists
- **WHEN** `instructions/sai/design.md` is read
- **THEN** it contains an "Approval gate" section that checks for specs existence and user confirmation
- **THEN** it contains a "Generation Instructions" section that produces `design.md` and `tasks.md`

#### Scenario: approval gate present
- **WHEN** the "Approval gate" section of `design.md` is read
- **THEN** it checks that `openspec/changes/$ARGUMENTS/proposal.md` and `specs/**/*.md` exist before proceeding
- **THEN** it asks the user to confirm spec approval before writing any files
- **THEN** on "yes" it writes `approval.specs.approved_at` and `approval.specs.notes` to `.openspec.yaml`

#### Scenario: Claude Code wrapper is thin
- **WHEN** `claude/commands/sai-2-design.md` is read
- **THEN** it does NOT contain inline generation instructions — only Fetch statements, with one referencing `design.md`

#### Scenario: opencode wrapper is thin
- **WHEN** `opencode/commands/sai-2-design.md` is read
- **THEN** it does NOT contain inline generation instructions — only Fetch statements, with one referencing `design.md`

### Requirement: opencode-remember-path-fix
The opencode `sai-1-spec` wrapper SHALL load `remember.md` from `~/.config/opencode/instructions/sai/remember.md`, not from the `~/.claude/` path.

#### Scenario: opencode sai-1-spec uses opencode path
- **WHEN** `opencode/commands/sai-1-spec.md` is read
- **THEN** the final `Fetch` line references `@~/.config/opencode/instructions/sai/remember.md`

#### Scenario: no claude path leak in opencode commands
- **WHEN** any file under `opencode/commands/` is searched
- **THEN** no file contains the string `~/.claude/`
