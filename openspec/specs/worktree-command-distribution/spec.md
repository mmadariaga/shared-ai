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

### Requirement: Shared slimmed body and instruction

The shared command body lives at `sai/commands/worktree/body.md` — opening directly with a `<TASK>` block (no Isolation Mode block; clean-session enforcement belongs to the harness boot adapters' preamble) that loads safe-operations as its sole behaviour and the phase instruction plus `sai/policies/remember.md` as instructions — alongside the instruction body at `sai/commands/worktree/instructions.md`. The body carries no budget fetch because the worktree flow dispatches no subagents.

#### Scenario: Body starts with the TASK block

- **WHEN** `sai/commands/worktree/body.md` is read after the change
- **THEN** it begins with the `<TASK>` block and contains no `# Isolation Mode` heading or bullets

#### Scenario: Body loads the safety layer only

- **WHEN** the shared body's `<TASK>` block is read
- **THEN** it loads `@skills/safe-operations/SKILL.md` as its only behaviour and the worktree instruction plus `@sai/policies/remember.md` as instructions, with no `@skills/budget/SKILL.md` fetch

### Requirement: Registry table registration

The Command Registry table in `skills/universal/sai-commands/SKILL.md` SHALL gain one row for `/sai-worktree` naming the command file and its description.

#### Scenario: Registry contains the new row
- **WHEN** the Command Registry table in `skills/universal/sai-commands/SKILL.md` is read
- **THEN** it contains a `/sai-worktree` row with the command file reference and a description, and the existing rows are unchanged

### Requirement: Existing glob projections install the new files

The existing `claude-commands`, `opencode-commands`, `sai-commands`, and `sai-instructions` glob projections SHALL install the new files unchanged.

#### Scenario: Installer projects the new files
- **WHEN** the installer runs against the projections for both harnesses
- **THEN** `commands/claude/sai-worktree.md`, `commands/opencode/sai-worktree.md`, `sai/commands/worktree/body.md`, and `sai/commands/worktree/instructions.md` are all installed without any manifest edit

### Requirement: OpenSpec prerequisites omitted and the omission documented

The `/sai-worktree` command SHALL NOT perform the OpenSpec prerequisite checks (the `openspec` binary in PATH, the `openspec/` directory, and `schema: sai-workflow` in `openspec/config.yaml`), because it neither reads nor writes `openspec/`, and the omission SHALL be documented in `AGENTS.md` so it is not later re-added.

#### Scenario: Runs in a project without openspec
- **WHEN** the command is invoked in a repository with no `openspec/` directory
- **THEN** it functions normally, listing and managing worktrees, without halting on missing prerequisites

#### Scenario: The exception is documented
- **WHEN** `AGENTS.md` is read
- **THEN** it names `/sai-worktree` alongside `sai-commit` as a command that works without the OpenSpec prerequisites, and its safe-operations wrapper count includes the new wrapper
