## ADDED Requirements

### Requirement: Trigger phrases in description frontmatter

`skills/opencode/budget-explorer/SKILL.md` frontmatter `description` field SHALL be extended with a `TRIGGER when:` block listing all phrases that cause the skill to auto-load. The existing one-sentence summary MUST be preserved verbatim before the trigger block.

Trigger phrases to include (same set as the claude variant for cross-harness consistency):
- "use explorer"
- "use cheap subagent"
- "delegate research"
- "run cheap subagent"
- "spawn explore subagent"
- "cheap research agent"
- "use explore agent"
- "delegate lookup"

The `description` field format SHALL be:

    description: >
      Binds "cheap research subagent" to the opencode explore agent keyword. Model resolved via agent.explore.model in the project's opencode.jsonc — not hardcoded here.
      TRIGGER when: "use explorer", "use cheap subagent", "delegate research", "run cheap subagent", "spawn explore subagent", "cheap research agent", "use explore agent", "delegate lookup".

No other field in the SKILL.md SHALL be modified.

#### Scenario: User says "delegate research" in OpenCode session

- **WHEN** the user types a phrase matching any trigger in the description
- **THEN** the harness auto-loads `skills/opencode/budget-explorer/SKILL.md` and applies its binding rules

#### Scenario: Model resolution unchanged

- **WHEN** the SKILL.md is loaded
- **THEN** model is still resolved from `agent.explore.model` in `opencode.jsonc`, not hardcoded
