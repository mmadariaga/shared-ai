# retire-docs-analysis Specification

## Purpose
Defines `/sai-retire-docs`: bounded discovery of active ADR/DDR records, evidence-ledger dispositions, and per-candidate confirmed archival of records and retired-only capability specs.

## Requirements

### Requirement: Bounded decision-record candidate discovery

The utility SHALL inspect `docs/adr/0000-INDEX.md` and `docs/ddr/0000-INDEX.md` in that order and SHALL consider only active entries before the matching historical heading. A missing or empty family index SHALL represent absence of that family, and the utility MUST NOT recursively scan either family to infer candidates.

#### Scenario: Historical and missing index entries are bounded

- **WHEN** a family index is missing or an entry appears below its historical heading
- **THEN** the utility SHALL continue without that family or entry as an active archival candidate

### Requirement: Targeted evidence correlation

The utility SHALL correlate each active record using explicit relationships, named paths, named capabilities, named changes, named commands, and narrowly targeted exact searches in related specifications or implementation paths. It MUST NOT perform a repository-wide semantic audit or run `openspec validate --specs`.

#### Scenario: Related evidence is inspected without a broad scan

- **WHEN** an active record names related specifications or implementation paths
- **THEN** the utility SHALL inspect only those bounded locations and report unresolved evidence instead of widening the search

### Requirement: Explicit candidate disposition

The utility SHALL assign exactly one disposition to every active candidate: supported, superseded, orphaned, premise-missing, conflicting, or needs-review. Unreadable, structurally invisible, malformed, dangling, ambiguous, and contradictory evidence MUST remain needs-review or otherwise active and MUST NOT be classified as obsolete.

#### Scenario: Incomplete evidence remains active

- **WHEN** a record or related specification cannot be read or its evidence is structurally unresolved
- **THEN** the utility SHALL retain the candidate and assign an active non-archival disposition

### Requirement: Confirmation-gated reversible archival

The utility SHALL remain read-only through analysis and SHALL propose archival only for superseded, orphaned, or premise-missing candidates. A related capability spec SHALL be its own candidate when it is retired-only, meaning every requirement has a confirmed active canonical home elsewhere. The utility SHALL request confirmation separately for each proposal and SHALL act only after collision checks, source-byte checks, a final reread, and reference-safety checks pass. A confirmed action SHALL be one exact-path rename into the family archive (`docs/adr/archive/`, `docs/ddr/archive/`, or `openspec/specs/_archived/<capability>/`) plus, for a decision record, the matching family-index update: its active entries removed, one entry added under the historical heading with the `./archive/<basename>` link, and other links inside that index repointed. An active reference to the candidate outside its own family index SHALL block the move.

#### Scenario: Confirmed archival passes final safeguards

- **WHEN** a user confirms an eligible record and its source, destination, bytes, and references pass final checks
- **THEN** the utility SHALL rename the record to the exact family archive path and move its index entry to the historical section, touching no other file

#### Scenario: An outside reference blocks the move

- **WHEN** another active record, spec, or card still links to a confirmed candidate
- **THEN** the utility SHALL report the reference and keep the candidate in place

#### Scenario: A retired-only capability spec is proposed on its own

- **WHEN** every requirement of a related capability spec has a confirmed active canonical home elsewhere
- **THEN** the utility SHALL propose moving it to `openspec/specs/_archived/<capability>/` behind its own confirmation
