## ADDED Requirements

### Requirement: /budget slash command for OpenCode

`commands/opencode/budget.md` SHALL exist and load the universal `budget` aggregator skill via a single `Fetch` reference. It MUST NOT duplicate binding semantics (model resolution, tool-call caps, output contract) — those remain solely in the referenced SKILL.md files.

File location: `commands/opencode/budget.md`

Required frontmatter:

    ---
    description: Load all three OpenCode budget skills (explorer + executor + token-efficient-languages) simultaneously. Use when you want to activate cost-discipline rules for the current session.
    ---

Required body: one `Fetch` directive:

    Fetch @skills/budget/SKILL.md

No additional prose, instructions, or binding definitions SHALL appear in this file.

#### Scenario: User runs /budget in OpenCode

- **WHEN** the user invokes `/budget`
- **THEN** the `skills/budget/SKILL.md` aggregator is fetched, which in turn loads budget-explorer, budget-executor, and token-efficient-languages into the session

#### Scenario: No semantic duplication

- **WHEN** a reader inspects `commands/opencode/budget.md`
- **THEN** no model names, tool-call caps, or output contract rules appear — only Fetch references
