# apply-taxonomy-reclassification Specification

## Purpose

Defines the documentation taxonomy updates that reclassify `/sai-4-apply` from a utility card to a routed card in `AGENTS.md`, `README.md`, and `GLOSSARY.md`.

## Requirements

### Requirement: agents-md-reclassifies-apply

`AGENTS.md` SHALL classify `sai-4-apply` as a routed command: the repo-structure lines and table rows that enumerate utility cards SHALL remove `apply` from the utility list; the bindings description SHALL include the apply workers alongside the seven phase bindings; and the invocation-core description SHALL include the apply invocation core. Any statement that apply is a utility card with a `body.md`-only surface SHALL be removed or corrected.

#### Scenario: utility enumeration drops apply

- **WHEN** `AGENTS.md` is read after the change
- **THEN** `apply` does not appear in any utility-card enumeration (`sai/commands/{apply,archive,...}`), and the routed card and binding descriptions cover apply

#### Scenario: apply routed sections exist

- **WHEN** a reader consults `AGENTS.md` for the routed command sections
- **THEN** the apply coordinator/worker section describes the routed apply card set, the RED/GREEN workers, and the coordinator-centric execution model

### Requirement: readme-reclassifies-apply

`README.md` SHALL present `/sai-4-apply` as a routed command: the command table row SHALL describe the routed coordinator/worker shape (coordinator-centric, dispatching RED and GREEN workers); the routed coordinator/worker prose SHALL include apply alongside spec, design, and implement; and any statement grouping apply with on-demand or utility commands SHALL be corrected.

#### Scenario: command table describes the routed apply

- **WHEN** `README.md` is read after the change
- **THEN** the `/sai-4-apply` row describes the routed coordinator/worker execution and the RED/GREEN Step dispatch model

#### Scenario: on-demand grouping excludes apply

- **WHEN** a reader checks the on-demand (unnumbered) command section
- **THEN** `apply` does not appear in it

### Requirement: glossary-red-green-vocabulary

`GLOSSARY.md` SHALL define the RED Worker and GREEN Worker terms with the apply worker model: the RED Worker is the Step-execution worker that authors tests (blind to the GREEN implementation body in the split flow; authoring green tests under the green-exception) and the GREEN Worker is the Step-execution worker that implements with an absolute test-file prohibition. The existing **Blind Test-Writer** and **Implementation Dispatch** entries SHALL be updated or aliased to the new worker vocabulary, and the **Step Projection** relationship SHALL no longer state that apply has no coordinator-worker boundary.

#### Scenario: glossary defines the two workers

- **WHEN** `GLOSSARY.md` is read after the change
- **THEN** it contains exactly one **RED Worker** entry and exactly one **GREEN Worker** entry with the worker-model definitions above

#### Scenario: stale no-boundary statements are removed

- **WHEN** `GLOSSARY.md` is read after the change
- **THEN** no entry states that apply has no coordinator-worker boundary, and the Step Projection relationship reflects that the projection is never marked from worker progress events
