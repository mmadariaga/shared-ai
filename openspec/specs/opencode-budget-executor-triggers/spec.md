## ADDED Requirements

### Requirement: Trigger phrases in description frontmatter

`skills/opencode/budget-executor/SKILL.md` frontmatter `description` field SHALL be extended with a `TRIGGER when:` block listing all phrases that cause the skill to auto-load. The existing one-sentence summary MUST be preserved verbatim before the trigger block.

Trigger phrases to include (same set as the claude variant for cross-harness consistency):
- "use executor"
- "spawn executor"
- "run command subagent"
- "delegate execution"
- "execute in subagent"
- "run cheap executor"

The `description` field format SHALL be:

    description: >
      Binds "executor subagent" to the OpenCode executor agent keyword. Model resolved via agent.executor.model in the project's opencode.jsonc — not hardcoded here. Enforces execute-only, minimal-output, structured-failure-report discipline.
      TRIGGER when: "use executor", "spawn executor", "run command subagent", "delegate execution", "execute in subagent", "run cheap executor".

No other field in the SKILL.md SHALL be modified.

#### Scenario: User says "use executor" in OpenCode session

- **WHEN** the user types a phrase matching any trigger in the description
- **THEN** the harness auto-loads `skills/opencode/budget-executor/SKILL.md` and applies its binding rules

#### Scenario: Model resolution unchanged

- **WHEN** the SKILL.md is loaded
- **THEN** model is still resolved from `agent.executor.model` in `opencode.jsonc`, not hardcoded
