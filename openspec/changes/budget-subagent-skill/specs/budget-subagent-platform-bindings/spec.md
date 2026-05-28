## ADDED Requirements

### Requirement: claude-code-binding
The `skills/claude/budget-subagent/SKILL.md` file SHALL bind the "task subagent" concept to Claude Code's Agent tool with the following fixed parameters:

    subagent_type: "General"   // required for full tool access (read, write, search, bash)
    model: "haiku"             // MUST be set explicitly on every spawn
    tool-call cap: none enforced by harness (skill behavioral rules govern this)

The compatibility field in the YAML frontmatter MUST be `claude`. The description MUST include the trigger phrases: `"budget subagent"`, `"cheap subagent"`, `"budget task"`, `"cheap task"`.

#### Scenario: model is never omitted
- **WHEN** a caller spawns a budget-subagent using the Claude Code Agent tool
- **THEN** the `model: "haiku"` parameter is always present in the call, preventing fallback to the parent model tier

#### Scenario: general subagent type used
- **WHEN** the task requires writing a file or running a shell command
- **THEN** `subagent_type: "General"` is used (not `Explore`, which is read-only)

---

### Requirement: opencode-binding
The `skills/opencode/budget-subagent/SKILL.md` file SHALL bind the "task subagent" concept to the Opencode `budget` agent keyword. The model SHALL be resolved via `agent.budget.model` in the project's `opencode.jsonc` — it MUST NOT be hardcoded in the skill file.

The compatibility field in the YAML frontmatter MUST be `opencode`. The description MUST include the same trigger phrases as the Claude Code variant.

> **Keyword rationale**: `budget` was chosen over the original `subagent` to align with the `budget-*` skill family naming convention (`budget-explorer`, `budget-executor`, `budget-subagent`). `subagent` was rejected because it describes the mechanism, not the cost tier. `cheap` was used temporarily during initial implementation and renamed to `budget` for the same alignment reason.

#### Scenario: model resolved from config
- **WHEN** the skill is invoked in Opencode
- **THEN** the model used is the one set in `agent.budget.model` in `opencode.jsonc`, not a value from the skill file

#### Scenario: agent keyword matches config key
- **WHEN** the skill references the subagent binding
- **THEN** it uses the keyword `budget` (lowercase), matching the key in the `agent` block of `opencode.jsonc`

---

### Requirement: opencode-config-entry
The `configs/opencode.jsonc` template SHALL include a `"budget"` entry under the `"agent"` block, parallel to the existing `"executor"` entry, with `mode: "subagent"` and a placeholder model comment.

The entry MUST follow this shape:

    "budget": {
      "mode": "subagent",
      // Put your trusted low-cost model here
      "model": "opencode-go/deepseek-v4-flash"
    }

#### Scenario: config is consistent with skill
- **WHEN** an Opencode user installs the config and invokes budget-subagent
- **THEN** Opencode resolves the model from `agent.budget.model` without error

#### Scenario: parallel to executor entry
- **WHEN** a user inspects opencode.jsonc
- **THEN** `executor` and `budget` both appear as sibling keys under `agent`, with identical structure
