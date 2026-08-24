## MODIFIED Requirements

### Requirement: design.md carries a Deferred section
The active design step at `sai/commands/design/steps/design.md` SHALL require `openspec/changes/{name}/design.md` to carry a `## Deferred` section for decisions that are deliberately not made in this change but become more expensive to make the longer they are postponed.

A `## Deferred` item SHALL be a decision the change *could* have made and chose not to — not a general non-goal and not an unresolved unknown. When there is nothing to defer, the section SHALL be emitted with an explicit `None`.

#### Scenario: Deferred section present
- **WHEN** `sai-2-design` generates `design.md`
- **THEN** the file contains a `## Deferred` section

#### Scenario: nothing deferred
- **WHEN** a change defers no decision
- **THEN** `## Deferred` is emitted with `None`
- **AND** the section is NOT omitted

#### Scenario: non-goals are not deferred items
- **WHEN** something is simply out of scope with no rising cost to postponing it
- **THEN** it belongs in `## Goals / Non-Goals`
- **AND** it is NOT listed under `## Deferred`

#### Scenario: deferred-section-uses-live-authority
- **WHEN** the design worker generates `design.md`
- **THEN** it emits the Deferred section according to the active step-local rule.

