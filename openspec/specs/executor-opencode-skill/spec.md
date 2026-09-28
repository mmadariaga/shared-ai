# executor-opencode-skill Specification

## Purpose

Define the OpenCode executor skill file, its agent keyword binding, and its frontmatter and section structure.

## Requirements

### Requirement: Skill file location and naming

The OpenCode executor skill MUST live at `skills/opencode/budget-executor/SKILL.md`. It SHALL follow the same file structure as `skills/opencode/budget-explorer/SKILL.md` (frontmatter + behavior sections).

#### Scenario: File placement

- **WHEN** an agent loads the executor skill in OpenCode
- **THEN** it fetches `skills/opencode/budget-executor/SKILL.md` via `Fetch` or the equivalent skill-load mechanism

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

### Requirement: Raw output bounded by the canonical policy

The executor's raw-output boundary SHALL come from `sai/policies/executor-agent.md`: the report returns verbatim the output the task asked for and the relevant error or compiler messages, and keeps full file contents and unfiltered log streams out. The skill SHALL NOT restate that boundary.

#### Scenario: Build failure output

- **WHEN** the executor captures a build error
- **THEN** it includes the exact error text in its report

#### Scenario: Unrequested file contents

- **WHEN** a requested command touches a file whose contents the task did not ask for
- **THEN** the report summarizes it instead of dumping its contents

### Requirement: Skill frontmatter

The skill file frontmatter MUST include:
- `name`: `budget-executor`
- `description`: concise description of the executor's purpose (bash/test/build execution) followed by its trigger phrases
- `license`: MIT
- `compatibility`: opencode
- `metadata.author`: Mikel Madariaga
- `metadata.version`: "1.0"

#### Scenario: Frontmatter validation

- **WHEN** the skill file is read
- **THEN** all required frontmatter fields are present and correctly set

### Requirement: Canonical executor behavior consumed through Fetch

The OpenCode executor skill SHALL consume the canonical executor behavior policy through exactly one `Fetch @sai/policies/executor-agent.md` directive. It SHALL NOT inline a `## Universal Behavior` section or duplicate the rules supplied by that policy, including the structured failure report and the raw-output boundary. It SHALL retain `## OpenCode Binding`, `## Spawn prompt`, `## Dispatch mode`, `## Model resolution`, and `## Cost model` as skill-local sections, including the lowercase `executor` binding, synchronous dispatch, agent-file model resolution, and no tool-call cap.

#### Scenario: Executor skill uses the canonical behavior boundary

- **WHEN** an agent reads `skills/opencode/budget-executor/SKILL.md`
- **THEN** it finds exactly one `Fetch @sai/policies/executor-agent.md` directive
- **AND** it finds no `## Universal Behavior` section and no copy of the failure-report or raw-output rules
- **AND** it finds the OpenCode-specific binding, caller spawn-prompt, dispatch, model-resolution, cost, and no-cap guidance
