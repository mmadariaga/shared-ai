# claude-routed-coordinator-panel-scope Specification

## Purpose
TBD: Define the tool boundaries required by Claude routed coordinators and their panel rendering.

## Requirements

### Requirement: Routed Claude coordinator allowlists include panel tools

The Claude Code wrappers for routed spec, design, implementation, review, security, performance, and accessibility coordinators SHALL declare exactly `Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList`. The routed scope SHALL continue to exclude `Edit`, `Write`, `Grep`, and `Bash`.

#### Scenario: Routed wrappers can perform the required panel render

- **WHEN** a routed Claude wrapper's `allowed-tools` frontmatter is inspected
- **THEN** it contains all four panel task tools and excludes the listed project-I/O tools.

### Requirement: Apply declares its execution allowlist explicitly

The Claude Code `sai-4-apply` wrapper SHALL declare `Read, Glob, Grep, Edit, Write, Bash, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList` explicitly instead of relying on omitted `allowed-tools` frontmatter.

#### Scenario: Apply's panel and execution capabilities are auditable

- **WHEN** the Claude apply wrapper is loaded
- **THEN** its explicit allowlist includes its existing execution capabilities and all four panel task tools without adding the `Task` worker-dispatch primitive.
