# spec-propose-cost-discipline Specification

## Purpose

Keep the spec phase's cost discipline on its own step files while deferring subagent spawn mechanics to the budget skill.

## Requirements

### Requirement: The spec phase SHALL defer spawn mechanics to the budget skill and keep only main-agent rules.

`sai/commands/spec/steps/common.md` SHALL fetch `@skills/budget-ro/SKILL.md` (the read-only budget skill: explorer binding plus language contract) and carry the full main-agent delegation rules once, in force for every step. Spawn mechanics, the tool-call ceiling, and the output contract format SHALL be sourced from the budget skill's explorer binding, not restated on the spec step files.

#### Scenario: Main agent performs I/O during proposal work
- **WHEN** the main agent would call a web fetch or run broad Grep/Glob searches during the spec phase
- **THEN** it SHALL delegate that work to a `budget-explorer` subagent instead, except a single known-file read or a targeted search for a known symbol

#### Scenario: Audit-class task during proposal work
- **WHEN** the task is audit-class (≥3 concrete categories can be defined)
- **THEN** the main agent SHALL spawn one `budget-explorer` subagent per category in parallel and require complete results

#### Scenario: Subagent spawn mechanics
- **WHEN** the agent needs to know how to spawn a subagent, the tool-call ceiling, or the output contract format
- **THEN** those rules SHALL be sourced from the budget skill fetched through `budget-ro`, not from the spec step files
