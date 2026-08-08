# sai-1-tool-fence Specification

## Purpose

TBD — purpose to be documented.

## Requirements

### Requirement: sai-1 entrypoint declares the coordinator fence

The Claude Code wrapper `commands/claude/sai-1-spec.md` SHALL declare `allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion` in its frontmatter, exactly matching the shared coordinator fence governed by the `per-command-tool-scoping` capability. `Edit`, `Write`, and bare unrestricted `Bash` SHALL remain absent from the list.

#### Scenario: sai-1 frontmatter carries the fence

- **WHEN** the frontmatter of `commands/claude/sai-1-spec.md` is inspected after the change
- **THEN** it declares `allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion`
- **AND** the list is exactly the shared coordinator fence — no additional tools, no missing tools

#### Scenario: write-capable tools remain absent

- **WHEN** the `allowed-tools` list of `commands/claude/sai-1-spec.md` is inspected
- **THEN** it does not contain `Edit`, `Write`, or a bare `Bash` entry
- **AND** no scoped shell permission is introduced

### Requirement: Fence membership governed by per-command-tool-scoping

The full membership of the fenced coordinator set — the routed spec, design, implementation, review, security, performance, and accessibility coordinators — and their exact `allowed-tools` list SHALL be governed by the `per-command-tool-scoping` capability, which this change modifies to admit the spec coordinator. The sai-1 fence SHALL match the shared list exactly; the fences of the existing six coordinators (`commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md`, `commands/claude/sai-5-review.md`, `commands/claude/sai-6-security.md`, `commands/claude/sai-7-performance.md`, `commands/claude/sai-8-accessibility.md`) SHALL NOT be altered by this change.

#### Scenario: existing coordinator fences unchanged

- **WHEN** the frontmatter of any of the six previously fenced coordinators is inspected after the change
- **THEN** it still declares `allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion`
- **AND** its pre-change content is unchanged

#### Scenario: sai-1 joins the enumerated set

- **WHEN** the `per-command-tool-scoping` capability's coordinator enumeration is read after the change
- **THEN** it includes the spec coordinator alongside the design, implementation, review, security, performance, and accessibility coordinators
- **AND** the `sai-1-tool-fence` capability does not define a separate membership that could diverge

### Requirement: Recorded opencode exemption

`commands/opencode/sai-1-spec.md` SHALL remain unchanged: opencode has no per-command tool-restriction frontmatter field, so the coordinator prohibition in `sai/commands/spec/coordinator.md` remains the binding contract for the opencode entrypoint, and this exemption SHALL be recorded in the change's artifacts. No opencode equivalent fence SHALL be invented.

#### Scenario: opencode wrapper untouched

- **WHEN** the frontmatter of `commands/opencode/sai-1-spec.md` is inspected after the change
- **THEN** it is unchanged from its pre-change content and declares no `allowed-tools` field

#### Scenario: exemption recorded in the change

- **WHEN** the change's proposal and this capability spec are read
- **THEN** each records that opencode carries no tool-fence equivalent and that the coordinator prose is the opencode contract

### Requirement: Coordinator prose prohibition remains the shared contract

The prose prohibition in `sai/commands/spec/coordinator.md` — that the coordinator does not run prerequisites, resolve arguments, query OpenSpec, read git/code/configuration/documentation/artifacts, or write files — SHALL remain in place and unchanged. The Claude frontmatter fence enforces it on Claude Code; the same prose remains the opencode contract per the recorded exemption.

#### Scenario: coordinator prose unchanged

- **WHEN** `sai/commands/spec/coordinator.md` is inspected after the change
- **THEN** its prohibition language is unchanged
- **AND** no other `sai-*` command's coordinator prose is altered by this change
