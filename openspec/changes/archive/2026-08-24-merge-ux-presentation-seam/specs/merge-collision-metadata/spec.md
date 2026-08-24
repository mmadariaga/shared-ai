## MODIFIED Requirements

### Requirement: Collision plans preserve synchronized ADR and DDR labels

During the read-only ADR/DDR collision pass, the merge worker MUST return the exact old path, new path, assigned suffix, commit date, old H1, new H1, old index label, and new index label for every proposed rename, and the coordinator MUST record those values before executing the rename.

#### Scenario: Coordinator executes a planned rename

- **WHEN** the worker returns a collision rename proposal with synchronized label metadata
- **THEN** the coordinator MUST use the worker-supplied path and label values for presentation state before executing the coordinator-owned `git mv`

#### Scenario: Collision metadata is incomplete

- **WHEN** a proposed rename lacks one of the required old or new label values
- **THEN** the coordinator MUST NOT reread artifacts to reconstruct presentation state from a different source
