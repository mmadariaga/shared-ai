# sai-1-tool-fence Specification

## Purpose

Fence the `/sai-1-spec` coordinator's tool access on Claude Code, and record that opencode relies on the coordinator prose instead.

## Requirements

### Requirement: sai-1 entrypoint declares the coordinator fence

The Claude Code wrapper `commands/claude/sai-1-spec.md` SHALL declare in its frontmatter the same `allowed-tools` list as the other routed planning coordinators (`commands/claude/sai-2-design.md` and `commands/claude/sai-3-implement.md`): the read and dispatch tools (`Read`, `Glob`, `Skill`, `Agent`, `SendMessage`, `AskUserQuestion`), the todo-panel tools (`TaskCreate`, `TaskUpdate`, `TaskGet`, `TaskList`), scoped `node` grants for the worker-report validator, the no-commit guard, and the stage-machine store at both install roots, and `Bash(git reset:*)` for the no-commit guard's remediation reset. `Edit`, `Write`, and bare unrestricted `Bash` SHALL be absent from the list.

#### Scenario: sai-1 frontmatter carries the shared fence

- **WHEN** the frontmatter of `commands/claude/sai-1-spec.md` is inspected
- **THEN** its `allowed-tools` list is identical to the lists of `commands/claude/sai-2-design.md` and `commands/claude/sai-3-implement.md`

#### Scenario: write-capable tools remain absent

- **WHEN** the `allowed-tools` list of `commands/claude/sai-1-spec.md` is inspected
- **THEN** it does not contain `Edit`, `Write`, or a bare `Bash` entry
- **AND** every shell entry is scoped to a named tool script or to `git reset`

### Requirement: Fence membership governed by per-command-tool-scoping

The full membership of the fenced coordinator set — the routed spec, design, implementation, review, security, performance, and accessibility coordinators — SHALL be governed by the `per-command-tool-scoping` capability. The `sai-1-tool-fence` capability SHALL NOT define a separate membership that could diverge.

#### Scenario: sai-1 belongs to the enumerated set

- **WHEN** the `per-command-tool-scoping` capability's coordinator enumeration is read
- **THEN** it includes the spec coordinator alongside the design, implementation, review, security, performance, and accessibility coordinators

### Requirement: opencode entrypoint carries no tool fence

`commands/opencode/sai-1-spec.md` SHALL declare no tool-restriction field: opencode has no per-command tool-restriction frontmatter field, so the coordinator prohibition in `sai/commands/spec/coordinator.md` is the binding contract for the opencode entrypoint. No opencode equivalent fence SHALL be invented.

#### Scenario: opencode wrapper declares no fence

- **WHEN** the frontmatter of `commands/opencode/sai-1-spec.md` is inspected
- **THEN** it declares no `allowed-tools` field

### Requirement: Coordinator prose prohibition remains the shared contract

The ownership split in `sai/commands/spec/coordinator.md` SHALL remain in place: prerequisites, argument and change resolution, OpenSpec queries, research, and artifact writes belong to the worker, and on the clean route the coordinator does not read or write git, code, configuration, documentation, or change artifacts. The Claude frontmatter fence enforces it on Claude Code; the same prose is the opencode contract.

#### Scenario: coordinator prose carries the ownership split

- **WHEN** `sai/commands/spec/coordinator.md` is inspected
- **THEN** it assigns prerequisites, argument and change resolution, OpenSpec queries, research, and artifact writes to the worker
- **AND** it states that on the clean route the coordinator does not read or write git, code, configuration, documentation, or change artifacts
