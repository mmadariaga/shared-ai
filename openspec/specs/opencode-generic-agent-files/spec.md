# opencode-generic-agent-files Specification

## Purpose
TBD - created by syncing change relocate-generic-opencode-agents. Update Purpose after archive.

## Requirements

### Requirement: Generic opencode agents ship as managed agent files

The repository SHALL ship `agents/opencode/explore.md`, `agents/opencode/executor.md`, and `agents/opencode/budget.md`. Each file SHALL declare in its YAML frontmatter exactly the agent name implied by its filename, `mode: subagent`, the placeholder low-cost model `opencode-go/deepseek-v4-flash`, and a description that names the agent's role. The three agent names SHALL be preserved exactly as `explore`, `executor`, and `budget` because the routed opencode worker bindings and the worker agent frontmatter (`permission.task`) authorize the `budget` and `explore` task targets by name.

#### Scenario: three generic agent files exist with the required frontmatter

- **WHEN** `agents/opencode/` is read after this change is applied
- **THEN** it contains `explore.md`, `executor.md`, and `budget.md`
- **AND** each file's frontmatter declares `mode: subagent` and `model: opencode-go/deepseek-v4-flash`
- **AND** each file's description names the agent's role

#### Scenario: agent names are preserved for the bindings

- **WHEN** the routed opencode bindings authorize the `budget` and `explore` task targets by name
- **THEN** the shipped agent files carry those exact names, so no binding-target reference breaks

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
