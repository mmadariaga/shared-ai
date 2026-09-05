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

The canonical Fetch references SHALL remain additive wiring with skill-specific OpenCode guidance preserved for all three budget skills. The budget-explorer skill SHALL retain the 40-call per-spawn limit while budget-subagent and budget-executor SHALL retain their existing binding and safety contracts unchanged.

#### Scenario: budget-subagent keeps its binding and safety contract
- **WHEN** budget-subagent SKILL.md is loaded after its canonical policy
- **THEN** the caller still dispatches the lowercase budget keyword synchronously with the existing safety contract

#### Scenario: budget-executor keeps execution semantics
- **WHEN** budget-executor SKILL.md is loaded after its canonical policy
- **THEN** it still documents synchronous executor dispatch with no harness cap and limited raw output allowance

#### Scenario: budget-explorer keeps research semantics
- **WHEN** budget-explorer SKILL.md is loaded after its canonical policy
- **THEN** it still documents synchronous explore dispatch with the 40-call per-spawn limit

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

