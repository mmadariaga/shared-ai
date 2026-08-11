# opencode-budget-skill-contract-parity Specification

## Purpose

TBD: define the canonical behavior-policy consumption contract shared by the three OpenCode budget skills and their matching generic agents.

## Requirements

### Requirement: budget skills reference matching canonical behavior policies

The three OpenCode budget skills SHALL consume the same behavior policy as their matching generic OpenCode agent by containing exactly one canonical behavior Fetch directive with these exact targets:

- `skills/opencode/budget-subagent/SKILL.md` SHALL fetch `@sai/policies/budget-agent.md`.
- `skills/opencode/budget-executor/SKILL.md` SHALL fetch `@sai/policies/executor-agent.md`.
- `skills/opencode/budget-explorer/SKILL.md` SHALL fetch `@sai/policies/explore-agent.md`.

The corresponding agent files SHALL continue to fetch those same targets. The skills SHALL not import a native OpenCode policy module or duplicate the universal behavior rules supplied by the fetched policy.

The implementation boundary SHALL be explicit:

- `budget-subagent/SKILL.md` SHALL remove its current `## Universal Behavior` section and retain `## OpenCode Binding`, `## Dispatch mode`, and `## Cost model` as skill-local sections.
- `budget-executor/SKILL.md` SHALL remove its current `## Universal Behavior` section and retain `## OpenCode Binding`, `## Dispatch mode`, `## Model resolution`, and `## Cost model` as skill-local sections.
- `budget-explorer/SKILL.md` SHALL add the canonical behavior Fetch, remove its current duplicated `## Output contract` rule block, and retain `## Subagent binding`, `## Dispatch mode`, `## Model resolution`, `## Tool-call caps`, and `## Cost model` as skill-local sections. Its output-contract behavior SHALL remain available unchanged through `explore-agent.md`.

Each skill SHALL have one canonical behavior section containing its matching Fetch directive. No copied universal-behavior or output-contract rule block may remain alongside that directive.

#### Scenario: all budget skills resolve the matching agent contract

- **WHEN** a caller loads any of the three OpenCode budget skills and its matching generic agent
- **THEN** both surfaces resolve the same name-matched `sai/policies/*-agent.md` file
- **AND** the skill contributes no second copy of the policy's universal behavior prose

#### Scenario: a canonical behavior update reaches both surfaces

- **WHEN** the matching canonical policy changes
- **THEN** a subsequent resolution of the budget skill and generic agent uses that updated policy
- **AND** no skill-local copy must be edited to propagate the behavior change

### Requirement: skill-specific OpenCode contracts remain unchanged

The canonical Fetch references SHALL be additive wiring, not a replacement for skill-specific OpenCode guidance. The skills SHALL preserve the following semantics and documentation:

- `budget-subagent` SHALL retain the lowercase `budget` binding, model resolution from `~/.config/opencode/agents/budget.md` frontmatter, synchronous dispatch, no harness-enforced cap, structured completion-report shape, permission-block abort behavior, approximately 30-call behavioral limit, and its cost and scope-boundary rationale.
- `budget-executor` SHALL retain the lowercase `executor` binding, model resolution from `~/.config/opencode/agents/executor.md` frontmatter, synchronous dispatch, no tool-call cap, raw command output allowance for explicitly requested command results and relevant error or compiler messages, structured failure-report requirements, and its cost and execution-overhead rationale. That allowance SHALL NOT permit unrequested full-file dumps or unfiltered log streams, which remain prohibited by `executor-agent.md`.
- `budget-explorer` SHALL retain the lowercase `explore` binding, model resolution from `~/.config/opencode/agents/explore.md` frontmatter, synchronous dispatch, the per-spawn limit of 30 tool calls, caller-declared output-contract requirements, and its cost and research-use rationale.

No skill may hardcode a model identifier or change the existing OpenCode binding keyword, dispatch mode, model source, output contract, tool-call limit, raw-output rule, permission rule, or cost-documentation meaning as part of this deduplication. Removing budget-explorer's duplicated output-contract section is a source-of-truth move only: the effective contract remains the one in `sai/policies/explore-agent.md`.

