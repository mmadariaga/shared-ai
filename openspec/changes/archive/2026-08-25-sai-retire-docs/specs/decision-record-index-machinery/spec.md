## MODIFIED Requirements

### Requirement: Retire-docs preserves canonical index section boundaries

The utility SHALL recognize the canonical active and historical section boundaries for ADR and DDR indexes and SHALL not treat historical entries as active candidates.

#### Scenario: Historical records are excluded

- **WHEN** an index contains a matching historical heading
- **THEN** entries below that heading SHALL be excluded from the active candidate set

### Requirement: Relationship tokens remain family-isolated

The utility SHALL interpret unprefixed numeric relationships within the record's own family, require explicit `adr:` or `ddr:` prefixes for cross-family relationships, and SHALL retain unresolved cross-family or dangling relationships as review evidence.

#### Scenario: Cross-family ambiguity is not repaired

- **WHEN** a relationship cannot be resolved to a valid record in its declared family
- **THEN** the utility SHALL report the unresolved relationship and keep the affected candidate active
