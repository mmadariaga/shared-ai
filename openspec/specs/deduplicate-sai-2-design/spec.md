# Deduplicate sai-2-design Specification

## Purpose
Deduplicate shared behavior between Claude Code and opencode wrappers by extracting shared instruction content into `sai/instructions/`, and reinforce artifact-only scope discipline and correct path references.

## Requirements

### Requirement: artifact-only-scope
`sai/instructions/spec.propose.md` SHALL contain an "Artifact-Only Scope" section that explicitly lists:
- What the spec command must NEVER create, modify, or delete (project source files, configuration files, infrastructure definitions, build artifacts)
- What commands it must NEVER run (build, test, lint, deploy, migrate)
- What files it MAY create or modify: only `openspec/changes/{name}/` artifacts, plus `./GLOSSARY.md` at the project root as a named exception

#### Scenario: Artifact-Only Scope section present
- **WHEN** `sai/instructions/spec.propose.md` is read
- **THEN** it contains an "Artifact-Only Scope" heading with bullet lists for NEVER-touch categories and MAY-modify files

#### Scenario: scope covers file mutations
- **WHEN** the Artifact-Only Scope section is parsed
- **THEN** it lists at least: project source files, configuration files, infrastructure definitions, build artifacts as NEVER-touch
- **THEN** it lists the `openspec/changes/{name}/` subset (proposal.md, specs/**/*.md, .openspec.yaml) as MAY-modify
- **THEN** it lists `./GLOSSARY.md` at the project root as a named MAY-modify exception, NOT as part of the `openspec/changes/{name}/` subset

#### Scenario: scope covers forbidden commands
- **WHEN** the Artifact-Only Scope section is parsed
- **THEN** it lists at least: build, test, lint, deploy, migrate as commands the spec agent must NEVER run
### Requirement: design-instruction
The design workflow SHALL be split into caller-neutral design invocation instructions, a routed coordinator body, a routed design-worker instruction, and a Copilot Inline Coordinator Adapter. Claude Code and opencode wrappers SHALL select the routed coordinator and their harness binding; GitHub Copilot SHALL select `sai/orchestration/inline-invocation.md` directly. Both execution paths SHALL consume the same design artifact and interaction contract so approval, generation, feedback, and navigation behavior remain single-sourced rather than independently reimplemented.

#### Scenario: shared design workflow exists
- **WHEN** the design instruction surfaces are read
- **THEN** they SHALL define one caller-neutral workflow that checks specs approval and produces `design.md`, `tasks.md`, and `interfaces.md`

#### Scenario: routed coordinator body is thin
- **WHEN** `sai/commands/design/coordinator.md` is read
- **THEN** it SHALL contain only coordinator lifecycle and interaction responsibilities and SHALL delegate technical execution to the design worker binding

#### Scenario: Copilot adapter preserves inline behavior
- **WHEN** the GitHub Copilot `sai-2-design` wrapper is read
- **THEN** it SHALL fetch the Copilot Inline Coordinator Adapter rather than the routed coordinator body or an inline command loader
- **AND** it SHALL retain the shared workflow semantics

#### Scenario: Copilot wrapper selects adapter entry
- **WHEN** `commands/copilot/sai-2-design.prompt.md` is read
- **THEN** it SHALL load the Copilot fetch adapter and `sai/orchestration/inline-invocation.md` without loading a routed design-worker binding

#### Scenario: Claude Code wrapper selects routed binding
- **WHEN** `commands/claude/sai-2-design.md` is read
- **THEN** it SHALL be a thin wrapper that loads the Claude design-worker binding and routed coordinator body without inline generation instructions

#### Scenario: opencode wrapper selects routed binding
- **WHEN** `commands/opencode/sai-2-design.md` is read
- **THEN** it SHALL be a thin wrapper that preserves the exact `**Change-name argument and and optional flags:** $ARGUMENTS` echo adapter, loads the opencode design-worker and implementation-worker bindings, and loads the routed coordinator body without inline generation instructions

### Requirement: opencode-remember-path-fix
The opencode `sai-1-spec` wrapper SHALL load `remember.md` from `~/.config/opencode/sai/instructions/remember.md`, not from the `~/.claude/` path.

#### Scenario: opencode sai-1-spec uses opencode path
- **WHEN** `commands/opencode/sai-1-spec.md` is read
- **THEN** the final `Fetch` line references `@~/.config/opencode/sai/instructions/remember.md`

#### Scenario: no claude path leak in opencode commands
- **WHEN** any file under `commands/opencode/` is searched
- **THEN** no file contains the string `~/.claude/`

### Requirement: active-infrastructure-boundary

Claude Code and opencode SHALL use the routed coordinator-worker infrastructure. GitHub Copilot SHALL preserve inline behavior through the direct adapter.

#### Scenario: claude design wrapper uses routed entry
- **WHEN** `commands/claude/sai-2-design.md` is read during Step 1
- **THEN** it SHALL reference the routed coordinator, design planning worker, and routed dispatch

#### Scenario: opencode design wrapper uses routed entry
- **WHEN** `commands/opencode/sai-2-design.md` is read during Step 1
- **THEN** it SHALL reference the routed coordinator, agent routing, and worker binding

#### Scenario: copilot design wrapper stays inline
- **WHEN** `commands/copilot/sai-2-design.prompt.md` is read during Step 1
- **THEN** it SHALL reference `sai/orchestration/inline-invocation.md` directly with `phase: sai-2-design`
- **AND** it SHALL NOT reference an agent-based coordinator or worker dispatch mechanism
