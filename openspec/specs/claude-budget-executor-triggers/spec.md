# claude-budget-executor-triggers Specification

## Purpose

Define the `TRIGGER when:` phrases that auto-load the Claude Code budget-executor skill and the one-sentence summary that precedes them.

## Requirements

### Requirement: Trigger phrases in description frontmatter

The `skills/claude/budget-executor/SKILL.md` frontmatter `description` field SHALL carry a one-sentence summary followed by a `TRIGGER when:` block listing every phrase that auto-loads the skill.

Trigger phrases (exact strings, case-insensitive match is sufficient for harness discovery):
- "budget executor"
- "cheap executor"
- "budget mode"
- "cheap mode"
- "low-cost mode"
- "low cost mode"
- "economy mode"

The `description` field format SHALL be:

    description: >
      Binds "executor subagent" to Claude Code subagent dispatch routed through the budget-executor agent file. Enforces execute-only, minimal-output, structured-failure-report discipline. Claude Code only — NOT compatible with opencode.
      TRIGGER when: "budget executor", "cheap executor", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"

#### Scenario: User asks for budget mode

- **WHEN** the user types a phrase matching any trigger in the description
- **THEN** the harness auto-loads `skills/claude/budget-executor/SKILL.md` and applies its binding rules

#### Scenario: Summary names the dispatch source

- **WHEN** the SKILL.md description is read
- **THEN** it names the budget-executor agent file as the dispatch route and names no subagent type or model
