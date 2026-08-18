# budget-explorer-skill-access Specification

## Purpose

TBD - created by syncing change include-fetch-skill-in-budget-agents.

## Requirements

### Requirement: Claude Code budget-explorer can execute fetch bootstrap

The Claude Code `budget-explorer` managed agent MUST declare the `Skill` tool in its tool list so it can execute its fetch-skill bootstrap directive.

#### Scenario: Budget explorer loads fetch rules
- **WHEN** the Claude Code `budget-explorer` agent starts and processes its first body directive
- **THEN** the declared tool set includes `Skill` and the agent can load the fetch skill before its explorer policy
