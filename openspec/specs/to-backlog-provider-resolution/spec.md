# to-backlog-provider-resolution Specification

## Purpose
Resolve the backlog provider and destination from ordered evidence through a registry-driven Node tool without guessing ambiguous choices.

## Requirements

### Requirement: Ordered deterministic destination resolution

The Node resolver SHALL accept destination objects containing only nonempty string provider, repository, project, and organization fields. Explicit fields SHALL override optional working-directory `.to-backlog.json` configuration fields, and registered Git remote detection SHALL supply unresolved destination choices. An explicit repository address identifying one registered provider SHALL take precedence over a configured provider. Remote addresses SHALL be parsed as data and duplicate provider-repository candidates SHALL be deduplicated. Positive provider-owned classification SHALL take precedence over host fallback; otherwise registered host matches SHALL take precedence over provider-owned fallback candidates. When a selected provider declares `resolution: provider`, the common resolver SHALL delegate destination resolution before shared host-compatibility or repository checks, passing the unchanged explicit fields, configuration fields, and raw remote addresses.

#### Scenario: Explicit destination precedence
- **WHEN** explicit destination fields differ from configured defaults
- **THEN** resolution uses the explicit fields rather than the conflicting defaults.

#### Scenario: Equivalent remote addresses
- **WHEN** SSH and HTTPS remotes identify the same registered repository through host-based resolution
- **THEN** resolution treats them as one provider-repository candidate.

#### Scenario: Selected provider owns compatibility
- **WHEN** an explicitly or configurationally selected publication provider declares provider-owned resolution
- **THEN** its resolver receives the unchanged destination inputs before shared host-compatibility or repository checks.

#### Scenario: Registered GitHub address retains priority
- **WHEN** an explicit repository address identifies GitHub and another registered provider offers provider-owned fallback resolution
- **THEN** the registered GitHub host match selects GitHub rather than the fallback provider.

#### Scenario: Provider classifies a variable cloud address
- **WHEN** one registered provider's pure classifier positively identifies a supported address
- **THEN** detection selects that provider before host fallback without requiring a separate host enumeration.

### Requirement: Unsupported and ambiguous destinations

The resolver SHALL return unsupported for an explicitly requested provider without publication capability before probing Git or a provider CLI, even when its repository address identifies GitHub. It SHALL NOT substitute a supported provider. Missing or ambiguous provider and repository choices, unrecognized destination addresses, and host-based provider-address conflicts SHALL return clarification results instead of invented destinations. For parsed addresses without positive provider classification or registered host matches, providers declaring `resolution: provider` without provider-owned classification SHALL be fallback candidates. Providers using pure classification SHALL NOT become unknown-address fallback candidates. Multiple provider candidates SHALL require clarification rather than arbitrary selection. Delegated clarification and unsupported outcomes SHALL retain their fields and SHALL NOT authorize publication.

#### Scenario: Unsupported explicit provider
- **WHEN** the user explicitly requests Jira with a GitHub repository address
- **THEN** resolution returns unsupported for Jira without selecting GitHub or probing Git or gh.

#### Scenario: Ambiguous repository candidates
- **WHEN** remote detection yields more than one repository for the selected host-based provider
- **THEN** resolution returns the candidates for clarification rather than selecting one.

#### Scenario: Mixed recognized and unknown remote hosts
- **WHEN** no higher-priority provider is selected and remotes include an unregistered host without provider-owned fallback candidates
- **THEN** resolution requests provider clarification rather than treating the recognized host as conclusive.

#### Scenario: Mixed registered and delegated providers
- **WHEN** remotes identify GitHub and a distinct provider-owned fallback candidate without a higher-priority selected provider
- **THEN** resolution requests provider clarification rather than choosing either provider.

#### Scenario: Delegated outcome does not publish
- **WHEN** a selected provider resolver returns a clarification or unsupported outcome
- **THEN** the shared helper forwards that outcome with registry-selected metadata without calling publication.

### Requirement: External provider registry and isolated adapters

Provider host detection rules, supported operation capabilities, instruction references, adapter filenames, optional provider-owned resolution mode, and optional provider-owned classification SHALL reside in the external registry. The common resolver SHALL dispatch registered operations to isolated Node adapters without provider-specific destination branches. A provider declaring `resolution: provider` MAY omit `hosts` and SHALL export `resolve({ explicit, config, remotes }, io)` for destination resolution. A provider declaring `classification: provider` SHALL export a pure `classify(address)` returning `match` or null. Provider adapter filenames SHALL match `to-backlog-[a-z0-9-]+.js`, and provider instruction references SHALL match `providers/[a-z0-9-]+.md` before production adapter loading. The shipped publication registry SHALL retain GitHub and GitLab and add Azure DevOps with provider-owned resolution and classification, separate creation and update instructions, and query, publish, recover, read-update, query-update, update, and recover-update capabilities.

