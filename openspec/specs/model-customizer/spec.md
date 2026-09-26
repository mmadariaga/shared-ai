# model-customizer Specification

## Purpose
TBD - created by archiving change fix-opencode-model-variant-frontmatter. Update Purpose after archive.

## Requirements

### Requirement: Migrating frontmatter writer

The customizer and installer writers SHALL accept the legacy separated variant form on read and SHALL always emit the single-line model form on write, removing any residual variant lines.

#### Scenario: Writer migrates legacy file

- **WHEN** a legacy markdown file with a separate variant line is patched or spliced
- **THEN** the result holds a single model line with the variant suffix and no variant line

### Requirement: Migrating frontmatter reader

The settings readers SHALL parse the canonical single-line model suffix form and SHALL fall back to the legacy separated variant line during migration, splitting the suffix back into the logical model and variant pair for preset JSON.

#### Scenario: Reader accepts both shapes

- **WHEN** frontmatter in either the single-line or legacy separated shape is read
- **THEN** the resolved logical model and variant match the declared selection

### Requirement: Bare model for variant-less selection

A selection without a variant SHALL be written as a bare model line with no suffix and no variant line.

#### Scenario: Variant-less write stays bare

- **WHEN** a model without a variant is persisted to markdown
- **THEN** the file holds a bare model line with no suffix and no variant line

### Requirement: Tunable identity across shapes

Doctor and tunable-seed comparison SHALL treat the single-line and legacy separated shapes as the same tunable, ignoring the physical difference when deciding body identity.

#### Scenario: Doctor ignores tunable shape

- **WHEN** an installed file differs from its source only in tunable lines across either shape
- **THEN** the comparison reports an exact-compatible tunable-only difference
