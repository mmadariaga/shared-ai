# budget-subagent-platform-bindings Specification

## Purpose
Governs how budget-* subagent bindings are declared across harnesses, including platform tool bindings and dispatch-mode declarations.

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

### Requirement: Every budget-* binding declares its dispatch mode

Every `budget-*` subagent binding SHALL declare its dispatch mode in the skill file (`skills/claude/budget-*/SKILL.md` or `skills/opencode/budget-*/SKILL.md`) under a `## Dispatch mode` section. The declaration SHALL name the harness parameter (or the absence of one) and SHALL satisfy the dispatch-safety invariant defined in `openspec/specs/dispatch-safety-invariant/spec.md`.

#### Scenario: Claude Code budget bindings declare run_in_background

- **WHEN** any of `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, or `skills/claude/budget-subagent/SKILL.md` is read
- **THEN** the file SHALL include a `## Dispatch mode` section that states `run_in_background: true`
- **AND** SHALL mirror the `run_in_background: true` parameter that the seven routed workers already declare at `sai/orchestration/workers/bindings/claude/design-worker.md:5`

#### Scenario: opencode budget bindings document the synchronous default

- **WHEN** any of `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, or `skills/opencode/budget-subagent/SKILL.md` is read
- **THEN** the file SHALL include a `## Dispatch mode` section that states the opencode `task` tool has no `run_in_background` parameter
- **AND** SHALL state that the binding runs synchronously by default
- **AND** SHALL point to `openspec/specs/dispatch-safety-invariant/spec.md` as the containing rule

#### Scenario: The three Claude Code budget bindings converge on one dispatch declaration

- **WHEN** a diff of `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, and `skills/claude/budget-subagent/SKILL.md` is reviewed
- **THEN** all three `## Dispatch mode` sections SHALL state `run_in_background: true` with the same normative phrasing

#### Scenario: The three opencode budget bindings converge on one dispatch declaration

- **WHEN** a diff of `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, and `skills/opencode/budget-subagent/SKILL.md` is reviewed
- **THEN** all three `## Dispatch mode` sections SHALL document the opencode synchronous default with the same normative phrasing

#### Scenario: The opencode half of this change is documentation parity only

- **WHEN** a reader consults the opencode `## Dispatch mode` sections or this spec
- **THEN** they understand that the opencode half of this change does NOT deliver hang containment
- **AND** the opencode `task` tool has no `run_in_background` parameter, so a hung child still deadlocks the parent on opencode
- **AND** this gap is recorded in `openspec/specs/asymmetry-documentation/spec.md` and in `AGENTS.md`
- **AND** the binding-declaration parity and the documentation-parity are the only opencode benefits in this change
