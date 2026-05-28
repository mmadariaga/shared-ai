## MODIFIED Requirements

### Requirement: The cost discipline section in `spec.propose.md` SHALL defer spawn mechanics to the `budget-explorer` skill and retain only main-agent-specific rules.

Previously contained 8 verbose rules duplicating subagent spawn rules owned by `budget-explorer`. Simplified to 6 concise main-agent rules that reference the skill.

#### Scenario: Main agent performs I/O during proposal work
- **WHEN** the main agent would call a web fetch, read more than 3 files in a row for exploration, or run broad Grep/Glob searches
- **THEN** it SHALL delegate that work to a `budget-explorer` subagent instead

#### Scenario: Audit-class task during proposal work
- **WHEN** the task is classified as audit-class (≥3 concrete categories can be defined)
- **THEN** the main agent SHALL spawn one `budget-explorer` subagent per category in parallel and require complete results

#### Scenario: Subagent spawn mechanics
- **WHEN** the agent needs to know how to spawn a subagent, which model to use, task classification rules, tool-call caps, or output contract format
- **THEN** those rules SHALL be sourced from the `budget-explorer` skill, not from `spec.propose.md`
