# design-section-contract Specification

## Purpose
Defines which optional sections design.md carries: it omits a Deferred section, records follow-ups as non-goals, and emits Migration Plan only when a real rollout concern exists.

## Requirements

### Requirement: design.md omits the Deferred section and records follow-ups as non-goals

The active design step at `sai/commands/design/steps/design.md` SHALL NOT require or emit a `## Deferred` section in `openspec/changes/{name}/design.md`, and the design template SHALL NOT contain one. A real follow-up SHALL be recorded in `## Goals / Non-Goals` as a non-goal of the form "out of scope: X — revisit when Y". The tasks step at `sai/commands/design/steps/tasks.md` SHALL state that a real follow-up is not an Open Question and does not block `tasks.md` generation, while a genuine unresolved unknown the design cannot proceed without remains an Open Question that passes through the blocking gate.

#### Scenario: design.md has no Deferred section

- **WHEN** `sai-2-design` generates `design.md`
- **THEN** the file contains no `## Deferred` section
- **AND** the design template contains no `## Deferred` heading

#### Scenario: real follow-up recorded as a non-goal

- **WHEN** a change has a real follow-up it does not address
- **THEN** it is recorded under `## Goals / Non-Goals` as "out of scope: X — revisit when Y"

#### Scenario: follow-up does not block tasks.md

- **WHEN** `design.md` records a follow-up as a non-goal and has no unresolved Open Questions
- **THEN** `tasks.md` generation proceeds

#### Scenario: unresolved unknown stays an Open Question

- **WHEN** an item is an unknown the design genuinely cannot proceed without
- **THEN** it is an Open Question and passes through the blocking gate

#### Scenario: contract skeleton tests omit Deferred

- **WHEN** the design contract tests assert the top-level `design.md` skeleton
- **THEN** the asserted heading list does not include `## Deferred`

### Requirement: Migration Plan is emitted only for real rollout content

The active design step at `sai/commands/design/steps/design.md` SHALL require `## Migration Plan` to be emitted only when the change involves schema or data migration, deploy ordering, feature flags, or rollback, stating those deploy steps and the rollback strategy. When none applies, the section SHALL be omitted entirely and the design SHALL NOT emit a "no migration needed" placeholder. The design template SHALL mark the section as conditional through a non-normative comment.

#### Scenario: rollout content present

- **WHEN** a change involves schema or data migration, deploy ordering, feature flags, or rollback
- **THEN** `design.md` carries a `## Migration Plan` section stating the deploy steps and rollback strategy

#### Scenario: no rollout content

- **WHEN** a change involves none of schema or data migration, deploy ordering, feature flags, or rollback
- **THEN** `design.md` has no `## Migration Plan` section
- **AND** no "no migration needed" placeholder is emitted

#### Scenario: template marks Migration Plan conditional

- **WHEN** `openspec/schemas/sai-workflow/templates/design.md` is read
- **THEN** its Migration Plan section carries a comment saying to keep it only for schema/data migration, deploy ordering, feature flags, or rollback and otherwise delete it
