# claude-budget-agent-tunables Specification

## Purpose
TBD - created by syncing change claude-budget-agent-model-tunables. Update Purpose after archive.

## Requirements

### Requirement: Managed Claude generic agent sources

The repository SHALL provide managed Claude generic agent sources at `agents/claude/budget-explorer.md`, `agents/claude/budget-executor.md`, and `agents/claude/budget-subagent.md`, mirroring the three opencode roles. Each file SHALL declare a `name` matching its basename, a role description, and tunable `model` and `effort` frontmatter lines. The shipped seed values SHALL be `model: haiku` and `effort: low`; because the customization catalog's `haiku` entry carries no efforts array, the seed effort is the shipped constant, preserved and hand-editable under the tunable-seed lifecycle. The `budget-explorer` source SHALL additionally declare a capability that reproduces the read-only profile — no file writes, read and search tools only — so the harness enforces the explorer's read-only guarantee instead of prose. The body of each source SHALL consist of exactly one established Fetch directive — the exactly-one-Fetch rule constrains the body, never the frontmatter — targeting the corresponding neutral behavior policy: `budget-explorer.md` SHALL fetch `@sai/policies/explore-agent.md`, `budget-executor.md` SHALL fetch `@sai/policies/executor-agent.md`, and `budget-subagent.md` SHALL fetch `@sai/policies/budget-agent.md`. The sources SHALL NOT contain hardcoded model tiers, per-spawn model parameters, or harness-specific registration.

#### Scenario: three Claude generic agent sources exist

- **WHEN** the Claude generic agent sources are resolved
- **THEN** `agents/claude/budget-explorer.md`, `agents/claude/budget-executor.md`, and `agents/claude/budget-subagent.md` each exist with `name`, `description`, `model`, and `effort` frontmatter

#### Scenario: explorer source is read-only at dispatch

- **WHEN** the `budget-explorer` agent is dispatched
- **THEN** it cannot write files — no write-capable tool is available to it, in any frontmatter form
- **AND** the read-only restriction is harness-enforced rather than only prose in the fetched policy

#### Scenario: each Claude source fetches its matching policy

- **WHEN** the bodies of `agents/claude/budget-explorer.md`, `agents/claude/budget-executor.md`, and `agents/claude/budget-subagent.md` are read
- **THEN** each body is exactly one Fetch line targeting the policy of the corresponding role (`explore-agent`, `executor-agent`, or `budget-agent`)
- **AND** no body duplicates the policy content

### Requirement: Claude generic agent projections are tunable-seed managed

The install manifest SHALL declare exactly one projection per Claude generic agent source, each with `destination.class` `agents`, a destination path of `budget-explorer.md`, `budget-executor.md`, or `budget-subagent.md` under the Claude agents directory, `harnesses` limited to `claude`, `strategy` `tunable-seed`, and no tunable-key metadata — the per-harness tunable-keys constant, not per-projection annotations, governs preservation of the destination's `model` and `effort` lines.

#### Scenario: manifest declares the three Claude generic agent projections

- **WHEN** the `projections` array in `sai/install-manifest.json` is read
- **THEN** it contains three entries with `destination.class` `agents`, `harnesses` `["claude"]`, and `strategy` `tunable-seed` whose destination paths are `budget-explorer.md`, `budget-executor.md`, and `budget-subagent.md`

#### Scenario: no Claude generic agent projection carries tunable metadata

- **WHEN** each new Claude generic agent projection rule is inspected
- **THEN** no field on the rule names a tunable key

#### Scenario: pre-existing foreign file at a Claude generic-agent destination

- **WHEN** a file the installer did not create already exists at `~/.claude/agents/budget-explorer.md` (or `budget-executor.md` or `budget-subagent.md`)
- **THEN** the installer overwrites its body and non-tunable frontmatter with the source
- **AND** preserves any `model` and `effort` lines the destination file holds
- **AND** emits a console notice naming the destination path without throwing

### Requirement: Claude budget skills source the model from the agent files

The three Claude budget skills SHALL NOT contain hardcoded model identifiers. `skills/claude/budget-explorer/SKILL.md` SHALL name the `budget-explorer` agent file as the source of the subagent model, `skills/claude/budget-executor/SKILL.md` SHALL name the `budget-executor` agent file, and `skills/claude/budget-subagent/SKILL.md` SHALL name the `budget-subagent` agent file. Agent-file references SHALL mean the resolved agent file under the standard project-local-then-user-global resolution — `.claude/agents/` before `~/.claude/agents/`. The skills SHALL NOT instruct spawns to pass a per-spawn `model:` parameter.

#### Scenario: no hardcoded model identifier in Claude budget skills