#### Scenario: Registered provider extension
- **WHEN** a provider entry supplies host rules, operation capabilities, an instruction reference, and an adapter
- **THEN** common resolution can identify that provider without adding a provider-specific resolver condition.

#### Scenario: Provider-owned extension without hosts
- **WHEN** a publication provider declares provider-owned resolution without a host list and is selected for an unmatched address
- **THEN** the common helper calls its resolver with raw destination inputs rather than enforcing a shared host catalogue.

#### Scenario: Invalid instruction reference
- **WHEN** a selected publication provider supplies an instruction reference outside the permitted provider-reference filename pattern
- **THEN** the common helper rejects that reference before loading the provider adapter.

#### Scenario: Shipped GitLab operations
- **WHEN** the CLI receives a declared GitLab creation or origin-update operation
- **THEN** registry dispatch loads the GitLab adapter and applicable instructions while preserving the existing GitHub operations.

#### Scenario: Shipped Azure operations
- **WHEN** the CLI receives a declared Azure DevOps creation or origin-update operation
- **THEN** registry dispatch loads the Azure adapter and the applicable creation or update instructions.

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

The update branch SHALL select provider mechanics from the originating issue reference rather than creation destination defaults. The common `resolve-origin` operation SHALL select from the same registry using an explicitly supplied provider, registered domainless origin support, or address detection with pure provider classification and host/fallback rules. It SHALL require exactly one update-capable provider and a validated updateInstructions reference. The shipped GitHub provider SHALL accept supported full github.com issue URLs and domainless /owner/repo/issues/123 references through the existing issue-reference normalizer. The shipped GitLab provider SHALL resolve complete `/-/issues/N` URLs through glab using the reference's project and hostname. The Azure provider SHALL require a complete Services work-item URL for update. Missing provider or reference components SHALL require clarification without guessing from remotes, configuration, or incidental links. Unsupported providers and invalid references SHALL block update without creating a replacement issue. The selected provider's updateInstructions SHALL be loaded before origin inspection.

#### Scenario: Concrete partial reference
- **WHEN** the originating reference is /owner/repo/issues/123
- **THEN** the update branch selects GitHub update mechanics and resolves the concrete issue without requiring a Project.

#### Scenario: Missing reference components
- **WHEN** the starting reference omits information needed to identify one issue
- **THEN** the workflow asks for that information without filling it from creation defaults or later reference links.

#### Scenario: Unsupported origin provider
- **WHEN** the originating issue belongs to a provider without update mechanics
- **THEN** update stops with the blocker instead of substituting GitHub or creating another issue.

#### Scenario: Complete GitLab origin
- **WHEN** an originating issue has a complete GitLab URL without a registered host match
- **THEN** the update branch loads GitLab update mechanics and resolves that exact origin without selecting a creation destination or board.

#### Scenario: Azure origin selection
- **WHEN** a complete supported current or legacy Services work-item URL identifies the origin
- **THEN** resolve-origin returns the Azure registry entry's update instructions without selecting a creation destination.

### Requirement: Read-only delegated destination resolution contract

Provider-owned destination resolution SHALL use `io.run(command, args, input)` for read-only CLI resolution with arguments and content passed as data. The shared helper SHALL preserve the delegated result fields and attach the selected registry provider, instruction reference, and adapter filename. A delegated `provider-ambiguous`, `repository-ambiguous`, or `destination-ambiguous` clarification SHALL allow the CLI wrapper to collect Git remotes and repeat resolution. Resolution SHALL grant no publication authority. The skill SHALL load only the selected provider's instructions and expose the extension contract through its separate `providers/resolution.md` reference. Existing universal skill projections SHALL install that reference for Claude Code and opencode without adding direct provider-CLI permission grants.

#### Scenario: Read-only IO reaches the resolver
- **WHEN** a selected provider resolver uses its supplied IO to resolve a raw destination through a CLI
- **THEN** the command receives separate data arguments and the shared helper returns the result with selected registry metadata.

#### Scenario: Resolver needs remotes
- **WHEN** delegated resolution returns provider-ambiguous or repository-ambiguous clarification
- **THEN** the CLI wrapper collects Git remote addresses and invokes resolution again with those addresses.

#### Scenario: Both harnesses receive the extension reference
- **WHEN** installation projections are expanded for Claude Code and opencode
- **THEN** both include the destination-resolution reference while retaining helper-based permissions without direct provider-CLI grants.

#### Scenario: Azure destination needs remotes
- **WHEN** delegated resolution returns destination-ambiguous
- **THEN** the CLI wrapper collects remote addresses and repeats read-only destination resolution.
