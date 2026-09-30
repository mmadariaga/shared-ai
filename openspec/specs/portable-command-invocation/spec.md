# portable-command-invocation Specification

## Purpose
TBD - created by archiving change portable-command-execution. Update Purpose after archive.

## Requirements

### Requirement: Shared command execution selects a supported shell

The shared `sai/policies/command-execution.md` instruction SHALL use the active command-execution tool when it runs Bash or PowerShell 7, regardless of the tool's displayed name. It SHALL NOT require a tool named `Bash`. It SHALL preserve argument boundaries, working directory, operation order, authorization, output, and exit status; pass arguments separately; avoid command-string evaluation; and stop dependent actions when a command fails. Windows PowerShell 5.1 is outside this contract.

#### Scenario: A Bash-capable tool has another displayed name

- **WHEN** the active command-execution tool runs Bash but is not displayed as `Bash`
- **THEN** the mutation route uses that tool and does not fail solely because of its displayed name

#### Scenario: PowerShell 7 executes a command

- **WHEN** the active command-execution tool runs PowerShell 7
- **THEN** the route invokes the executable with separate arguments and preserves the existing operation order and authorization

#### Scenario: No supported command tool is available

- **WHEN** no command-execution tool running Bash or PowerShell 7 is available before a mutation
- **THEN** the consuming route stops through its existing failure path and does not substitute Write or Edit

#### Scenario: A command fails before a dependent action

- **WHEN** a command in a mutation sequence returns a failure
- **THEN** the route reports the failure and does not run dependent actions or simulate success

### Requirement: Literal commit messages use standard input

The shared command-execution instruction SHALL require the complete commit message on standard input rather than in a command string, `git commit -m` argument, or temporary file. Bash transport SHALL use adjacent single-quoted segments and a fixed `printf '%s'` format. PowerShell 7 transport SHALL use single-quoted line literals joined with LF, UTF-8 `ProcessStartInfo` standard input, and separate `ArgumentList` entries. Both transports SHALL preserve shell-sensitive characters and the message's final-LF state. Direct Git commits SHALL use `git commit -F -`; `/sai-merge` SHALL not reuse `/sai-commit`'s `commit.js` validator.

#### Scenario: Bash preserves a literal message

- **WHEN** Bash sends a multiline message containing Unicode, quotes, apostrophes, dollar signs, backticks, and a chosen final-LF state
- **THEN** standard input carries the same message content and final-LF state without shell interpretation

#### Scenario: PowerShell 7 preserves a literal message

- **WHEN** PowerShell 7 sends a multiline message through `ProcessStartInfo` with separate arguments
- **THEN** standard input carries the same UTF-8 message content and final-LF state without pipeline-added line endings

#### Scenario: Merge or Direct Build performs an authorized Git commit

- **WHEN** an authorized merge or Direct Build archive commit is required
- **THEN** the complete message is passed on standard input to `git commit -F -` under the shared policy

### Requirement: Mutation surfaces load the shared command-execution policy

Every affected command-execution mutation surface SHALL load `@sai/policies/command-execution.md` before applying its mutation procedure: `sai/commands/archive/coordinator.md`, `sai/commands/archive/worker.md`, `sai/commands/archive/archive-commit-gate.instructions.md`, `sai/commands/archive/retirement-declaration.md`, `sai/commands/commit/coordinator.md`, `sai/commands/merge/coordinator.md`, `sai/commands/explore/steps/pipeline-direct-build.md`, and `sai/commands/meta-review/direct-build-close.md`. The existing managed `sai-policies` projection SHALL make the policy available to both Claude Code and opencode.

#### Scenario: An affected mutation surface loads the policy

- **WHEN** an affected archive, commit, merge, Explore, or meta-review mutation surface is executed
- **THEN** it loads the shared command-execution policy before its command-execution mutation

#### Scenario: Both harnesses receive the policy

- **WHEN** the managed policy projection is installed
- **THEN** the shared command-execution policy is available under both supported harness projections
