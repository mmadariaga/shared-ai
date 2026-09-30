# budget-universal-loader Specification

## Purpose

Bundle the three budget subagent bindings into one skill that cards fetch before delegating cheap work and that a session-wide cost-discipline mode triggers.

## Requirements

### Requirement: budget-skill-loads-all-bindings
The `skills/universal/budget/SKILL.md` file SHALL load exactly the three budget subagent bindings, in this order:

    Fetch @skills/budget-explorer/SKILL.md
    Fetch @skills/budget-executor/SKILL.md
    Fetch @skills/budget-subagent/SKILL.md

It SHALL NOT load `token-efficient-languages`: on SAI surfaces every card that fetches the bundle also fetches `sai/policies/remember.md`, whose Language section fetches `token-efficient-languages`, and outside SAI `token-efficient-languages` triggers on the same cost-mode phrases by itself. The frontmatter SHALL declare `compatibility: opencode, claude`, and the `description` SHALL name the three bindings.

#### Scenario: budget skill activates all subagent bindings
- **WHEN** a card fetches or a user triggers the `budget` skill
- **THEN** `budget-explorer`, `budget-executor`, and `budget-subagent` are loaded

#### Scenario: language contract is not loaded twice
- **WHEN** a SAI card fetches both `@skills/budget/SKILL.md` and `@sai/policies/remember.md`
- **THEN** the language contract reaches the session once, from the `token-efficient-languages` fetch in `remember.md`

#### Scenario: description stays accurate
- **WHEN** the `budget/SKILL.md` description is read (e.g., in the skills list)
- **THEN** it names the three bindings and no language skill

### Requirement: budget-ro-skill-loads-explorer-and-language
The `skills/universal/budget-ro/SKILL.md` file SHALL exist once for both harnesses, with `name: budget-ro` and `compatibility: opencode, claude`, and SHALL load exactly these two bindings, in this order:

    Fetch @skills/budget-explorer/SKILL.md
    Fetch @skills/token-efficient-languages/SKILL.md

It SHALL NOT load `budget-executor` or `budget-subagent`. Its `description` SHALL state that it loads the explorer binding and the language contract for read-only delegation, and its `TRIGGER when:` phrases SHALL be `budget read-only`, `budget ro`, and `read-only budget mode`, none of the session-wide cost-mode phrases of the `budget` skill.

The `steps/common.md` of `spec`, `review`, `security`, `performance`, and `accessibility` SHALL fetch `@skills/budget-ro/SKILL.md` and SHALL NOT fetch `@skills/budget/SKILL.md`. The `steps/common.md` of `design` and `implement` SHALL keep fetching `@skills/budget/SKILL.md`.

#### Scenario: budget-ro loads only the read-only bindings
- **WHEN** a card fetches or a user triggers the `budget-ro` skill
- **THEN** `budget-explorer` and `token-efficient-languages` are loaded and neither `budget-executor` nor `budget-subagent` is

#### Scenario: read-only phases fetch budget-ro
- **WHEN** the `steps/common.md` of spec, review, security, performance, or accessibility is read
- **THEN** it fetches `@skills/budget-ro/SKILL.md` and contains no `@skills/budget/SKILL.md` fetch

#### Scenario: phases that delegate writes keep the full budget skill
- **WHEN** the `steps/common.md` of design or implement is read
- **THEN** it fetches `@skills/budget/SKILL.md`

#### Scenario: budget-ro triggers do not collide with budget
- **WHEN** the `budget-ro/SKILL.md` description is read
- **THEN** its trigger phrases are disjoint from the `budget` skill's cost-mode phrases
