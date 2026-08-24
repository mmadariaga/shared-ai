## MODIFIED Requirements

### Requirement: Lettered-suffix collision records

The ADR and DDR index maintenance machinery SHALL handle family-aware lettered-suffix record names produced by merge collision repair. Index entry links, relationship tokens, correction-table references, and structured index metadata SHALL resolve to the assigned identifier and preserve the record family.

#### Scenario: Index absorbs a family-aware suffixed rename

- **WHEN** a merge collision pass renames `0010-Name2.md` to `0010b-Name2.md` and supplies the ADR family identifier `0010b`
- **THEN** the index entry, canonical tokens, correction-table cells, and structured metadata reference the matching suffixed filename and identifier without changing unrelated four-digit values
