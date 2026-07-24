# design-deferred-decisions Specification

## Requirements

### Requirement: design.md carries a Deferred section

`sai/instructions/design.md` SHALL require `openspec/changes/{name}/design.md` to carry a `## Deferred` section for decisions that are deliberately not made in this change but become more expensive to make the longer they are postponed.

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

### Requirement: Each Deferred item states the cost of postponing and a recommendation

Every `## Deferred` item SHALL state two things:

1. **Cost of postponing** — what gets more expensive, and why, the longer the decision waits. The cost SHALL be stated concretely (what accumulates, what must be migrated or rewritten later), not as a generic "harder later".
2. **Recommendation** — the design agent's actual position on what should be decided and roughly when, stated as a recommendation rather than a decision.

An item missing either part SHALL NOT be emitted.

#### Scenario: item states concrete cost

- **WHEN** a decision is deferred
- **THEN** its item names what accumulates or must be reworked if the decision waits
- **AND** it does NOT state the cost as a generic "harder later"

#### Scenario: item carries a recommendation

- **WHEN** a decision is deferred
- **THEN** its item states the agent's recommended resolution and rough timing
- **AND** the recommendation is framed as a recommendation, not as a decision already taken

#### Scenario: incomplete item is not emitted

- **WHEN** the agent can state a deferred decision but neither its postponement cost nor a recommendation
- **THEN** the item is not emitted under `## Deferred`

### Requirement: Deferred items do not pass through the Open Questions gate

`## Deferred` items SHALL NOT be routed through the blocking `## Open Questions` gate. The gate blocks `tasks.md` generation until every Open Question is answered by the codebase or resolved by the user; deferred decisions are, by definition, not blocking.

A `## Deferred` item SHALL NOT be delegated to a `budget-explorer` subagent for resolution the way an Open Question is, and its presence SHALL NOT prevent `tasks.md` generation.

#### Scenario: deferred item does not block tasks.md

- **WHEN** `design.md` contains one or more `## Deferred` items and no unresolved Open Questions
- **THEN** `tasks.md` generation proceeds
- **AND** the deferred items are carried forward unresolved

#### Scenario: unresolved unknown belongs in Open Questions

- **WHEN** an item is an unknown the design genuinely cannot proceed without
- **THEN** it is an Open Question and is routed through the blocking gate
- **AND** it is NOT moved into `## Deferred` to avoid the gate
