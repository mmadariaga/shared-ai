# model-customizer-grouping Specification

## Purpose
TBD - created by archiving change reorder-model-customizer. Update Purpose after archive.
## Requirements
### Requirement: All checklist uses phased grouping

The All scope SHALL order targets as alphabetical agents, then one block per command in command-alphabetical order with its semantic workers directly below, then leftover workers alphabetically, then alphabetical utilities, with a single blank separator row between the agents group, the orchestrator-worker middle block, and the utilities group. The implementation SHALL suppress a separator when an adjacent group is empty, SHALL never emit a leading, trailing, or doubled blank, and SHALL keep single-family scopes flat with no separators. Separator rows SHALL be non-selectable: the navigator SHALL skip them during cursor movement, SHALL treat Space as a no-op on them, SHALL exclude them from Enter results, and SHALL ignore them for default selection and empty-confirm protection, and they SHALL never enter stable values, settings labels, or overrides.

#### Scenario: User opens the All checklist

- **WHEN** the user selects All at the scope screen
- **THEN** agents lead, each orchestrator is immediately followed by its workers, leftover workers precede utilities, and every family-internal run stays alphabetical

#### Scenario: Grouped All table with blank rules

- **WHEN** the user selects All at the scope screen
- **THEN** agents lead, the orchestrator-worker block follows after one blank, utilities close after one blank, and separators stay non-selectable with no stray blanks

### Requirement: Semantic worker pairing with orphan handling
The pairing SHALL place sai-4-apply with both sai-4-red-worker and sai-4-green-worker in RED-then-GREEN order, pair every other mapped command with its single worker, leave unmapped commands alone in alphabetical position, and list unmapped workers such as sai-commit-worker and sai-direct-build-worker as lone WORKER rows before utilities so sai-commit stays a separated UTILITY row.

#### Scenario: All checklist contains boundary cardinalities
- **WHEN** the All list includes a two-worker command, lone commands, lone workers, and the split commit pair
- **THEN** apply shows both workers in RED-then-GREEN order, lone entries keep alphabetical placement, and the commit worker and commit utility remain separated

