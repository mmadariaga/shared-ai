# opencode-command-model Specification

## Purpose
TBD - created by archiving change fix-opencode-model-variant-frontmatter. Update Purpose after archive.

## Requirements

### Requirement: Single-line wrapper model rendering

All 19 opencode command wrappers SHALL declare their model in one line as a combined model with variant suffix and SHALL NOT carry a separate variant line. Values merge as-is with no renormalization.

#### Scenario: Wrapper renders combined model

- **WHEN** an opencode command wrapper is installed or read
- **THEN** its frontmatter holds a single model line with the variant suffix and no separate variant line

### Requirement: Bare model without variant

A wrapper with no variant SHALL render a bare model line with no suffix and no variant line.

#### Scenario: Variant-less wrapper stays bare

- **WHEN** a wrapper has no variant selected
- **THEN** its frontmatter holds a bare model line with no suffix and no variant line
