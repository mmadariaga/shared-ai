# model-customizer-labels Specification

## Purpose
TBD - created by archiving change reorder-model-customizer. Update Purpose after archive.
## Requirements
### Requirement: Command family displays as ORCHESTRATOR
The checklist SHALL render the command family TYPE as ORCHESTRATOR in every row while keeping the stable command: selection value and parseTarget behavior unchanged, and any other family SHALL render as its uppercase name.

#### Scenario: Checklist renders a command row
- **WHEN** a command target is rendered in the checklist
- **THEN** its TYPE cell shows ORCHESTRATOR while its confirmed value remains the stable command identity

### Requirement: TYPE column width is twelve
The header and every row SHALL size the TYPE column to twelve characters, with the header titles and dash separator aligned to the same widths as the row columns.

#### Scenario: Checklist renders its header and rows
- **WHEN** the checklist header and rows are rendered
- **THEN** TYPE, TARGET, TASK COMPLEXITY, and SETTING columns stay aligned at the widened TYPE width without changing setting text

