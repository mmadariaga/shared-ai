# bounded-search-permission Specification

## Purpose
Bounded scoped project lookups for sai-3-implement research gaps when tasks.md context is insufficient.
## Requirements
### Requirement: Batch permission request for research gaps

The worker SHALL request scoped project lookups in ONE batch permission before stopping when one or more convention gaps exist, with one line per gap in the fixed area plus reason plus Step shape and a per-item decision inside the batch, capped at 5 areas per batch.

#### Scenario: Multi-gap batch request

- **WHEN** the worker finds convention gaps that tasks.md does not nail down
- **THEN** it requests all gaps in one batch permission with one fixed-shape line per gap

### Requirement: Functional area identity for lookup targets

Each lookup target SHALL be a functional area or concept and SHALL never be an exact path, because a known exact path would already belong in Required Documentation.

#### Scenario: Area stays functional

- **WHEN** the worker phrases a batch line for a gap
- **THEN** the target names a functional area or concept rather than an exact path

### Requirement: Explorer-only resolution with bounded verbatim evidence

Area-to-file resolution SHALL be delegated to budget-explorer ONLY, and the worker SHALL never broaden scope itself and SHALL never run Grep or Glob itself; budget-explorer SHALL return ONLY bounded verbatim path:start-end citations with no summary, at most 3 citations per area and at most 20 lines per citation, project-root confined and read-only, with path literals in English.

#### Scenario: Bounded citation evidence

- **WHEN** a batch item is approved and resolved
- **THEN** budget-explorer returns only bounded verbatim citations within the area, evidence, and cap bounds

### Requirement: Limited full reads and denial fallback

Later full reads SHALL stay limited to the approved returned files with no new file opened outside that approval, and a denied item SHALL become a `needs_input` question about that convention with no guessing and no broad search while approved items proceed on their citations.

#### Scenario: Denied item keeps stop behavior

- **WHEN** a batch item is denied
- **THEN** that item becomes a `needs_input` question about that convention with no guessing and no broad search

### Requirement: Fast-track auto-approval within the same bounds

Under fast-track the permission SHALL be auto-approved but SHALL keep the same area, evidence, and cap bounds.

#### Scenario: Fast-track keeps bounds

- **WHEN** the run carries fast-track with convention gaps
- **THEN** the permission is auto-approved within the unchanged area, evidence, and cap bounds

### Requirement: Research contract pointer consistency

The closed-allowlist statements in common.md and documentation-review.md SHALL cite the plan-generation research_task section 2 bounded batch permission as the sole exception, via budget-explorer only with per-item approval.

#### Scenario: Pointers cite the sole exception

- **WHEN** a consumer reads the research boundaries in common.md or documentation-review.md
- **THEN** the text points to the section 2 bounded batch permission as the only scoped-lookup path

