## MODIFIED Requirements

### Requirement: Cross-family relationship representation is family-prefixed and family-isolated

Cross-family relationships SHALL preserve explicit `adr:` or `ddr:` prefixes in relationship tokens, relative Markdown links, correction-table cells, and structured `adr-index` or `ddr-index` metadata. Bare references SHALL resolve only when the source-family context is reliable; ambiguous bare references MUST be reported as escalations and MUST NOT receive an invented suffix or destination.

#### Scenario: Cross-family metadata remains explicit

- **WHEN** a collision repair updates a DDR reference to an ADR record
- **THEN** the resulting relationship token, relative link, correction-table cell, and structured metadata retain the `adr:` family prefix and the assigned identifier
