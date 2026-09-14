# openspec-templates Specification

## Purpose
TBD - created by archiving change upgrade-openspec-templates. Update Purpose after archive.

## Requirements

### Requirement: Template generator stamp SHALL reflect 1.13.0

All upgraded command/skill mirror frontmatter SHALL carry `generatedBy: "1.13.0"` replacing `1.7.0`, evidencing the 1.7.0 to 1.13.0 template upgrade.

#### Scenario: Generator stamp upgraded

- **WHEN** inspecting any upgraded mirror frontmatter in the staged diff
- **THEN** `generatedBy` reads `1.13.0` and no longer `1.7.0`

### Requirement: Store selection SHALL be sticky and include schemas

Command templates SHALL instruct sticky `--store <id>` handling for spec/change commands including `schemas`, with unscoped examples treated as shorthand requiring the flag.

#### Scenario: Sticky store selection

- **WHEN** a registered store is selected during apply/archive/propose/sync flows
- **THEN** every applicable follow-up command appends the same `--store <id>`

### Requirement: Propose workflow SHALL enforce planning-only boundary with context loading

The propose template SHALL forbid project-code edits, require `openspec context --json` root resolution, read `config.yaml`/`config.yml` project context as constraints, resolve schema selection, and scaffold via `openspec new change` before artifact creation.

#### Scenario: Planning boundary enforced

- **WHEN** running the upgraded propose flow from a user request
- **THEN** only planning artifacts are created and implementation waits for a separate apply request

### Requirement: Explore template SHALL use ASCII-only diagrams and specs inventory

The explore template SHALL restrict diagrams to plain ASCII (`+`, `-`, `|`, `-->`, `^`, `v`, `*`, `x`) and SHALL inventory durable capabilities via `openspec list --specs` plus focused `openspec show <spec-id> --type spec` reads before deciding coverage.

#### Scenario: Portable explore visuals and inventory

- **WHEN** visualizing or assessing existing capability coverage in explore mode
- **THEN** diagrams use ASCII only and specs inventory precedes coverage decisions

### Requirement: Change capture and apply guardrails SHALL prevent silent scope shifts

Templates SHALL require CLI-scaffolded change creation (never hand-made change directories), read-only exploration without confirmation, explicit yes/no confirmation before the first write-capable action, and surfacing added scope instead of silently narrowing, deferring, or simplifying specified behavior.

#### Scenario: Guarded capture and application

- **WHEN** a task needs work beyond the spec or a capture needs a new change
- **THEN** the agent surfaces the added scope and pauses for confirmation rather than absorbing it silently
