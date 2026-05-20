## ADDED Requirements

### Requirement: Trigger phrases in description frontmatter

`skills/claude/budget-executor/SKILL.md` frontmatter `description` field SHALL be extended with a `TRIGGER when:` block listing all phrases that cause the skill to auto-load. The existing one-sentence summary MUST be preserved verbatim before the trigger block.

Trigger phrases to include:
- "use executor"
- "spawn executor"
- "run command subagent"
- "delegate execution"
- "execute in subagent"
- "run cheap executor"
- "use general subagent"
- "spawn haiku executor"

The `description` field format SHALL be:

    description: >
      Binds "executor subagent" to concrete Claude Code subagent spawn parameters — subagent_type: General, model: haiku, no tool-call cap. Enforces execute-only, minimal-output, structured-failure-report discipline.
      TRIGGER when: "use executor", "spawn executor", "run command subagent", "delegate execution", "execute in subagent", "run cheap executor", "use general subagent", "spawn haiku executor".

No other field in the SKILL.md SHALL be modified.

#### Scenario: User says "spawn executor for this build"

- **WHEN** the user types a phrase matching any trigger in the description
- **THEN** the harness auto-loads `skills/claude/budget-executor/SKILL.md` and applies its binding rules

#### Scenario: Existing behavior preserved

- **WHEN** the SKILL.md is loaded (triggered or not)
- **THEN** execute-only discipline, failure report format, and Claude Code binding (General+haiku) are unchanged
