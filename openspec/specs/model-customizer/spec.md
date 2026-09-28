# model-customizer Specification

## Purpose
TBD - created by archiving change fix-opencode-model-variant-frontmatter. Update Purpose after archive.

## Requirements

### Requirement: Migrating frontmatter writer

The customization writer MUST accept an earlier combined `model#variant` value for an OpenCode agent and MUST write the selected agent's bare `model` and optional separate `variant` lines. It MUST remove residual top-level variant lines before writing the selected variant, so the output contains at most one such line. OpenCode command customization MUST continue to write the combined model-with-variant form. Claude Code customization MUST retain its existing model and effort format.

#### Scenario: Writer migrates legacy file

- **WHEN** an OpenCode agent with an earlier combined model value is selected for customization with a model and variant
- **THEN** its selected local file holds a bare model line and exactly one separate variant line, with no variant suffix in the model

#### Scenario: Command writer retains its format

- **WHEN** an OpenCode command is selected for customization with a model and variant
- **THEN** its model line retains the combined model-with-variant form rather than gaining a separate variant line

### Requirement: Migrating frontmatter reader

The customization settings reader MUST interpret both earlier combined `model#variant` values and separate `model` and `variant` lines as a logical model and variant selection. It MUST preserve the selected values when reporting the effective setting.

#### Scenario: Reader accepts both shapes

- **WHEN** the customizer reads an OpenCode agent with either a combined model value or separate model and variant fields
- **THEN** it resolves the intended model and variant values for the effective setting

### Requirement: Bare model for variant-less selection

An OpenCode agent customization that selects no variant MUST write a bare model line without a suffix and MUST remove any previous top-level variant line. OpenCode commands without a variant MUST retain their existing bare-model behavior.

#### Scenario: Variant-less write stays bare

- **WHEN** a model without a variant is persisted to an OpenCode agent or command markdown file
- **THEN** the file holds a bare model line with no suffix and no variant line

#### Scenario: Variant-less agent write removes an earlier variant

- **WHEN** an OpenCode agent with an existing variant is customized with a model and no selected variant
- **THEN** its selected local file contains the new bare model and no top-level variant line

### Requirement: Tunable identity across shapes

Doctor and tunable-seed comparison SHALL treat the single-line and legacy separated shapes as the same tunable, ignoring the physical difference when deciding body identity.

#### Scenario: Doctor ignores tunable shape

- **WHEN** an installed file differs from its source only in tunable lines across either shape
- **THEN** the comparison reports an exact-compatible tunable-only difference
