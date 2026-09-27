# opencode-agent-model Specification

## Purpose
TBD - created by archiving change fix-opencode-model-variant-frontmatter. Update Purpose after archive.

## Requirements

### Requirement: Single-line generic agent rendering

The three OpenCode generic agents MUST each declare a bare model identifier on the `model` line and MUST declare the selected variant on a separate `variant` line. The model line MUST NOT contain a variant suffix.

#### Scenario: Generic agent renders combined model

- **WHEN** an OpenCode generic agent file is installed or read
- **THEN** its frontmatter holds a bare model line and a separate line for its selected variant

### Requirement: Worker template combined rendering

The OpenCode worker template MUST render the model identifier on a bare `model` line and MUST render a selected variant on a separate `variant` line. When no variant is configured, the rendered worker MUST omit the variant line. Claude Code worker rendering MUST remain unchanged.

#### Scenario: Generated worker inherits combined model

- **WHEN** a managed worker file is projected from the OpenCode template and a matrix entry with a selected variant
- **THEN** the emitted file holds the entry's bare model line and a separate variant line

#### Scenario: Generated worker has no selected variant

- **WHEN** a managed OpenCode worker is generated from a matrix entry without a variant
- **THEN** its frontmatter contains the entry's bare model and no variant line

### Requirement: Matrix variant suffix values

Every OpenCode worker-matrix entry with a selected variant MUST carry that level as its `variant` value, separate from its bare `model` value. Matrix materialization MUST emit those values as separate frontmatter fields without changing the configured model or level.

#### Scenario: Matrix declares suffix values

- **WHEN** the installer reads an OpenCode worker-matrix entry with a selected variant
- **THEN** the entry declares a bare model and a separate variant value rather than a model suffix
