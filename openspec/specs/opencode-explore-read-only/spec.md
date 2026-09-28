# opencode-explore-read-only Specification

## Purpose
Keep the managed opencode `explore` agent read-only through harness-enforced permissions, so the explorer's no-writes guarantee does not rest on prose alone.

## Requirements

### Requirement: The managed opencode `explore` agent MUST deny direct mutation tools.

The source frontmatter SHALL declare `permission.edit: deny`, which gates opencode's `write`, `edit`, and `apply_patch` tools. It SHALL NOT use the deprecated `tools` field.

#### Scenario: Direct mutation tools are restricted

- **WHEN** the managed `explore` agent is projected from its source definition
- **THEN** its frontmatter declares `edit: deny` under `permission`
- **AND** its frontmatter carries no `tools` field

### Requirement: The managed opencode `explore` agent SHALL retain shell access and its fetch wrapper.

The source frontmatter SHALL leave `bash` at opencode's default, which permits it, and the post-frontmatter body SHALL preserve the existing fetch bootstrap followed by `Fetch @sai/policies/explore-agent.md`.

#### Scenario: Research and wrapper behavior remain available

- **WHEN** the managed `explore` source definition is read
- **THEN** its `permission` block does not deny `bash` and the existing fetch-wrapper directives remain in their original order
