# install-instructions-recursive Specification

## Purpose

The installer recursively projects the command-local instruction and template tree under `sai/commands/`, preserving subdirectory structure, and installs the three root exceptions (`sai/change-overview.md`, `sai/adr-index.template.md`, `sai/ddr-index.template.md`) at the `sai` destination root. This capability is the folded successor of the retired recursive `sai/instructions/` copy and the retired GitHub Copilot installation path.

## Requirements

### Requirement: The installer SHALL copy sai/commands recursively, preserving subdirectory structure

The manifest-driven installer (`bin/install-flow.js`) SHALL project `sai/commands/` recursively so that every nested file under `sai/commands/` — command cards (`coordinator.md`, `worker.md`, `invocation.md`, `body.md`), command-local `instructions.md`, and co-located `.template.md` / `.instructions.md` files — lands at the same relative path under the target `sai/commands/` directory, for both supported harnesses. The three root exceptions `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md` SHALL install through their own `sai` root-class projections. No maintained `sai/instructions/` tree is copied.

#### Scenario: Recursively projected command tree preserves structure

- **WHEN** the manifest is expanded for either harness
- **THEN** `sai/commands/{name}/instructions.md` and `sai/commands/{phase}/{artifact}-report.template.md` land at the same relative paths under the target `sai/commands/` directory
- **AND** no active projection sources from or lands at a `sai/instructions/` or `instructions/` path

#### Scenario: Root exceptions project beside the command tree

- **WHEN** the manifest is expanded for either harness
- **THEN** `change-overview.md`, `adr-index.template.md`, and `ddr-index.template.md` land at the `sai` destination root

### Requirement: Manual install documentation SHALL use recursive command-tree copy commands

`INSTALL.claude.md` and `INSTALL.opencode.md` bash and PowerShell snippets MUST copy `sai/commands/` recursively (`cp -r sai/commands/. ...` / `Copy-Item sai\commands\* ... -Recurse -Force`) and MUST copy the three root exception files, instead of copying a maintained `sai/instructions/` tree.

#### Scenario: Manual install followed

- **WHEN** a user follows either the bash or PowerShell steps in INSTALL.claude.md or INSTALL.opencode.md
- **THEN** the recursively copied command tree lands at the target `sai/commands/` directory and the three root exception files land at the target `sai/` root

