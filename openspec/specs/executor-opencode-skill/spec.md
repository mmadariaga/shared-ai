## ADDED Requirements

### Requirement: Skill file location and naming

The OpenCode executor skill MUST be created at `skills/opencode/executor/SKILL.md`. It SHALL follow the same file structure as `skills/opencode/budget-explorer/SKILL.md` (frontmatter + behavior sections).

#### Scenario: File placement

- **WHEN** an agent loads the executor skill in OpenCode
- **THEN** it fetches `skills/opencode/executor/SKILL.md` via `Fetch` or the equivalent skill-load mechanism

### Requirement: Agent keyword binding

The skill SHALL bind the "executor subagent" concept to the OpenCode agent keyword `executor` (lowercase). Agents MUST use this keyword to spawn executor subagents in the OpenCode harness.

#### Scenario: Spawn keyword

- **WHEN** a main agent in OpenCode spawns an executor subagent per this skill
- **THEN** it uses the `executor` agent keyword

### Requirement: opencode.jsonc agent entry

An `agent.executor` entry MUST be added to `opencode/opencode.jsonc`. The entry SHALL include:
- `mode`: `"subagent"`
- `model`: a cheap model identifier (same tier as `agent.explore.model` — the project's low-cost model)

#### Scenario: Configuration registration

- **WHEN** `opencode/opencode.jsonc` is read
- **THEN** it contains an `agent.executor` block with `mode` and `model` fields

### Requirement: No tool-call cap

The skill SHALL NOT impose a tool-call cap. The cheap model tier provides sufficient cost control.

#### Scenario: Multi-step execution

- **WHEN** an executor subagent runs several commands in sequence
- **THEN** it is not interrupted by a cap

### Requirement: Raw output allowed

The executor skill SHALL allow raw command output in responses. No "no raw file contents" restriction applies.

#### Scenario: Build failure output

- **WHEN** the executor captures a build error
- **THEN** it may include the exact error text in its response

### Requirement: Skill frontmatter

The skill file frontmatter MUST include:
- `name`: `opencode-executor`
- `description`: concise description of the executor's purpose (bash/test/build execution)
- `license`: MIT
- `metadata.author`: shared-ai
- `metadata.version`: "1.0"

#### Scenario: Frontmatter validation

- **WHEN** the skill file is read
- **THEN** all required frontmatter fields are present and correctly set

### Requirement: Universal Behavior section inlined

The skill file SHALL contain a `## Universal Behavior` section with all rules from the `executor-universal-behavior` capability, followed by an `## OpenCode Binding` section with harness-specific parameters.

#### Scenario: Section structure

- **WHEN** an agent reads `skills/opencode/executor/SKILL.md`
- **THEN** it finds both `## Universal Behavior` and `## OpenCode Binding` sections
