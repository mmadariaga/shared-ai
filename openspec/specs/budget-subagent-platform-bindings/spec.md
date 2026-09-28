# budget-subagent-platform-bindings Specification

## Purpose

Define the per-harness budget-subagent skill bindings for Claude Code and Opencode, including the model-resolution mechanism for each harness.

## Requirements

### Requirement: claude-code-binding
The `skills/claude/budget-subagent/SKILL.md` file SHALL bind the "task subagent" concept to `Agent(subagent_type: budget-subagent, run_in_background: true, prompt: <prompt>)`. The model SHALL come from the `model` frontmatter of the resolved `budget-subagent.md` agent file, the project-local `.claude/agents/budget-subagent.md` taking precedence over `~/.claude/agents/budget-subagent.md`; spawns SHALL pass no per-spawn model parameter. The harness enforces no tool-call cap; the policy's approximately 30-call limit governs the task.

The compatibility field in the YAML frontmatter MUST be `claude`. The description MUST include the trigger phrases: `"budget subagent"`, `"cheap subagent"`, `"budget task"`, `"cheap task"`.

#### Scenario: model comes from the agent file
- **WHEN** a caller spawns a budget-subagent using the Claude Code Agent tool
- **THEN** the call carries `subagent_type: budget-subagent` and no `model` parameter, and the resolved agent file's `model` frontmatter selects the model

#### Scenario: background dispatch
- **WHEN** a main agent, routed SAI coordinator, or routed SAI worker spawns the budget-subagent
- **THEN** the call sets `run_in_background: true` and the dispatcher awaits the result on its own turn

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

---

### Requirement: caller-spawn-prompt
Both `skills/claude/budget-subagent/SKILL.md` and `skills/opencode/budget-subagent/SKILL.md` SHALL carry a `## Spawn prompt` section telling the caller to give one task per spawn, with what to do, the files or area it covers, and, when a specific result is needed, the exact shape to return; without a shape the subagent returns its structured completion report. Independent tasks SHALL go to separate spawns.

#### Scenario: caller needs a specific result shape
- **WHEN** a caller dispatches the budget subagent for a task whose result it parses in a fixed shape
- **THEN** the spawn prompt names that shape, and the subagent returns it instead of the completion report

#### Scenario: two independent tasks
- **WHEN** a caller has two independent tasks for the budget subagent
- **THEN** it dispatches them as two spawns, one task each
