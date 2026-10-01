# opencode-explore-read-only Specification

## Purpose
Keep the managed opencode `explore` agent read-only through harness-enforced permissions, so the explorer's no-writes guarantee does not rest on prose alone.

## Requirements

### Requirement: The managed opencode `explore` agent MUST deny direct mutation tools.

The managed explore source SHALL project its research profile into ordered V2 permissions beginning with deny-all and granting no edit action. This action controls supported native mutation tools, including patch or edit/write alternatives. Frontmatter SHALL NOT use deprecated tools or legacy permission fields.

#### Scenario: Direct mutation tools are restricted
- **WHEN** managed explore is projected from its source
- **THEN** its ordered permissions deny the edit action without a restoring grant
- **AND** its frontmatter carries no deprecated tools field

#### Scenario: Direct mutation remains denied despite inheritance
- **WHEN** inherited configuration allows editing but the research profile is applied
- **THEN** the effective edit action remains denied

### Requirement: The managed opencode `explore` agent SHALL retain shell access and its fetch wrapper.

The managed explore source SHALL grant the V2 shell action only for contracted git grep and codegraph explore patterns rather than default unrestricted bash access. Its body SHALL preserve fetch bootstrap first, followed by profile disclosure and the canonical explore-agent policy Fetch. Profile access SHALL NOT authorize unrelated shell purposes.

#### Scenario: Research and wrapper behavior remain available
- **WHEN** the managed explore definition is projected
- **THEN** its permissions allow contracted research shell patterns and its fetch bootstrap precedes the canonical explore policy

#### Scenario: Restricted research shell remains usable
- **WHEN** shell permissions are evaluated for git grep and an unrelated mutation command
- **THEN** git grep is allowed while the unrelated mutation command is denied
