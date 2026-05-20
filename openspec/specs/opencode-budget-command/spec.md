## ADDED Requirements

### Requirement: /budget slash command for OpenCode

`opencode/commands/budget.md` SHALL exist and load both opencode budget skills via `Fetch` references. It MUST NOT duplicate binding semantics (model resolution, tool-call caps, output contract) — those remain solely in the referenced SKILL.md files.

File location: `opencode/commands/budget.md`

Required frontmatter:

    ---
    description: Load both OpenCode budget skills (explorer + executor) simultaneously. Use when you want to activate cost-discipline subagent rules for the current session.
    ---

Required body: two `Fetch` directives, one per skill, in this order:

    Fetch @skills/opencode/budget-explorer/SKILL.md
    Fetch @skills/opencode/budget-executor/SKILL.md

No additional prose, instructions, or binding definitions SHALL appear in this file.

#### Scenario: User runs /budget in OpenCode

- **WHEN** the user invokes `/budget`
- **THEN** both `skills/opencode/budget-explorer/SKILL.md` and `skills/opencode/budget-executor/SKILL.md` are fetched and active in the session

#### Scenario: No semantic duplication

- **WHEN** a reader inspects `opencode/commands/budget.md`
- **THEN** no model names, tool-call caps, or output contract rules appear — only Fetch references
