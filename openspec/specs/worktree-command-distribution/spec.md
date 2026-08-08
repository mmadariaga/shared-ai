# worktree-command-distribution Specification

## Purpose

TBD: distribution of the `/sai-worktree` command across harness wrappers, shared body, registry, and installer.

## Requirements

### Requirement: Both harness wrappers ship together

The change SHALL add `commands/claude/sai-worktree.md` and `commands/opencode/sai-worktree.md` together, so neither harness is left without the command. The claude wrapper SHALL include `Fetch @skills/fetch/SKILL.md` as the first line of its command body, before any `Fetch @sai/...` directive; the opencode wrapper SHALL include the distinct opencode fetch path and the `$ARGUMENTS` placement used by opencode wrappers.

#### Scenario: Claude wrapper is thin and fetch-first
- **WHEN** `commands/claude/sai-worktree.md` is read
- **THEN** its frontmatter mirrors the existing wrapper shape and its first body line is `Fetch @skills/fetch/SKILL.md`, followed by the fetch of the shared body file

#### Scenario: opencode wrapper mirrors its harness path
- **WHEN** `commands/opencode/sai-worktree.md` is read
- **THEN** it fetches the shared body via the opencode fetch path and places `$ARGUMENTS` in the opencode wrapper position

### Requirement: Shared Isolation-Mode body and instruction

The change SHALL add the shared command body at `sai/commands/sai-worktree.md` — an Isolation Mode block followed by a `<TASK>` block that loads budget and safe-operations as behaviors and the phase instruction plus `sai/policies/remember.md` as instructions — and the instruction body at `sai/instructions/worktree.md`.

#### Scenario: Body starts with the Isolation Mode block
- **WHEN** `sai/commands/sai-worktree.md` is read
- **THEN** it begins with the Isolation Mode block listing the three rules and the context-pollution stop line, exactly as the other command bodies do

#### Scenario: Body loads the safety layers
- **WHEN** the shared body's `<TASK>` block is read
- **THEN** it loads `@skills/budget/SKILL.md` and `@skills/safe-operations/SKILL.md` as behaviors and the worktree instruction plus `@sai/policies/remember.md` as instructions

### Requirement: Registry table registration

The Command Registry table in `skills/universal/sai-commands/SKILL.md` SHALL gain one row for `/sai-worktree` naming the command file and its description.

#### Scenario: Registry contains the new row
- **WHEN** the Command Registry table in `skills/universal/sai-commands/SKILL.md` is read
- **THEN** it contains a `/sai-worktree` row with the command file reference and a description, and the existing rows are unchanged

### Requirement: Existing glob projections install the new files

The existing `claude-commands`, `opencode-commands`, `sai-commands`, and `sai-instructions` glob projections SHALL install the new files unchanged.

#### Scenario: Installer projects the new files
- **WHEN** the installer runs against the projections for both harnesses
- **THEN** `commands/claude/sai-worktree.md`, `commands/opencode/sai-worktree.md`, `sai/commands/sai-worktree.md`, and `sai/instructions/worktree.md` are all installed without any manifest edit

### Requirement: OpenSpec prerequisites omitted and the omission documented

The `/sai-worktree` command SHALL NOT perform the OpenSpec prerequisite checks (the `openspec` binary in PATH, the `openspec/` directory, and `schema: sai-workflow` in `openspec/config.yaml`), because it neither reads nor writes `openspec/`, and the omission SHALL be documented in `AGENTS.md` so it is not later re-added.

#### Scenario: Runs in a project without openspec
- **WHEN** the command is invoked in a repository with no `openspec/` directory
- **THEN** it functions normally, listing and managing worktrees, without halting on missing prerequisites

#### Scenario: The exception is documented
- **WHEN** `AGENTS.md` is read
- **THEN** it names `/sai-worktree` alongside `sai-commit` as a command that works without the OpenSpec prerequisites, and its safe-operations wrapper count includes the new wrapper
