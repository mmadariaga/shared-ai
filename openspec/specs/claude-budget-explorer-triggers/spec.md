## ADDED Requirements

### Requirement: Trigger phrases in description frontmatter

`skills/claude/budget-explorer/SKILL.md` frontmatter `description` field SHALL be extended with a `TRIGGER when:` block listing all phrases that cause the skill to auto-load. The existing one-sentence summary MUST be preserved verbatim before the trigger block.

Trigger phrases to include (exact strings, case-insensitive match is sufficient for harness discovery):
- "use explorer"
- "use cheap subagent"
- "delegate research"
- "run cheap subagent"
- "spawn explore subagent"
- "cheap research agent"
- "use explore agent"
- "delegate lookup"
- "spawn haiku subagent"

The `description` field format SHALL be:

    description: >
      Binds "cheap research subagent" to concrete Claude Code subagent spawn parameters — model tiers (haiku/sonnet), task classification (lookup/synthesis/audit), tool-call caps, and output contract rules.
      TRIGGER when: "use explorer", "use cheap subagent", "delegate research", "run cheap subagent", "spawn explore subagent", "cheap research agent", "use explore agent", "delegate lookup", "spawn haiku subagent".

No other field in the SKILL.md SHALL be modified.

#### Scenario: User says "delegate research to cheap subagent"

- **WHEN** the user types a phrase matching any trigger in the description
- **THEN** the harness auto-loads `skills/claude/budget-explorer/SKILL.md` and applies its binding rules

#### Scenario: Existing behavior preserved

- **WHEN** the SKILL.md is loaded (triggered or not)
- **THEN** model tier rules, task classification, tool-call caps, and output contract are unchanged
