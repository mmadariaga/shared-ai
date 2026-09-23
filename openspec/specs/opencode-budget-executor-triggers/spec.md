# opencode-budget-executor-triggers Specification

## Purpose

Define the TRIGGER when phrases that auto-load the opencode budget-executor skill and the agent-file source of its model resolution.

## Requirements

### Requirement: Trigger phrases in description frontmatter

`skills/opencode/budget-executor/SKILL.md` frontmatter `description` field SHALL carry a one-sentence summary followed by a `TRIGGER when:` block listing every phrase that auto-loads the skill.

Trigger phrases (the same set as the Claude Code variant, following the budget-family pattern of the skill name plus the shared mode phrases):
- "budget executor"
- "cheap executor"
- "budget mode"
- "cheap mode"
- "low-cost mode"
- "low cost mode"
- "economy mode"

The `description` field format SHALL be:

    description: >
      Binds "executor subagent" to the OpenCode executor agent keyword. Model resolved via the executor agent file's model frontmatter (installed under ~/.config/opencode/agents/executor.md) — not hardcoded in here. Enforces execute-only, minimal-output, structured-failure-report discipline.
      TRIGGER when: "budget executor", "cheap executor", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"

#### Scenario: User asks for budget mode in an OpenCode session

- **WHEN** the user types a phrase matching any trigger in the description
- **THEN** the harness auto-loads `skills/opencode/budget-executor/SKILL.md` and applies its binding rules

#### Scenario: Model resolution names the executor agent file

- **WHEN** the SKILL.md is loaded
- **THEN** the model is resolved from the `model` frontmatter of `~/.config/opencode/agents/executor.md`, not hardcoded and not via `agent.executor.model` in `opencode.jsonc`
