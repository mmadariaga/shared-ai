## ADDED Requirements

### Requirement: Non-selectable group header rows

The shared raw-readline navigator SHALL accept an optional `groupHeaders` list of options that render as group header rows. A group header row SHALL show its visible text, SHALL be skipped by the cursor on start and on up/down movement like a separator, SHALL be ignored by space and Enter, and SHALL never join a selection or a bulk toggle. `promptSelect` SHALL accept an optional trailing `navigatorOptions` argument whose `groupHeaders` and `displayOptions` it forwards to the engine, where `displayOptions` gives each option's visible text, index-aligned with the options, and the resolved value stays the option string. Without `groupHeaders`, the navigator and `promptSelect` SHALL behave as before.

#### Scenario: Group headers are shown and skipped
- **WHEN** `promptSelect` runs with options whose first entry is listed in `groupHeaders` and the user presses Enter at start
- **THEN** the header text is rendered, the cursor starts on the first selectable option, and that option's value is resolved

#### Scenario: Headers never confirm
- **WHEN** the user moves up and down across a group header and confirms
- **THEN** the cursor never rests on the header and the header is never resolved

#### Scenario: Without group headers nothing changes
- **WHEN** `promptSelect` runs without `navigatorOptions`
- **THEN** it renders and resolves exactly as before
