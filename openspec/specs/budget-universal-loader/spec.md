## MODIFIED Requirements

### Requirement: budget-skill-loads-all-bindings
The `skills/universal/budget/SKILL.md` file SHALL load all active budget subagent bindings. After this change, the load list MUST include `budget-subagent` alongside `budget-explorer`, `budget-executor`, and `token-efficient-languages`.

Updated load list (full replacement of the existing `Load and use the skills below:` block):

    Load and use the skills below:
      Fetch @skills/budget-explorer/SKILL.md
      Fetch @skills/budget-executor/SKILL.md
      Fetch @skills/budget-subagent/SKILL.md
      Fetch @skills/token-efficient-languages/SKILL.md

The `description` field in the YAML frontmatter MUST be updated to reference four skills (explorer + executor + subagent + token-efficient-languages).

#### Scenario: budget skill activates subagent binding
- **WHEN** a user invokes the `budget` skill
- **THEN** `budget-subagent` is loaded in addition to `budget-explorer`, `budget-executor`, and `token-efficient-languages`

#### Scenario: description stays accurate
- **WHEN** the `budget/SKILL.md` description is read (e.g., in the skills list)
- **THEN** it mentions four skills, not three, and includes `budget-subagent`
