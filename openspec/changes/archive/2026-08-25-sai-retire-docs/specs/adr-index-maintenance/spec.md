## MODIFIED Requirements

### Requirement: Retirement analysis consumes both family index bindings

The utility SHALL consume `docs/adr/0000-INDEX.md` and `docs/ddr/0000-INDEX.md` using their established family-specific headings, link forms, and relationship structures.

#### Scenario: ADR and DDR indexes are processed in order

- **WHEN** both family indexes exist
- **THEN** the utility SHALL process ADR entries first and DDR entries second without recursively discovering additional records

### Requirement: Retirement analysis does not repair index structures

The utility SHALL report malformed or dangling active links as needs-review findings and SHALL NOT rewrite indexes, normalize specifications, or repair unrelated references.

#### Scenario: Malformed index evidence remains unchanged

- **WHEN** an active index link is malformed or points to a missing record
- **THEN** the utility SHALL report the finding and leave the index and candidate unmoved
