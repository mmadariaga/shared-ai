# from-backlog-provider-resolution Specification

## Purpose
Resolve concrete GitHub issue references and retrieve complete original issue data through separate registry-selected read-only mechanics.

## Requirements

### Requirement: Registry-selected concrete GitHub references

The common helper SHALL select a read-capable provider from the from-backlog registry and return its provider identifier, instruction reference, adapter, repository, number, and canonical URL on successful reference resolution. Registered host matches SHALL take precedence over provider-owned fallback candidates. A complete URL without a registered host match SHALL use providers declaring `resolution: provider` as fallback candidates, and selection SHALL require exactly one candidate. Domainless references SHALL require an explicit `domainless` registry declaration. The shipped registry SHALL support github.com and domainless `/owner/repo/issues/123` references through GitHub, and complete GitLab issue URLs through a GitLab entry declaring `resolution: provider` without a host catalogue. Host-based GitHub full URLs SHALL use HTTPS without credentials or custom ports; query parameters and fragments SHALL NOT change issue identity. Host-based GitHub incomplete paths, pull-request paths, and invalid issue numbers SHALL be rejected without search or guessing. A selected provider-owned resolver SHALL receive the trimmed raw reference and SHALL own protocol, credential, port, and issue-path compatibility validation.

#### Scenario: Equivalent concrete references

- **WHEN** a supported full GitHub issue URL or domainless issue path includes query parameters or a fragment
- **THEN** resolution returns the same canonical issue URL without those additions and selects the GitHub provider reference.

#### Scenario: Unsupported or incomplete reference

- **WHEN** the shipped registry receives an incomplete issue reference, a pull-request path, or a reference rejected by the selected provider's compatibility checks
- **THEN** resolution returns an explicit rejection without searching for or guessing an issue.

#### Scenario: Registered GitHub host beats fallback

- **WHEN** a GitHub issue URL is supplied with both the GitHub entry and a provider-owned fallback entry registered
- **THEN** the helper selects GitHub rather than delegating the reference to the fallback provider.

#### Scenario: Unknown host delegates compatibility

- **WHEN** a complete URL with a custom port has no registered host match and exactly one read-capable provider-owned fallback
- **THEN** the helper passes the trimmed original URL to that provider's resolver instead of applying GitHub compatibility restrictions.

#### Scenario: Multiple fallback providers

- **WHEN** an unmatched URL selects more than one read-capable provider-owned fallback
- **THEN** the helper rejects the reference as not selecting exactly one registered provider.

#### Scenario: Shipped GitLab reference

- **WHEN** a complete GitLab `/-/issues/N` URL has no registered host match
- **THEN** the shipped registry selects GitLab's provider-owned resolver and returns its canonical issue provenance.

### Requirement: Conditional provider mechanics and separate import helpers

The skill SHALL load provider instructions only after resolving the provider and SHALL expose provider-extension guidance through the separate `providers/resolution.md` reference. The common from-backlog helper and its separate GitHub adapter SHALL implement import mechanics without repurposing to-backlog publication helpers. Production provider instruction and adapter references SHALL be validated before loading. Default providers SHALL retain the existing `normalize(value)` path; providers declaring `resolution: provider` SHALL use `resolve(value, io)` instead. The shared helper SHALL attach registry-selected provider, instruction, and adapter metadata to returned outcomes.

#### Scenario: Resolve before provider disclosure

- **WHEN** a GitHub reference resolves successfully
- **THEN** the skill loads the registry-selected GitHub mechanics and uses the separate from-backlog read operation.

#### Scenario: Delegated resolver receives IO

- **WHEN** a selected read-capable provider declares provider-owned resolution
- **THEN** the helper calls its resolve operation with the trimmed reference and supplied IO instead of its normalizer.

#### Scenario: Invalid adapter reference

- **WHEN** a provider entry names an adapter outside the permitted from-backlog adapter filename pattern
- **THEN** production adapter loading rejects the entry rather than loading the referenced path.

### Requirement: Structured read-only GitHub issue retrieval

The GitHub adapter SHALL use structured `gh api graphql` queries against github.com with separate arguments, JSON input, and no shell interpretation. It SHALL identify the retrieved item type and reject pull requests even when supplied through an issue-number path. Readable closed issues and issues in archived repositories SHALL be supported, and their states SHALL be returned without requiring GitHub Projects access or publication permissions.

#### Scenario: Pull request supplied as an issue number

- **WHEN** the resolved issue-number path identifies a pull request
- **THEN** retrieval rejects the item as not an issue before loading its comments.

