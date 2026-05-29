# opencode-budget-cost-model-docs Specification

## Purpose

Each opencode budget skill SHALL document the cost and context-hygiene rationale for subagent delegation. This ensures agents loading these skills understand why work is delegated to subagents and how model selection affects costs, parallel to the cost model sections present in their claude counterparts.

## Requirements

### Requirement: Cost model section in budget-explorer SKILL.md

The `skills/opencode/budget-explorer/SKILL.md` file SHALL include a `## Cost model` section positioned after the `## Model resolution` section and before the `## Output contract` section.

The section SHALL explain:
- **Why delegate**: The cost efficiency and context-hygiene benefits of delegating research tasks to subagents
- **Model resolution**: How the opencode harness resolves the model for this skill via `agent.<keyword>.model` in the project's `opencode.jsonc`
- **When to use**: Guidance on when to invoke this skill based on budget constraints

#### Scenario: Agent loads opencode budget-explorer and reads rationale

- **WHEN** an agent loads `skills/opencode/budget-explorer/SKILL.md`
- **THEN** it finds the `## Cost model` section clearly positioned after `## Model resolution`
- **AND** it understands the rationale for delegating research to subagents

#### Scenario: Model resolution via opencode.jsonc

- **WHEN** the cost model section documents model selection
- **THEN** it explicitly states that the model is resolved via `agent.<keyword>.model` in `opencode.jsonc`, not hardcoded in the SKILL.md

---

### Requirement: Cost model section in budget-executor SKILL.md

The `skills/opencode/budget-executor/SKILL.md` file SHALL include a `## Cost model` section positioned after the `## OpenCode Binding` section.

The section SHALL explain:
- **Why delegate**: The cost efficiency and context preservation benefits of delegating execution tasks to subagents
- **Model resolution**: How the opencode harness resolves the model for this skill via `agent.<keyword>.model` in the project's `opencode.jsonc`
- **Execution overhead**: How delegation reduces main agent context pollution when running long-running or resource-intensive operations

#### Scenario: Agent loads opencode budget-executor and understands delegation

- **WHEN** an agent loads `skills/opencode/budget-executor/SKILL.md`
- **THEN** it finds the `## Cost model` section positioned after `## OpenCode Binding`
- **AND** it understands the cost and context-hygiene rationale for delegating execution

---

### Requirement: Cost model section in budget-subagent SKILL.md

The `skills/opencode/budget-subagent/SKILL.md` file SHALL include a `## Cost model` section positioned after the `## OpenCode Binding` section.

The section SHALL explain:
- **Why delegate**: The cost efficiency and context-hygiene benefits of delegating general tasks to subagents, particularly for scoped work that benefits from fresh context
- **Model resolution**: How the opencode harness resolves the model for this skill via `agent.<keyword>.model` in the project's `opencode.jsonc`
- **Scope boundaries**: How clear task boundaries enable effective subagent delegation and cost control

#### Scenario: Agent loads opencode budget-subagent and understands cost model

- **WHEN** an agent loads `skills/opencode/budget-subagent/SKILL.md`
- **THEN** it finds the `## Cost model` section positioned after `## OpenCode Binding`
- **AND** it understands the rationale for delegating scoped tasks to subagents

---

### Requirement: Consistency with claude budget skills

The cost model sections in all three opencode budget skills SHALL be adapted to opencode's model-resolution mechanism (`agent.<keyword>.model` in `opencode.jsonc`), but SHALL maintain conceptual parity with their claude counterparts regarding:
- Cost efficiency benefits of delegation
- Context-hygiene preservation
- When and why to use each skill

#### Scenario: Claude and opencode budget skills convey same rationale

- **WHEN** comparing the cost model sections in `skills/claude/budget-explorer/SKILL.md` and `skills/opencode/budget-explorer/SKILL.md`
- **THEN** both convey the same rationale for research task delegation, with only the model-resolution mechanism differing (claude: model field; opencode: `agent.<keyword>.model`)
