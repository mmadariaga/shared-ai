# opencode-generic-agent-files Specification

## Purpose
TBD - created by syncing change relocate-generic-opencode-agents. Update Purpose after archive.

## Requirements

### Requirement: Generic opencode agents ship as managed agent files

The repository SHALL ship `agents/opencode/explore.md`, `agents/opencode/executor.md`, and `agents/opencode/budget.md`. Each file SHALL declare in its YAML frontmatter exactly the agent name implied by its filename, `mode: subagent`, the placeholder low-cost model `opencode-go/deepseek-v4-flash`, and the existing description naming the agent's role. The three agent names SHALL be preserved exactly as `explore`, `executor`, and `budget` because the routed opencode worker bindings and the worker agent frontmatter (`permission.task`) authorize the `budget` and `explore` task targets by name. After the frontmatter, each shipped source file SHALL begin with `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.` followed by only its matching canonical SAI policy Fetch directive: `explore.md` SHALL fetch `@sai/policies/explore-agent.md`, `executor.md` SHALL fetch `@sai/policies/executor-agent.md`, and `budget.md` SHALL fetch `@sai/policies/budget-agent.md`. A user-owned project-local materialization MAY append project-specific instructions after that policy Fetch line without changing the managed frontmatter or Fetch targets.

#### Scenario: three generic agent files retain the required frontmatter

- **WHEN** `agents/opencode/` is read after this change is applied
- **THEN** it contains `explore.md`, `executor.md`, and `budget.md`
- **AND** each file's frontmatter retains its pre-change description, `mode: subagent`, and `model: opencode-go/deepseek-v4-flash`
- **AND** each file's filename-implied agent name remains unchanged

#### Scenario: agent names and task targets are preserved

- **WHEN** the routed opencode bindings authorize the `budget` and `explore` task targets by name and the executor binding targets `executor`
- **THEN** the shipped agent files carry those exact names
- **AND** no task-target reference breaks because of the wrapper conversion

#### Scenario: shipped generic agent bodies are thin canonical wrappers

- **WHEN** any of the three generic agent files is read after this change is applied
- **THEN** its post-frontmatter body begins with the opencode fetch bootstrap and then contains exactly one `Fetch @sai/policies/<name>-agent.md` directive for its matching agent name
- **AND** the body contains no copied behavior contract or native OpenCode import

#### Scenario: generic opencode wrapper loads fetch rules first
- **WHEN** any managed opencode generic agent source is read after installation
- **THEN** its first body line is the opencode fetch bootstrap and its next Fetch directive targets the matching canonical policy

#### Scenario: existing tunables and local extensions remain compatible

- **WHEN** an existing managed destination retains a user-selected `model` or `variant`, or a user-owned project-local agent file appends instructions after the Fetch line
- **THEN** the wrapper conversion does not rewrite or remove those tunable frontmatter values
- **AND** the appended project-specific instructions remain after the fetched canonical policy

### Requirement: No agent is defined in the shipped opencode config

`configs/opencode.jsonc` SHALL NOT contain an `agent` key or any `agent.*` entry. It SHALL retain `$schema`, `subagent_depth`, and `permission` with their current values and shape. No agent definition may remain in the shipped configuration when this change lands.

#### Scenario: the shipped config contains no agent block

- **WHEN** `configs/opencode.jsonc` is read after this change is applied
- **THEN** it contains no `agent` key
- **AND** it still declares `$schema`, `subagent_depth`, and `permission` (including the `~/.config/opencode/sai/**` external-directory allow rule)

### Requirement: Generic agent projections use the tunable-seed strategy

The install manifest SHALL declare exactly three new projections for `agents/opencode/explore.md`, `agents/opencode/executor.md`, and `agents/opencode/budget.md` with destination class `agents` and strategy `tunable-seed`, so a fresh install seeds the placeholder model verbatim and a user-tuned `model` line in the destination file survives subsequent installs per the slice-0 ownership contract.

#### Scenario: manifest declares the three generic agent projections

- **WHEN** the install manifest is loaded after this change is applied
- **THEN** the `projections` array contains exactly three entries whose source is under `agents/opencode/`, whose destination class is `agents`, and whose strategy is `tunable-seed`, for the filenames `explore.md`, `executor.md`, and `budget.md`

#### Scenario: a tuned generic agent model survives re-install

- **WHEN** an existing `~/.config/opencode/agents/explore.md` carries a user-tuned `model` line and the installer runs again
- **THEN** the tuned `model` line is preserved and the body and non-tunable frontmatter are overwritten with the source