#### Scenario: Readable closed issue in an archived repository

- **WHEN** GitHub returns a readable closed issue from an archived repository
- **THEN** retrieval returns its original title and description together with the closed and archived states.

### Requirement: Complete paginated comments and explicit failures

Retrieval SHALL preserve original title, description, and comment text as structured data. It SHALL retrieve every comment page and retain comment identifiers, source links, and authors, representing a missing author explicitly. Missing or repeated cursors, repeated or malformed comments, malformed responses, authentication or access errors, and command or buffer failures SHALL produce explicit outcomes. The helper SHALL distinguish `complete`, `incomplete`, and `error`; a failure after retrieving an issue SHALL retain the retrieved parts without reporting completion.

#### Scenario: Multiple comment pages

- **WHEN** an issue's comment connection spans multiple pages
- **THEN** retrieval follows all valid cursors and returns every original comment before reporting complete.

#### Scenario: Later page cannot be retrieved

- **WHEN** a comment-page request fails after the issue and earlier comments were retrieved
- **THEN** retrieval returns incomplete with the retrieved parts and concrete failure rather than silently shortening the comment list.

### Requirement: Missing description is represented without reconstruction

The adapter SHALL return the original description and a missing-description indicator derived from its emptiness. It SHALL NOT replace an empty description with comment content.

#### Scenario: Issue has an empty body and comments

- **WHEN** an issue has an empty description but readable comments
- **THEN** structured retrieval preserves the empty description, marks it missing, and returns comments separately.

### Requirement: Read-only delegated reference outcomes

Provider-owned reference resolution SHALL use `io.run(command, args, input)` for read-only CLI resolution with inputs passed as data. The helper SHALL preserve delegated outcome fields and attach selected registry metadata. The read CLI SHALL call the provider's read operation only after resolution returns `resolved`; every other resolution outcome SHALL be returned without retrieving issue content and with an unsuccessful exit status. Provider-resolution extension references SHALL be installed by existing universal skill projections for Claude Code and opencode using existing helper permissions without a direct provider-CLI grant.

#### Scenario: Delegated reference resolves successfully

- **WHEN** a delegated resolver returns a resolved canonical reference
- **THEN** the helper preserves its reference fields, attaches selected registry metadata, and permits the read operation to continue.

#### Scenario: Clarification prevents retrieval

- **WHEN** a delegated resolver returns needs_input with candidate references
- **THEN** the read CLI returns that outcome and metadata without calling read and exits unsuccessfully.

#### Scenario: Unsupported reference prevents retrieval

- **WHEN** a delegated resolver returns unsupported with an incompatibility explanation
- **THEN** the read CLI preserves that explanation and selected metadata without calling read and exits unsuccessfully.

#### Scenario: Both harnesses receive the extension reference

- **WHEN** installation projections are expanded for Claude Code and opencode
- **THEN** both include the reference-resolution guidance while retaining existing read-only helper permissions.

### Requirement: Structured GitLab issue and comment import

The GitLab read adapter SHALL resolve a complete HTTP or HTTPS `/-/issues/N` URL through authenticated `glab repo view --output json`, reject credentials and invalid issue numbers, and use the resolved project identity and hostname for structured `glab api` reads. It SHALL verify issue identity and issue-only type, preserve title and description as data, represent a null description as empty, and return canonical provenance, issue state, and repository archived state. It SHALL read all note pages in ascending identifier order, exclude system activity notes, retain original user-comment text and source links, represent unknown authors explicitly, and reject malformed or repeated comments. Retrieval SHALL perform no remote mutation. Authentication, permission, compatibility, or pagination failures SHALL retain the same provider and destination; failures after issue retrieval SHALL return incomplete with all retrieved parts.

#### Scenario: Complete paginated GitLab import

- **WHEN** glab returns a readable GitLab issue and multiple pages of notes, including system notes and unknown authors
- **THEN** import returns the original issue content, canonical provenance and states, and every user comment in order without including system activity or performing a mutation.

#### Scenario: Later GitLab comment page fails

- **WHEN** a note-page request fails after the issue and earlier comments have been retrieved
- **THEN** import reports incomplete with the concrete error and preserves the issue and already retrieved comments without switching provider or destination.

#### Scenario: GitLab project resolution fails

- **WHEN** glab cannot resolve or read the supplied project because of authentication, permissions, compatibility, or malformed responses
- **THEN** import reports the concrete failure rather than searching for a different issue or substituting another provider.