The retained and removed documentation boundaries SHALL be explicit:

- `budget-subagent` removes the copied `## Universal Behavior` section and retains `## OpenCode Binding`, `## Dispatch mode`, and `## Cost model`; its local text preserves the lowercase `budget` binding, synchronous dispatch, agent-file model resolution, structured completion report, permission-block abort, approximately 30-call behavioral limit, scope boundary, and cost rationale.
- `budget-executor` removes the copied `## Universal Behavior` section and retains `## OpenCode Binding`, `## Dispatch mode`, `## Model resolution`, and `## Cost model`; its local text preserves the lowercase `executor` binding, synchronous dispatch, no tool-call cap, structured failure report, and raw output only for explicitly requested command results and relevant error or compiler messages, while prohibiting unrequested full-file dumps and unfiltered log streams.
- `budget-explorer` removes the copied `## Output contract` rule block and retains `## Subagent binding`, `## Dispatch mode`, `## Model resolution`, `## Tool-call caps`, and `## Cost model`; its local text preserves the lowercase `explore` binding, synchronous dispatch, agent-file model resolution, 30-call per-spawn limit, caller-declared output-contract marker, and cost rationale, while the effective output contract comes from `explore-agent.md`.

#### Scenario: budget-subagent keeps its binding and safety contract

- **WHEN** `budget-subagent/SKILL.md` is loaded after its canonical policy
- **THEN** the caller still knows to dispatch the lowercase `budget` keyword synchronously with model resolution delegated to the budget agent file
- **AND** the canonical policy still supplies the structured report, permission-block abort, scope, no-self-correction, output, and approximate-30-call behavior

#### Scenario: budget-executor keeps execution semantics

- **WHEN** `budget-executor/SKILL.md` is loaded after its canonical policy
- **THEN** it still documents synchronous `executor` dispatch, agent-file model resolution, no harness cap, and raw command output allowance
- **AND** that allowance applies only to explicitly requested command results and relevant error or compiler messages
- **AND** unrequested full-file dumps and unfiltered log streams remain prohibited
- **AND** the canonical policy still supplies exact-command, no-self-correction, narrow-command, parallel-command, and failure-report behavior

#### Scenario: budget-explorer keeps research semantics

- **WHEN** `budget-explorer/SKILL.md` is loaded after its canonical policy
- **THEN** it still documents synchronous `explore` dispatch, agent-file model resolution, and the 30-call per-spawn limit
- **AND** the canonical policy still supplies read-only research, clean-context, caller-owned summary, no-raw-output, and spawn-contract behavior

### Requirement: regression coverage enforces skill-agent parity

The canonical OpenCode agent behavior regression suite SHALL verify the skill-to-agent contract for all three budget pairs. Coverage SHALL assert that each skill and its matching agent reference exactly one identical canonical policy target, that budget-subagent and budget-executor contain no `## Universal Behavior` section, that budget-explorer contains no copied `## Output contract` rule block, and that no skill uses a native policy import. Coverage SHALL also assert the skill-specific binding, model-resolution, dispatch, output, cap, permission, raw-output, and cost markers remain present as applicable to each skill. For executor, coverage SHALL assert both the allowed requested-command/error output wording and the canonical prohibitions on unrequested full-file dumps and unfiltered logs.

#### Scenario: a skill points at the wrong policy

- **WHEN** a budget skill's Fetch target differs from its matching agent's Fetch target
- **THEN** the focused regression test fails and identifies the mismatched skill-agent pair

#### Scenario: duplicated universal behavior returns

- **WHEN** a budget skill reintroduces copied universal behavior prose instead of consuming its policy
- **THEN** the focused regression test fails before the duplicated contract can drift from the canonical policy

#### Scenario: skill-specific documentation is removed

- **WHEN** a change removes a required binding, model-resolution, dispatch, output, cap, permission, raw-output, or cost marker from a budget skill
- **THEN** the focused regression test fails for that affected skill while leaving the other skill-specific contracts independently checked
