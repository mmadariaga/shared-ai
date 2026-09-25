# budget-universal-loader Specification

## Purpose

Bundle the three budget subagent bindings into one skill that cards fetch before delegating cheap work and that a session-wide cost-discipline mode triggers.

## Requirements
### Requirement: budget-skill-loads-all-bindings
The `skills/universal/budget/SKILL.md` file SHALL load exactly the three budget subagent bindings, in this order:

    Fetch @skills/budget-explorer/SKILL.md
    Fetch @skills/budget-executor/SKILL.md
    Fetch @skills/budget-subagent/SKILL.md

It SHALL NOT load `token-efficient-languages`: on SAI surfaces every card that fetches the bundle also fetches `sai/policies/remember.md`, whose Language section carries the same contract, and outside SAI `token-efficient-languages` triggers on the same cost-mode phrases by itself. The frontmatter SHALL declare `compatibility: opencode, claude`, and the `description` SHALL name the three bindings.

#### Scenario: budget skill activates all subagent bindings
- **WHEN** a card fetches or a user triggers the `budget` skill
- **THEN** `budget-explorer`, `budget-executor`, and `budget-subagent` are loaded

#### Scenario: language contract is not loaded twice
- **WHEN** a SAI card fetches both `@skills/budget/SKILL.md` and `@sai/policies/remember.md`
- **THEN** the language contract reaches the session once, from `remember.md`

#### Scenario: description stays accurate
- **WHEN** the `budget/SKILL.md` description is read (e.g., in the skills list)
- **THEN** it names the three bindings and no language skill
