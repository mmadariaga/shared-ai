# to-backlog-provider-resolution Specification

## Purpose
Resolve the backlog provider and destination from ordered evidence through a registry-driven Node tool without guessing ambiguous choices.

## Requirements

### Requirement: Ordered deterministic destination resolution

The Node resolver SHALL accept destination objects containing only nonempty string provider, repository, and Project fields. Explicit fields SHALL override optional working-directory `.to-backlog.json` configuration fields, and registered Git remote detection SHALL supply unresolved provider or repository choices. An explicit repository address identifying one registered provider SHALL take precedence over a configured provider. Remote addresses SHALL be parsed as data and duplicate provider-repository candidates SHALL be deduplicated.

#### Scenario: Explicit destination precedence

- **WHEN** explicit destination fields differ from configured defaults
- **THEN** resolution uses the explicit fields rather than the conflicting defaults.

#### Scenario: Equivalent remote addresses

- **WHEN** SSH and HTTPS remotes identify the same registered repository
- **THEN** resolution treats them as one provider-repository candidate.

### Requirement: Unsupported and ambiguous destinations

The resolver SHALL return unsupported for an explicitly requested provider without publication capability before probing Git or gh, even when its repository address identifies GitHub. It SHALL NOT substitute a supported provider. Missing or ambiguous provider and repository choices, unrecognized destination addresses, and provider-address conflicts SHALL return clarification results instead of invented destinations.

#### Scenario: Unsupported explicit provider

- **WHEN** the user explicitly requests Jira with a GitHub repository address
- **THEN** resolution returns unsupported for Jira without selecting GitHub or probing Git or gh.

#### Scenario: Ambiguous repository candidates

- **WHEN** remote detection yields more than one repository for the selected provider
- **THEN** resolution returns the candidates for clarification rather than selecting one.

#### Scenario: Mixed recognized and unknown remote hosts

- **WHEN** no higher-priority provider is selected and remotes include an unregistered host
- **THEN** resolution requests provider clarification rather than treating the recognized host as conclusive.

### Requirement: External provider registry and isolated adapters

Provider host detection rules, supported operation capabilities, instruction references, and adapter filenames SHALL reside in the external registry. The common resolver SHALL dispatch registered operations to isolated Node adapters without provider-specific branches. GitHub SHALL be the only publication provider shipped by this change.

#### Scenario: Registered provider extension

- **WHEN** a provider entry supplies host rules, operation capabilities, an instruction reference, and an adapter
- **THEN** common resolution can identify that provider without adding a provider-specific resolver condition.

### Requirement: Origin-update provider operations

The to-backlog provider registry SHALL declare read-update, query-update, update, and recover-update capabilities for the shipped GitHub adapter alongside its existing creation capabilities. It SHALL supply a separate updateInstructions reference for GitHub update mechanics. The common CLI SHALL accept these update operations and dispatch them through the existing registry capability and adapter validation seam, treating no_changes as a successful result. Existing resolve, query, publish, and recover operations SHALL remain available for creation.

#### Scenario: Registered GitHub update

- **WHEN** the CLI receives a GitHub update operation declared by the registry
- **THEN** it dispatches to the corresponding isolated adapter operation rather than running creation publication.

#### Scenario: Verified no-op CLI result

- **WHEN** the adapter returns no_changes for an update request
- **THEN** the CLI returns that result with a successful exit status.

#### Scenario: Creation compatibility

- **WHEN** a conversation without an origin uses the existing resolver and creation operations
- **THEN** the existing registry-driven resolve, query, publish, and recover path remains available.

### Requirement: Origin-driven update reference resolution

The update branch SHALL select provider mechanics from the originating issue reference rather than creation destination defaults. The shipped GitHub provider SHALL accept supported full github.com issue URLs and domainless /owner/repo/issues/123 references through the existing issue-reference normalizer. Missing provider or reference components SHALL require clarification without guessing from remotes, configuration, or incidental links. Unsupported providers and invalid references SHALL block update without creating a replacement issue. The selected provider's updateInstructions SHALL be loaded before origin inspection.

#### Scenario: Concrete partial reference

- **WHEN** the originating reference is /owner/repo/issues/123
- **THEN** the update branch selects GitHub update mechanics and resolves the concrete issue without requiring a Project.

#### Scenario: Missing reference components

- **WHEN** the starting reference omits information needed to identify one issue
- **THEN** the workflow asks for that information without filling it from creation defaults or later reference links.

#### Scenario: Unsupported origin provider

- **WHEN** the originating issue belongs to a provider without update mechanics
- **THEN** update stops with the blocker instead of substituting GitHub or creating another issue.
