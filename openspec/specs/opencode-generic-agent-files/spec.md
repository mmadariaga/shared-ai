# opencode-generic-agent-files Specification

## Purpose
TBD - created by syncing change relocate-generic-opencode-agents. Update Purpose after archive.

## Requirements

### Requirement: Generic opencode agents ship as managed agent files

The repository SHALL ship agents/opencode/explore.md, executor.md, and budget.md. Filename SHALL remain the agent name and frontmatter SHALL carry no name field. Each SHALL retain subagent mode, its shipped low-cost model seed, optional variant, and a role-first description for automatic selection; source frontmatter SHALL remain authoritative for shipped tunable seeds. Exact filenames SHALL remain preserved because dispatch targets use those names. Native grants SHALL be compiled from canonical capability assignments into ordered V2 permissions. Each body SHALL begin with `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.`, disclose its profile, and retain exactly its matching canonical policy Fetch: explore-agent.md, executor-agent.md, or budget-agent.md. Executor and Budget SHALL additionally reference the shared access-check policy; Explorer SHALL check its profile through its role policy after goal disclosure. A user-owned project-local materialization MAY append instructions after the role-policy Fetch without changing managed frontmatter or Fetch targets.

#### Scenario: three generic agent files retain the required frontmatter
- **WHEN** agents/opencode is inspected
- **THEN** it contains explore.md, executor.md, and budget.md with role descriptions, subagent mode, model seeds, generated permissions, and no name field
- **AND** filename-implied identities remain unchanged

#### Scenario: agent names and task targets are preserved
- **WHEN** routed bindings authorize budget and explore targets and the executor binding targets executor
- **THEN** shipped filenames carry those exact names
- **AND** no dispatch reference breaks through capability projection

#### Scenario: shipped generic agent bodies are thin canonical wrappers
- **WHEN** a Generic Agent definition is projected
- **THEN** its body starts with fetch bootstrap and contains profile disclosure, applicable access-check reference, and exactly one matching canonical role-policy Fetch
- **AND** it contains no copied behavior contract or native OpenCode import

#### Scenario: generic opencode wrapper loads fetch rules first
- **WHEN** a managed opencode Generic Agent is read after installation
- **THEN** its first body line bootstraps fetch resolution before any access-check or role-policy Fetch

#### Scenario: existing tunables and local extensions remain compatible
- **WHEN** a managed destination retains user-selected model or variant settings or a user-owned project-local materialization appends instructions after the role-policy Fetch
- **THEN** managed updates preserve destination tunables
- **AND** the wrapper contract permits project-local appended instructions after the canonical role policy

### Requirement: No agent is defined in the shipped opencode config

`configs/opencode.jsonc` SHALL NOT contain an `agent` key or any `agent.*` entry. It SHALL retain `$schema`, `subagent_depth`, and `permission` with their current values and shape. No agent definition may remain in the shipped configuration when this change lands.

#### Scenario: the shipped config contains no agent block

- **WHEN** `configs/opencode.jsonc` is read after this change is applied
- **THEN** it contains no `agent` key
- **AND** it still declares `$schema`, `subagent_depth`, and `permission` (including the `~/.config/opencode/sai/**` external-directory allow rule)

### Requirement: Generic agent projections use the tunable-seed strategy

The manifest SHALL declare exactly three opencode Generic Agent projections with source agents/opencode/explore.md, executor.md, and budget.md, destination class agents, and strategy tunable-seed. Fresh installation SHALL seed compiled content including the source model. Subsequent installation SHALL preserve destination model and variant settings, replace divergent managed content with a notice, and quietly reuse body-compatible content.

#### Scenario: manifest declares the three generic agent projections
- **WHEN** the install manifest is loaded
- **THEN** its projections array contains exactly three opencode Generic Agent entries with agents destinations and tunable-seed strategy for explore.md, executor.md, and budget.md

#### Scenario: a tuned generic agent model survives re-install
- **WHEN** an existing `~/.config/opencode/agents/explore.md` has a user-tuned model and installation runs again
- **THEN** the tuned model is preserved while divergent managed content is updated or compatible content is reused untouched
