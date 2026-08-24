## MODIFIED Requirements

### Requirement: Collision plans preserve synchronized ADR and DDR labels

During the read-only ADR/DDR collision pass, the merge worker MUST return the exact old path, new path, family, assigned identifier, suffix, commit date, old H1, new H1, old index label, new index label, and every canonical reference replacement for each proposed rename. The coordinator MUST record those values before executing the rename and MUST use the same family-aware identifier for filename, H1, index label, relationship token, link, and structured metadata updates.

#### Scenario: Coordinator executes a synchronized family-aware rename

- **WHEN** the worker returns a collision rename proposal with complete family-aware metadata
- **THEN** the coordinator records the supplied metadata and applies only the worker-supplied canonical replacements before its owned `git mv`

### Requirement: Collision metadata is incomplete

When a proposed rename lacks a required family, identifier, path, H1, index-label, or canonical replacement value, the coordinator MUST NOT reread artifacts to reconstruct presentation state from a different source.

#### Scenario: Incomplete collision data blocks reconstruction

- **WHEN** a proposed rename lacks one required synchronized value
- **THEN** the coordinator preserves the incomplete finding as an escalation and does not invent or reconstruct the missing value
