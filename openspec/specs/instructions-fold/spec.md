# instructions-fold Specification

## Purpose

TBD - created by archiving change fold-sai-instructions-templates. Update Purpose after archive.

## Requirements

### Requirement: command-instructions-are-co-located

Every command-owned instruction currently under `sai/instructions/` SHALL move verbatim to a distinct path within its owning `sai/commands/{name}/` directory, and the former `sai/instructions/` command files SHALL be absent after the migration. A command's primary instruction SHALL use `sai/commands/{name}/instructions.md`; additional instruction files for the same command SHALL use disambiguated neighboring names ending in `.instructions.md`. The move SHALL cover all command instructions, including `spec.propose.md` as `sai/commands/spec/instructions.md`, without changing their effective content or command behavior.

#### Scenario: each instruction has one distinct destination

- **WHEN** the maintained SAI source tree is inspected after the fold
- **THEN** each command-owned source instruction has exactly one distinct neighboring destination with equivalent content, the primary instruction is named `sai/commands/{name}/instructions.md`, additional same-command instructions use disambiguated `.instructions.md` names, and no source instruction remains under `sai/instructions/`

#### Scenario: spec instruction is co-located

- **WHEN** the spec invocation loads its phase instruction
- **THEN** it resolves `@sai/commands/spec/instructions.md` and the loaded content is the former `sai/instructions/spec.propose.md` content

#### Scenario: archive preserves both instruction surfaces

- **WHEN** the archive command loads its phase instructions
- **THEN** `sai/instructions/archive.md` is moved to `sai/commands/archive/instructions.md`, `sai/instructions/archive-commit-gate.md` is moved to `sai/commands/archive/archive-commit-gate.instructions.md`, and both are fetched in their existing order

#### Scenario: additional instruction uses a disambiguated neighbor

- **WHEN** a command owns a primary instruction and one or more additional instruction files
- **THEN** the primary file uses `sai/commands/{name}/instructions.md`, each additional file uses a distinct neighboring name ending in `.instructions.md`, and each source instruction has exactly one canonical destination
- **AND** for archive the additional instruction destination is `sai/commands/archive/archive-commit-gate.instructions.md`

### Requirement: command-templates-are-neighbors

Every command-owned template currently under `sai/instructions/_templates/` SHALL move to the owning command directory using the `.template.md` suffix: `implementation-plan.template.md`, `review-report.template.md`, `security-report.template.md`, `performance-report.template.md`, `accessibility-report.template.md`, and `pr-body.template.md`. Each owning instruction SHALL fetch its neighboring template by exact path, and no command-owned template SHALL remain under `sai/instructions/_templates/`.

#### Scenario: implementation template uses neighboring path

- **WHEN** the implementation instruction loads its plan template
- **THEN** it resolves `@sai/commands/implement/implementation-plan.template.md` and produces the same implementation artifact contract as before

#### Scenario: audit templates remain independent

- **WHEN** review, security, performance, accessibility, or PR instructions load a template
- **THEN** each resolves only its own `@sai/commands/{name}/{artifact}.template.md` neighbor and does not substitute another command's template

### Requirement: shared-and-canonical-exceptions-have-root-ownership

The shared `change-overview.md` instruction SHALL move to `sai/change-overview.md`, and the canonical project-agnostic index templates SHALL move to `sai/adr-index.template.md` and `sai/ddr-index.template.md`. These files SHALL not be placed under a command directory or recreated under `sai/instructions/`.

#### Scenario: shared overview instruction remains uniquely addressable

- **WHEN** a maintained caller loads the change-overview generation contract
- **THEN** it resolves `@sai/change-overview.md`, with no active `@sai/instructions/change-overview.md` reference

#### Scenario: index templates remain canonical

- **WHEN** the implementation instruction performs an ADR or DDR cold build
- **THEN** it resolves `@sai/adr-index.template.md` or `@sai/ddr-index.template.md` respectively, and the root templates preserve their project-agnostic skeletons and ADR/DDR parity

### Requirement: folded-fetch-contract-is-atomic

All maintained fetch directives, installer projections, documentation, ADR/spec references, and literal-string tests SHALL be updated in the same change as the file moves. After the migration, no active maintained source, test, or specification SHALL contain a dangling `@sai/instructions/` fetch reference for a moved file. Claude Code and opencode projections SHALL expose equivalent folded content through their existing harness-specific roots.

#### Scenario: no dangling instruction fetch references

- **WHEN** maintained runtime sources and tests are searched after the fold
- **THEN** no active fetch directive points to `@sai/instructions/` for a command instruction or template, and every folded path resolves to an existing source file

#### Scenario: both harness projections stay equivalent

- **WHEN** the manifest-driven installation inventory is expanded for Claude Code and opencode
- **THEN** both harnesses receive the same folded command instruction/template content at their harness-specific `sai/` destinations, with no obsolete `sai/instructions/` projection

### Requirement: generated-artifact-and-content-contracts-are-preserved

The fold SHALL preserve the byte content and effective loading order of moved instructions and templates, generated artifact names and locations, report/index skeleton parity, and phase behavior. The change SHALL not create `design.md`, `tasks.md`, implementation code, configuration changes, or new runtime semantics as a consequence of relocating files.

#### Scenario: moved content remains behaviorally equivalent

- **WHEN** a command loads its co-located instruction and neighboring template after installation
- **THEN** the resulting instruction/template content and generated artifact contract are equivalent to the pre-fold behavior, apart from the intentional path and filename changes

#### Scenario: parity tests use folded locations

- **WHEN** literal-string, report-template, index-template, fetch-resolution, and installation projection tests run after the fold
- **THEN** they validate the folded paths and pass without relying on the removed top-level instruction tree
