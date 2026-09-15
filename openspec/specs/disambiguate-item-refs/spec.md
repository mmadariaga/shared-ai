# disambiguate-item-refs Specification

## Purpose
TBD - created by archiving change disambiguate-explore-item-references. Update Purpose after archive.
## Requirements
### Requirement: Crystallization citations SHALL resolve by name
Citations in the crystallization steps that previously used bare `item N` SHALL name the target protocol or gate so a reader does not resolve them against global instructions numbering.
#### Scenario: Single-change protocol cites the language gate by name
- **WHEN** a reader follows the single-change crystallization protocol reference to the language gate
- **THEN** the text names the crystallization language gate in crystallization-language-gates.md as step-local item 8 rather than writing bare `item 8`

### Requirement: Local step numbers SHALL carry scope notes
The step-local `8.` header in crystallization-language-gates.md SHALL be retained and SHALL carry a scope note stating it is step-local within the crystallization sequence and not instructions.md item 8.
#### Scenario: Language gate header states its scope
- **WHEN** a reader opens the crystallization language gate header
- **THEN** the header states its step-local scope and preserves existing gate semantics with no behavior change

### Requirement: Global instruction numbering SHALL remain unchanged
The implementation SHALL NOT renumber global instructions.md items 4-11 and SHALL limit wording changes to the four crystallization step files.
#### Scenario: Global numbering preserved
- **WHEN** the four step files are compared against instructions.md items 4 through 11
- **THEN** the global item numbers and order are identical before and after the change

