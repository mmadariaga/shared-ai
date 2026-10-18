# apply-taxonomy-reclassification Specification

## Purpose

Defines the documentation taxonomy updates that reclassify `/sai-4-apply` from a utility card to a routed card in `AGENTS.md`, `README.md`, and `GLOSSARY.md`.

## Requirements

### Requirement: glossary-red-green-vocabulary

`GLOSSARY.md` SHALL define the RED Worker and GREEN Worker terms with the `/sai-3-implement` worker model: the RED Worker is the Step-execution worker (`sai-3-red-worker`) that authors tests (blind to the GREEN implementation body in the split flow; authoring green tests under the green-exception) and the GREEN Worker is the Step-execution worker (`sai-3-green-worker`) that implements with an absolute test-file prohibition. The existing **Blind Test-Writer** and **Implementation Dispatch** entries SHALL be updated or aliased to the new worker vocabulary, and the **Step Projection** relationship SHALL no longer state that apply has no coordinator-worker boundary.

#### Scenario: glossary defines the two workers

- **WHEN** `GLOSSARY.md` is read after the change
- **THEN** it contains exactly one **RED Worker** entry and exactly one **GREEN Worker** entry with the worker-model definitions above

#### Scenario: stale no-boundary statements are removed

- **WHEN** `GLOSSARY.md` is read after the change
- **THEN** no entry states that apply has no coordinator-worker boundary, and the Step Projection relationship reflects that the projection is never marked from worker progress events
