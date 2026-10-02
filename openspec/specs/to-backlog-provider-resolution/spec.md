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
