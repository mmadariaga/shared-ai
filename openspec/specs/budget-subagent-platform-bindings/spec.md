# budget-subagent-platform-bindings Specification

## Purpose

Define the per-harness budget-subagent skill bindings for Claude Code and Opencode, including the model-resolution mechanism for each harness.

## Requirements

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
The `skills/opencode/budget-subagent/SKILL.md` file SHALL bind the "task subagent" concept to the Opencode `budget` agent keyword. The model SHALL be resolved from the `budget` agent file's frontmatter `model` key — the file installed at `~/.config/opencode/agents/budget.md`, seeded by the installer under the `tunable-seed` lifecycle — and it MUST NOT be hardcoded in the skill file.

The compatibility field in the YAML frontmatter MUST be `opencode`. The description MUST include the same trigger phrases as the Claude Code variant.

> **Keyword rationale**: `budget` was chosen over the original `subagent` to align with the `budget-*` skill family naming convention (`budget-explorer`, `budget-executor`, `budget-subagent`). `subagent` was rejected because it describes the mechanism, not the cost tier. `cheap` was used temporarily during initial implementation and renamed to `budget` for the same alignment reason.

#### Scenario: model resolved from the budget agent file
- **WHEN** the skill is invoked in Opencode
- **THEN** the model used is the one set in the `model` frontmatter of `~/.config/opencode/agents/budget.md`, not a value from the skill file and not `agent.budget.model` in `opencode.jsonc`

#### Scenario: agent keyword matches the agent file name
- **WHEN** the skill references the subagent binding
- **THEN** it uses the keyword `budget` (lowercase), matching the filename `budget.md` in `~/.config/opencode/agents/`
