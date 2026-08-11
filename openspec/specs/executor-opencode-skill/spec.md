# executor-opencode-skill Specification

## Purpose

Define the OpenCode executor skill file, its agent keyword binding, and its frontmatter and section structure.

## Requirements

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

The OpenCode executor skill SHALL consume the canonical executor behavior policy through exactly one `Fetch @sai/policies/executor-agent.md` directive. It SHALL NOT inline a `## Universal Behavior` section or duplicate the rules supplied by that policy. It SHALL retain `## OpenCode Binding`, `## Dispatch mode`, `## Model resolution`, and `## Cost model` as skill-local sections, including the lowercase `executor` binding, synchronous dispatch, agent-file model resolution, no tool-call cap, structured failure-report guidance, and the requested-command/error raw-output boundary. The local raw-output guidance SHALL prohibit unrequested full-file dumps and unfiltered log streams.

#### Scenario: Executor skill uses the canonical behavior boundary

- **WHEN** an agent reads `skills/opencode/budget-executor/SKILL.md`
- **THEN** it finds exactly one `Fetch @sai/policies/executor-agent.md` directive
- **AND** it finds no `## Universal Behavior` section
- **AND** it finds the OpenCode-specific binding, dispatch, model-resolution, cost, no-cap, structured-failure, and constrained raw-output guidance
