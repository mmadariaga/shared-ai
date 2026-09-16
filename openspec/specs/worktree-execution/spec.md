# worktree-execution Specification

## Purpose
Define the node-scoped `worktree.js` execution surface the `sai-worktree` wrapper permits in both roots alongside its scoped `Bash(git:*)` grant, and the closed scope of that surface.

## Requirements

### Requirement: Worktree decider tool execution

The worktree wrapper SHALL permit node-scoped worktree.js execution in both roots with --json --cwd subcommands, SHALL retain the existing scoped Bash(git:*) grant, and SHALL present the decider result or refusal verbatim.

#### Scenario: worktree runs its decider

- **WHEN** the worktree flow resolves to inventory, create, index, remove, or delete-branch
- **THEN** the wrapper runs worktree.js with --json --cwd and presents the returned result verbatim

### Requirement: Worktree scope stays closed

The worktree wrapper SHALL permit no other node invocation beyond worktree.js in both roots.

#### Scenario: closed worktree scope

- **WHEN** the worktree wrapper declares allowed-tools
- **THEN** it carries Read, Glob, Grep, Bash(git:*), both worktree.js node grants, AskUserQuestion, and Skill with no free Bash grant
