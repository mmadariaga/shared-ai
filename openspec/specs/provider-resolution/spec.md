# provider-resolution Specification

## Purpose
Resolve the hosting platform, repository, remote, and branch destination for provider-neutral publication without acting on ambiguous or unverified selections.

## Requirements

### Requirement: Ordered provider and repository resolution

The to-pr system SHALL resolve provider and repository using explicit input, optional `.to-pr.json` configuration, and Git remotes in that precedence order, following the shared backlog resolution patterns. Organization and project fields SHALL be passed to providers that require them. The initial unknown-host check SHALL derive recognized hosts and positive pure provider classification from the supplied provider registry rather than a separate fixed host list. Unknown addresses without positive classification or explicit or configured provider selection SHALL require clarification rather than being assumed to be GitLab. Self-hosted GitLab SHALL support explicit provider selection and complete repository URLs. Unsupported providers SHALL fail without publication.

#### Scenario: Destination is ambiguous
- **WHEN** provider or repository cannot be determined unambiguously
- **THEN** resolution requests clarification before acting.

#### Scenario: Self-hosted GitLab is selected
- **WHEN** the user explicitly selects GitLab and supplies a complete self-hosted repository URL
- **THEN** the adapter resolves its canonical project identity using glab.

#### Scenario: Registry identifies a hosted provider
- **WHEN** a repository address has a host declared by a publish-capable entry in the supplied registry and resolves unambiguously
- **THEN** resolution uses that entry and returns its provider identifier, adapter reference, and instruction reference without requiring a separate provider enumeration.

#### Scenario: Unknown host requires clarification
- **WHEN** an address has a host absent from the supplied registry, no provider classifier positively identifies it, and neither explicit input nor configuration selects a provider
- **THEN** resolution returns provider-ambiguous input with the unknown host before provider or publication operations.

#### Scenario: Azure legacy address is positively classified
- **WHEN** the supplied registry's Azure classifier identifies a supported legacy cloud repository address
- **THEN** resolution recognizes that provider without an unknown-host question or a separate fixed hostname list.

### Requirement: Provider-specific adapters and conditional instructions

The universal skill SHALL load only the selected provider's returned instruction reference, relative to its own directory. The selected registry entry SHALL supply both the instruction reference and the adapter reference. The to-pr CLI SHALL use its supplied registry for adapter selection during resolution, destination inspection, request queries, publication, and recovery, and SHALL reject an operation's provider when no matching publish-capable entry exists. GitHub operations SHALL use gh with explicit repository API endpoints; GitLab operations SHALL use glab with the resolved host and project identity. Provider reads SHALL validate repository and request identity, and failed or malformed reads SHALL block rather than prove absence. Creation SHALL use explicit source and target fields; updates SHALL write only title and description.

#### Scenario: GitHub is selected
- **WHEN** resolution selects GitHub
- **THEN** the skill loads the GitHub reference and uses its gh adapter without implicit branch pushing.

#### Scenario: GitLab is selected
- **WHEN** resolution selects GitLab
- **THEN** the skill loads the GitLab reference and uses glab against the resolved host and project.

#### Scenario: Provider query fails
- **WHEN** a required tool, authentication, or valid provider response is unavailable
- **THEN** the skill reports a concrete blocker and does not treat the failure as evidence that no request exists.

#### Scenario: Supplied registry selects the adapter
- **WHEN** a publish-capable registry entry uses a provider identifier distinct from its valid adapter filename
- **THEN** request operations use the entry's adapter rather than constructing an adapter filename from that identifier.

#### Scenario: CLI provider is absent from the supplied registry
- **WHEN** a destination operation receives a provider absent from the registry passed to the CLI
- **THEN** it blocks with Unsupported provider before provider or Git operations.

#### Scenario: Recovery uses the selected registry without publishing
- **WHEN** recovery reads a publication receipt for a provider registered in the supplied registry
- **THEN** it uses that entry's adapter to inspect and query the destination without repeating publication.

### Requirement: Unambiguous branch and remote destination

Destination selection SHALL establish one platform, repository, matching fetch/push remote, source branch, and target branch. A selected adapter's repository-equivalence operation SHALL be used when supplied; Azure equivalence SHALL compare normalized organization, project, and repository across supported HTTPS and SSH forms. Source and target branches SHALL differ. Ambiguous remotes, cross-repository branches, and uncertain target intent SHALL require clarification. A provider default branch SHALL be treated as a suggestion rather than proof of a stacked branch's intended target.

#### Scenario: Fetch and push destinations do not match
- **WHEN** no unambiguous remote has fetch and push URLs matching the selected repository
- **THEN** destination selection blocks and requests clarification.

#### Scenario: Intended target is uncertain
- **WHEN** available evidence cannot safely determine the intended target branch
- **THEN** the skill asks for target confirmation before publishing.

#### Scenario: Equivalent Azure fetch and push forms
- **WHEN** supported HTTPS and SSH URLs identify the same Azure organization, project, and repository
- **THEN** destination validation treats them as the same repository rather than comparing their raw URL strings.

### Requirement: Bounded registry adapter and instruction references

The to-pr tool SHALL accept selected adapter references only when they match `to-pr-[a-z0-9-]+\.js` and instruction references only when they match `providers/[a-z0-9-]+\.md`, with both patterns anchored to the entire reference. It SHALL reject invalid selected references before loading the selected adapter or dispatching provider operations and load valid adapters from the tool directory. This validation does not prohibit preliminary read-only Git collection by the CLI.

#### Scenario: Adapter reference escapes the allowed namespace
- **WHEN** a selected registry entry names `../to-pr-github.js` or `to-backlog-github.js` as its adapter
- **THEN** resolution and request querying reject the reference before loading the selected adapter or dispatching provider operations.

#### Scenario: Instruction reference traverses directories
- **WHEN** a selected registry entry names `../github.md` or `providers/../../github.md` as its instruction reference
- **THEN** resolution and request querying reject the reference before loading the selected adapter or dispatching provider operations.
