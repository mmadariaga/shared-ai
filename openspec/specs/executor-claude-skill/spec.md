# executor-claude-skill Specification

## Purpose

Define the Claude Code executor skill file, its subagent binding, and its frontmatter and section structure.

## Requirements

### Requirement: Skill file location and naming

The Claude Code executor skill MUST live at `skills/claude/budget-executor/SKILL.md`. It SHALL follow the same file structure as `skills/claude/budget-explorer/SKILL.md` (frontmatter + behavior sections).

#### Scenario: File placement

- **WHEN** an agent loads the executor skill in Claude Code
- **THEN** it loads `skills/claude/budget-executor/SKILL.md` through the Skill tool

### Requirement: Subagent binding

The skill SHALL bind the "executor subagent" concept to `Agent(subagent_type: budget-executor, run_in_background: true, prompt: <prompt>)`. The model SHALL come from the `model` frontmatter of the resolved `budget-executor.md` agent file, the project-local `.claude/agents/budget-executor.md` taking precedence over `~/.claude/agents/budget-executor.md`; spawns SHALL pass no per-spawn model parameter.

#### Scenario: Spawn parameters

- **WHEN** a main agent spawns an executor subagent per this skill
- **THEN** the Agent call uses `subagent_type: budget-executor` and `run_in_background: true`, with no `model` parameter

### Requirement: No tool-call cap

The executor skill SHALL NOT impose a tool-call cap.

#### Scenario: Long build command

- **WHEN** an executor subagent runs a command that produces multiple sequential tool calls
- **THEN** it is not stopped by a cap; it completes the task

### Requirement: Skill frontmatter

The skill file frontmatter MUST include:
- `name`: `budget-executor`
- `description`: concise description of the executor's purpose followed by its trigger phrases
- `license`: MIT
- `compatibility`: claude
- `metadata.author`: Mikel Madariaga
- `metadata.version`: "1.0"

#### Scenario: Frontmatter validation

- **WHEN** the skill file is read
- **THEN** all required frontmatter fields are present and correctly set

### Requirement: Canonical executor behavior consumed through Fetch

The skill SHALL consume the canonical executor behavior through exactly one `Fetch @sai/policies/executor-agent.md` directive and SHALL NOT duplicate its rules, including the structured failure report and the raw-output boundary. It SHALL retain `## Subagent binding`, `## Model resolution`, `## Dispatch mode`, `## Spawn prompt`, and `## Execution contract` as skill-local sections. `## Spawn prompt` tells the caller to give the exact commands in order and the output it needs back, or a goal the executor turns into the narrowest command.

#### Scenario: Section structure

- **WHEN** an agent reads `skills/claude/budget-executor/SKILL.md`
- **THEN** it finds exactly one `Fetch @sai/policies/executor-agent.md` directive and the five skill-local sections

### Requirement: Dispatcher recovers a report without a final result

The Claude Code `budget-executor` skill SHALL carry, under `## Spawn prompt`, exactly one dispatcher line stating that an executor report without a final result for a requested command (`pending`, `running`, or no entry) is an obstacle under `sai/policies/obstacle-escalation.md`, resolved by reading the result from the evidence the report names, such as its output log, or by dispatching again, and that the dispatcher SHALL NOT wait for a later message from that executor. The line SHALL be word-for-word identical to the one in the opencode `budget-executor` skill, and the skill SHALL NOT tell the executor to resend an already-delivered result.

#### Scenario: Report with a pending entry

- **WHEN** a dispatcher receives an executor report whose entry for a requested command reads `pending`
- **THEN** it treats the report as an obstacle and reads the result from the output log the report names or dispatches again, instead of waiting for another message from that executor

#### Scenario: Same line on both harnesses

- **WHEN** the `## Spawn prompt` sections of `skills/claude/budget-executor/SKILL.md` and `skills/opencode/budget-executor/SKILL.md` are compared
- **THEN** each carries exactly one line naming `sai/policies/obstacle-escalation.md`, and the two lines are identical
