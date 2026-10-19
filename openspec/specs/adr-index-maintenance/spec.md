# adr-index-maintenance Specification

## Purpose

This capability governs `sai-3-implement`'s decision-record pass's post-ADR-write maintenance of the relational `docs/adr/0000-INDEX.md`. The capability is the ADR-side instantiation of the abstract surface defined in `decision-record-index-machinery`. The capability inherits the canonical section skeleton, the `<domain unit>` noun derivation procedure, the cross-cutting threshold contract, the relationship-token rules, the link-form rules, and the four index-output invariants from the abstract surface; this spec declares the three per-index bindings (storage directory, index filename, index H1), the two type-specific section headings (correction-table heading, historical-section heading), and the per-ADR behavior (entry-line form, structured-relationship-line format, correction-table header) that the abstract surface does not subsume.

This capability was previously written against hardcoded values — the storage directory `docs/adr/`, the index H1 `# ADR Index`, the mapping rules and their precedence, the fallback noun, the cross-cutting thresholds — all appeared verbatim in the spec text. This change delegates every one of those parameterizable values to the new abstract surface, where the framework values are pinned as the contractually-defined defaults for unconfigured projects.

This slice ships the abstract surface instantiated for the ADR family only. The cross-family `supersedes` rule and the cross-family `refs` / `amends` / etc. rules are part of the abstract surface and bind this slice from this point forward; their observed effect differs in this slice — the `supersedes` family-boundary restriction is dormant (no cross-family supersede exists in the corpus), while the cross-family link form and `<family>:NNNN` encoding codify behavior already present in the live ADR index, which already links to DDR records.

## Requirements

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

### Requirement: Lettered-suffix collision records

The ADR and DDR index maintenance machinery SHALL handle family-aware lettered-suffix record names produced by merge collision repair. Index entry links, relationship tokens, correction-table references, and structured index metadata SHALL resolve to the assigned identifier and preserve the record family. Incremental repair SHALL update only identifiers belonging to affected source-frontier keys and SHALL not alter unrelated historical collision groups.

#### Scenario: Index absorbs a family-aware suffixed rename

- **WHEN** a merge collision pass renames `0010-Name2.md` to `0010b-Name2.md` and supplies the ADR family identifier `0010b`
- **THEN** the index entry, canonical tokens, correction-table cells, and structured metadata reference the matching suffixed filename and identifier without changing unrelated four-digit values.

#### Scenario: Affected suffixed rename preserves index identity

- **WHEN** an affected ADR or DDR record is renamed with a family-aware suffix
- **THEN** the corresponding family index and references SHALL use the assigned suffixed identifier without changing unrelated numeric values or cross-family meaning.

### Requirement: Cross-family relationship representation is family-prefixed and family-isolated

Cross-family relationships SHALL be represented in each family's index exactly as the abstract surface's family-boundary rules define, with these concrete bindings for the two live families:

- A relationship target in the same family SHALL be encoded as a bare number (`NNNN`); a relationship target in the other family SHALL carry the explicit family prefix (`<family>:NNNN`, e.g. `refs adr:0069` in the DDR index, `refs ddr:0014` in the ADR index). A bare target therefore always means the same family, which keeps every pre-existing structured line valid.
- Entry-line annotations follow the abstract surface's relationship-token forms with the family-prefixed encoding for cross-family targets (`— Refs adr:0069`, `— **Amends** ddr:0014`).
- Correction-table rows for cross-family `amends | reframes | reverses` relationships SHALL use the cross-family link form `[NNNN](../<family>/NNNN-slug.md)` for the target cell and SHALL be written only to the source record's own family index.
- `supersedes` SHALL NOT cross families: a crossing supersedes is a classification error per the abstract surface, resolved by moving a record (reclassification), never by executing the cross.

#### Scenario: Cross-family refs annotation in the DDR index

- **WHEN** a DDR declares `refs adr:0069` via its structured line
- **THEN** the DDR index entry carries `— Refs adr:0069` with the `adr:` prefix
- **THEN** no correction-table row is added for the `refs` relationship
- **THEN** the ADR index is NOT touched

#### Scenario: Cross-family correction-table row uses the cross-family link form

- **WHEN** an ADR declares `amends ddr:0014`
- **THEN** the ADR index's correction table adds the row `[NNNN](./NNNN-slug.md) | amends | [0014](../ddr/0014-decision-summary-derived-from-artifacts-only.md)`, with the source cell in the live within-family form `[NNNN](./NNNN-slug.md)` and the target cell in the cross-family `../ddr/` link form — matching the live index's row shape, which never uses a `[NNNN_adr]`-style source cell
- **THEN** the DDR index is NOT touched

#### Scenario: Bare target means the same family

- **WHEN** a DDR's structured line declares `amends 0026`
- **THEN** the target `0026` resolves to the DDR family (the same family), not to ADR 0026
- **THEN** the correction-table row links `./0026-...md` within `docs/ddr/`

#### Scenario: Cross-family supersede from an ADR is a classification error

- **WHEN** an ADR's structured relationship line declares `supersedes ddr:NNNN`
- **THEN** the ADR maintenance cycle SHALL treat this as a classification error per the abstract surface's family-boundary rule
- **THEN** the ADR index is NOT touched, the DDR record's entry is NOT moved, and no correction-table row is added
- **THEN** the classification error is surfaced in chat so the user can reclassify the source or target record into the correct family
