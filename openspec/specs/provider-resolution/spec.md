# provider-resolution Specification

## Purpose
Resolve the hosting platform, repository, remote, and branch destination for provider-neutral publication without acting on ambiguous or unverified selections.

## Requirements

### Requirement: Ordered provider and repository resolution

The to-pr system SHALL resolve provider and repository using explicit input, optional `.to-pr.json` configuration, and Git remotes in that precedence order, following the shared backlog resolution patterns. Unknown hosts without explicit provider selection SHALL require clarification rather than being assumed to be GitLab. Self-hosted GitLab SHALL support explicit provider selection and complete repository URLs. Unsupported providers SHALL fail without publication.

#### Scenario: Destination is ambiguous
- **WHEN** provider or repository cannot be determined unambiguously
- **THEN** resolution requests clarification before acting.

#### Scenario: Self-hosted GitLab is selected
- **WHEN** the user explicitly selects GitLab and supplies a complete self-hosted repository URL
- **THEN** the adapter resolves its canonical project identity using glab.

### Requirement: Provider-specific adapters and conditional instructions

The universal skill SHALL load only the selected provider's instructions. GitHub operations SHALL use gh with explicit repository API endpoints; GitLab operations SHALL use glab with the resolved host and project identity. Provider reads SHALL validate repository and request identity, and failed or malformed reads SHALL block rather than prove absence. Creation SHALL use explicit source and target fields; updates SHALL write only title and description.

#### Scenario: GitHub is selected
- **WHEN** resolution selects GitHub
- **THEN** the skill loads the GitHub reference and uses its gh adapter without implicit branch pushing.

#### Scenario: GitLab is selected
- **WHEN** resolution selects GitLab
- **THEN** the skill loads the GitLab reference and uses glab against the resolved host and project.

#### Scenario: Provider query fails
- **WHEN** a required tool, authentication, or valid provider response is unavailable
- **THEN** the skill reports a concrete blocker and does not treat the failure as evidence that no request exists.

### Requirement: Unambiguous branch and remote destination

Destination selection SHALL establish one platform, repository, matching fetch/push remote, source branch, and target branch. Source and target branches SHALL differ. Ambiguous remotes, cross-repository branches, and uncertain target intent SHALL require clarification. A provider default branch SHALL be treated as a suggestion rather than proof of a stacked branch's intended target.

#### Scenario: Fetch and push destinations do not match
- **WHEN** no unambiguous remote has fetch and push URLs matching the selected repository
- **THEN** destination selection blocks and requests clarification.

#### Scenario: Intended target is uncertain
- **WHEN** available evidence cannot safely determine the intended target branch
- **THEN** the skill asks for target confirmation before publishing.
