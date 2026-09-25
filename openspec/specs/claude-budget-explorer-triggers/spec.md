# claude-budget-explorer-triggers Specification

## Purpose

Define the `TRIGGER when:` phrases that auto-load the Claude Code budget-explorer skill and the one-sentence summary that precedes them.

## Requirements

### Requirement: Trigger phrases in description frontmatter

The `skills/claude/budget-explorer/SKILL.md` frontmatter `description` field SHALL carry a one-sentence summary followed by a `TRIGGER when:` block listing every phrase that auto-loads the skill.

Trigger phrases (exact strings, case-insensitive match is sufficient for harness discovery):
- "budget explorer"
- "cheap explorer"
- "budget mode"
- "cheap mode"
- "low-cost mode"
- "low cost mode"
- "economy mode"

The `description` field format SHALL be:

    description: >
      Binds "cheap research subagent" to Claude Code subagent dispatch routed through the budget-explorer agent file. Read-only research and lookup with a 40 tool calls ceiling and output-contract discipline; multi-step synthesis stays with the main agent.
      TRIGGER when: "budget explorer", "cheap explorer", "budget mode", "cheap mode", "low-cost mode", "low cost mode", "economy mode"

#### Scenario: User asks for budget mode

- **WHEN** the user types a phrase matching any trigger in the description
- **THEN** the harness auto-loads `skills/claude/budget-explorer/SKILL.md` and applies its binding rules

#### Scenario: Summary names the dispatch source and the ceiling

- **WHEN** the SKILL.md description is read
- **THEN** it names the budget-explorer agent file as the dispatch route and the 40-call ceiling, and names no model tier or task classification
