## MODIFIED Requirements

### Requirement: The managed opencode `explore` agent MUST deny direct mutation tools.

The source frontmatter SHALL declare `tools.write: false` and `tools.edit: false`.

#### Scenario: Direct mutation tools are restricted

- **WHEN** the managed `explore` agent is projected from its source definition
- **THEN** its frontmatter declares `write` and `edit` as false under `tools`

### Requirement: The managed opencode `explore` agent SHALL retain shell access and its fetch wrapper.

The source frontmatter SHALL declare `tools.bash: true`, and the post-frontmatter body SHALL preserve the existing fetch bootstrap followed by `Fetch @sai/policies/explore-agent.md`.

#### Scenario: Research and wrapper behavior remain available

- **WHEN** the managed `explore` source definition is read
- **THEN** `bash` is true and the existing fetch-wrapper directives remain in their original order