- **WHEN** the three Claude budget skill files are read
- **THEN** neither `haiku` nor `sonnet` (nor any other model identifier) appears as a spawn model instruction
- **AND** each skill names its corresponding agent file as the model's source

#### Scenario: spawns do not pass a per-spawn model

- **WHEN** a caller following a Claude budget skill spawns the budget subagent
- **THEN** the spawn carries no `model:` parameter
- **AND** the subagent runs on the model declared in the corresponding agent file

#### Scenario: agent-file reference resolves project-local first

- **WHEN** a Claude budget skill names its agent file as the model source
- **THEN** the model is read from the project-local `.claude/agents/<name>.md` when one exists
- **AND** otherwise from the user-global `~/.claude/agents/<name>.md`

### Requirement: Claude explorer synthesis escalation tier retired

The Claude `budget-explorer` skill SHALL NOT declare a second, escalated subagent model tier for multi-step synthesis or cross-file reasoning. Multi-step synthesis and cross-file reasoning SHALL be reserved for the main agent, matching the opencode binding; lookup and research spawns SHALL use the `budget-explorer` agent file's model.

#### Scenario: single model tier for explore spawns

- **WHEN** the `budget-explorer` skill's model guidance is consulted
- **THEN** exactly one subagent model source exists — the `budget-explorer` agent file's `model` frontmatter
- **AND** no escalated subagent model tier is described

#### Scenario: synthesis stays in the main agent

- **WHEN** a research task requires multi-step synthesis or cross-file reasoning
- **THEN** the skill directs that work to the main agent rather than to an escalated subagent spawn

### Requirement: Claude budget skill dispatch literals resolve to the created agent files

Every `subagent_type` literal that names a Claude budget agent SHALL resolve to one of the three agent files this change creates. `skills/claude/budget-explorer/SKILL.md` SHALL dispatch `subagent_type: budget-explorer`, `skills/claude/budget-executor/SKILL.md` SHALL dispatch `subagent_type: budget-executor`, and `skills/claude/budget-subagent/SKILL.md` SHALL dispatch `subagent_type: budget-subagent`. Budget subagent dispatch SHALL NOT use built-in type literals (`Explore`, `General`, `general-purpose`) or any other literal that names no created agent file. The `sai-explore` dispatch literal `Agent(subagent_type: budget-subagent, ...)` in `sai/commands/explore/body.md` SHALL resolve to the created `budget-subagent` agent file.

#### Scenario: skill dispatch literals name the agent files

- **WHEN** the dispatch lines of the three Claude budget skills are read
- **THEN** each names its corresponding created agent file (`budget-explorer`, `budget-executor`, or `budget-subagent`)
- **AND** no built-in type literal or unresolvable literal appears in any budget dispatch line

#### Scenario: sai-explore dispatch resolves to the created agent file

- **WHEN** `sai/commands/explore/body.md` dispatches the budget subagent as `Agent(subagent_type: budget-subagent, ...)`
- **THEN** the literal resolves to the created `budget-subagent` agent file

### Requirement: Claude explorer tool-call caps collapse to a single ceiling

The Claude `budget-explorer` skill SHALL declare a single per-spawn tool-call ceiling of 30 calls for explore spawns and SHALL NOT declare the retired lookup 10 / audit 30 class split. Callers SHALL remain free to tighten the ceiling below 30 for a specific dispatch — for example `sai/commands/backfill/instructions.md` keeps its 10-call lookup cap.

#### Scenario: single ceiling replaces the class split

- **WHEN** the `budget-explorer` skill's tool-call cap guidance is consulted
- **THEN** exactly one per-spawn ceiling of 30 calls is declared
- **AND** no lookup/audit class split is described

#### Scenario: callers may tighten below the ceiling

- **WHEN** a caller declares a stricter cap (for example 10 calls) for a specific dispatch
- **THEN** the stricter cap governs that dispatch
- **AND** the skill's 30-call ceiling remains the default for every other dispatch

### Requirement: Claude haiku-target customization materializes model-only overrides

When a Claude customization run confirms a target whose selected model is `haiku`, the per-target local-override operation SHALL materialize the project-local override with the `model: haiku` line and without any `effort` line: an `effort` line the destination frontmatter holds SHALL be dropped, and no `effort` line SHALL be invented. The menu SHALL NOT offer effort choices for `haiku`, because the catalog entry carries no efforts array. The user-global managed source file SHALL keep its seeded `model: haiku` and `effort: low` lines untouched.

#### Scenario: haiku override drops the destination effort line

- **WHEN** the local-override operation materializes a haiku target whose base frontmatter holds an `effort` line
- **THEN** the resulting override frontmatter contains the `model: haiku` line and no `effort` line

#### Scenario: user-global seed stays untouched

- **WHEN** the menu customizes a haiku target
- **THEN** the user-global managed source file's `model` and `effort` lines remain unchanged
