# merge-collision-metadata Specification

## Purpose
TBD: Defines synchronized metadata for ADR and DDR collision renames.

## Requirements

### Requirement: Collision plans preserve synchronized ADR and DDR labels

During the read-only ADR/DDR collision pass, the merge worker MUST return the exact old path, new path, family, assigned identifier, suffix, commit date, old H1, new H1, old index label, new index label, every canonical reference replacement, introduction anchor, introduction path, introduction commit, and full introduction timestamp for each proposed rename. The coordinator MUST record those values before executing the rename and MUST use the same family-aware identifier for filename, H1, index label, relationship token, link, and structured metadata updates.

#### Scenario: Coordinator executes a synchronized family-aware rename

- **WHEN** the worker returns a collision rename proposal with complete family-aware metadata
- **THEN** the coordinator records the supplied metadata and applies only the worker-supplied canonical replacements before its owned `git mv`.

#### Scenario: Provenance-bearing collision rename is applied

- **WHEN** the worker returns a complete collision proposal with a collision-free family-aware target and introduction provenance
- **THEN** the coordinator SHALL apply only the supplied synchronized metadata and SHALL never rename to a target occupied by another final-state record.

### Requirement: Collision metadata is incomplete

When a proposed rename lacks a required family, identifier, path, H1, index-label, canonical replacement, or introduction event, the coordinator MUST NOT reread artifacts to reconstruct presentation state from a different source. The worker MUST preserve the incomplete finding as an escalation.

#### Scenario: Incomplete collision data blocks reconstruction

- **WHEN** a proposed rename lacks one required synchronized value
- **THEN** the coordinator preserves the incomplete finding as an escalation and does not invent or reconstruct the missing value.

#### Scenario: Unresolvable introduction remains an escalation

- **WHEN** a record's introduction event or surviving identity cannot be established from the captured references and index state
- **THEN** the worker SHALL report an escalation and SHALL not invent a date, destination, or replacement identifier.

