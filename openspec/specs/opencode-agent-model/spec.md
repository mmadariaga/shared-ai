# opencode-agent-model Specification

## Purpose
TBD - created by archiving change fix-opencode-model-variant-frontmatter. Update Purpose after archive.

## Requirements

### Requirement: Single-line generic agent rendering

The three opencode generic agents SHALL declare a single model line with the variant suffix and SHALL NOT carry a separate variant line.

#### Scenario: Generic agent renders combined model

- **WHEN** an opencode generic agent file is installed or read
- **THEN** its frontmatter holds a single model line with the variant suffix and no separate variant line

### Requirement: Worker template combined rendering

The opencode worker template SHALL render model as one combined line from the model and variant suffix inputs and SHALL NOT emit a separate variant line.

#### Scenario: Generated worker inherits combined model

- **WHEN** a managed worker file is projected from the template and matrix entry
- **THEN** the emitted file holds a single model line with the variant suffix and no separate variant line

### Requirement: Matrix variant suffix values

Every opencode worker-matrix entry SHALL carry its variant as a suffix value and SHALL NOT use a separate variant line form.

#### Scenario: Matrix declares suffix values

- **WHEN** the installer reads an opencode worker-matrix entry
- **THEN** the variant appears as a suffix value and no separate variant line is declared
