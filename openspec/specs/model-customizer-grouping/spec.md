# model-customizer-grouping Specification

## Purpose
TBD - created by archiving change reorder-model-customizer. Update Purpose after archive.
## Requirements
### Requirement: All checklist uses phased grouping
The All scope SHALL order targets as alphabetical agents, then one block per command in command-alphabetical order with its semantic workers directly below, then leftover workers alphabetically, then alphabetical utilities.

#### Scenario: User opens the All checklist
- **WHEN** the user selects All at the scope screen
- **THEN** agents lead, each orchestrator is immediately followed by its workers, leftover workers precede utilities, and every family-internal run stays alphabetical

### Requirement: Semantic worker pairing with orphan handling
The pairing SHALL place sai-4-apply with both sai-4-red-worker and sai-4-green-worker in RED-then-GREEN order, pair every other mapped command with its single worker, leave unmapped commands alone in alphabetical position, and list unmapped workers such as sai-commit-worker and sai-direct-build-worker as lone WORKER rows before utilities so sai-commit stays a separated UTILITY row.

#### Scenario: All checklist contains boundary cardinalities
- **WHEN** the All list includes a two-worker command, lone commands, lone workers, and the split commit pair
- **THEN** apply shows both workers in RED-then-GREEN order, lone entries keep alphabetical placement, and the commit worker and commit utility remain separated

