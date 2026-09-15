# fix-stale-selector-ref Specification

## Purpose
TBD - created by archiving change disambiguate-explore-item-references. Update Purpose after archive.
## Requirements
### Requirement: Direct Build selector clause SHALL NOT cite stale item numbers
The Direct Build deterministic selection inheritance clause SHALL describe the superseded selector by its option labels instead of citing `(items 8 and 9)`, which has no valid referent in any current numbering.
#### Scenario: Stale parenthetical removed
- **WHEN** a reader follows the deterministic selection inheritance clause for the third Direct Build option
- **THEN** the clause references the earlier two-option Plan-Unattended and Manual selector descriptions and preserves the supersede-for-count-only semantics

