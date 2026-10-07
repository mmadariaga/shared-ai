# from-backlog-provider-resolution Specification

## Purpose
Resolve concrete GitHub issue references and retrieve complete original issue data through separate registry-selected read-only mechanics.

## Requirements

### Requirement: Registry-selected concrete GitHub references

The common helper SHALL select a read-capable provider from the from-backlog registry and return its provider identifier, instruction reference, adapter, item number, and available canonical provenance on successful reference resolution. GitHub and GitLab references SHALL retain repository provenance; Azure DevOps references SHALL carry organization and available project provenance rather than a repository. Entries without classification: provider SHALL retain default selection through registered hosts or an explicit domainless declaration. For default classification, a complete URL without a registered host match SHALL classify entries declaring resolution: provider as fallback candidates. Direct matches from either default classification or provider-owned classification SHALL take precedence over all fallback candidates, and selection SHALL require exactly one candidate in the winning tier. Domainless references under default classification SHALL require an explicit domainless registry declaration. The shipped registry SHALL support github.com and domainless /owner/repo/issues/123 references through GitHub, complete GitLab issue URLs through a GitLab entry declaring resolution: provider without a host catalogue, and Azure DevOps Services references through the read-capable Azure adapter declaring provider-owned classification and resolution. Host-based GitHub full URLs SHALL use HTTPS without credentials or custom ports; query parameters and fragments SHALL NOT change issue identity. Host-based GitHub incomplete paths, pull-request paths, and invalid issue numbers SHALL be rejected without search or guessing. A selected provider-owned resolver SHALL receive the trimmed raw reference and SHALL own protocol, credential, port, and item-path compatibility validation. When shared URL parsing fails and no provider candidate claims the reference, the helper SHALL return the existing invalid-reference parse error.

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

- **WHEN** a complete GitLab /-/issues/N URL has no registered host match
- **THEN** the shipped registry selects GitLab's provider-owned resolver and returns its canonical issue provenance.

#### Scenario: Installed providers reject isolated identifiers

- **WHEN** the shipped registry receives owner/repo, guess this ticket, or //github.com/owner/repo/issues/123
- **THEN** the helper returns invalid-reference with A complete issue reference is required; search and guessing are not supported without CLI context reads.

#### Scenario: Installed Azure provider claims an isolated ID

- **WHEN** the shipped registry receives a positive safe-integer ID
- **THEN** the helper selects Azure DevOps's direct claim and delegates existing organization-context resolution instead of rejecting the ID before context reads.

#### Scenario: Azure Services host beats GitLab fallback

- **WHEN** a dev.azure.com or valid organization.visualstudio.com work-item URL is supplied
- **THEN** the helper selects the Azure provider for reference validation rather than the GitLab fallback.

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

The GitLab read adapter SHALL resolve a complete HTTP or HTTPS project-level `/-/issues/N` or `/-/work_items/N` URL through authenticated `glab repo view --output json` and use the resolved project identity and hostname for structured `glab api` reads. Query parameters and fragments SHALL NOT change project and issue-number identity. The adapter SHALL reject embedded credentials, unsupported reference routes, missing project or issue-number components, and numbers that are not positive safe integers before querying provider content. It SHALL verify that the resolved project destination matches the requested URL.

The adapter SHALL verify a positive safe-integer issue ID, the expected project ID and issue number, and a response URL identifying the expected project destination and number through either supported route. It SHALL require an explicit `issue_type` value of `issue`; missing, invalid, or unsupported types SHALL prevent import. It SHALL validate title, description, and issue state and report the specific failed check rather than a combined inferred cause.

The adapter SHALL preserve the issue URL returned by GitLab, title and description as data, represent a null description as empty, and return canonical provenance, issue state, and repository archived state. It SHALL request all note pages using supported ascending creation-time ordering and return user comments in ascending identifier order, including retained comments in incomplete outcomes. It SHALL exclude system activity notes, retain original user-comment text and source links, represent unknown authors explicitly, and reject malformed or repeated comments. Comment source links SHALL preserve the returned issue URL's destination, route, and query parameters while replacing any existing fragment with the corresponding note anchor.

Retrieval SHALL perform no remote mutation. Authentication, permission, compatibility, or pagination failures SHALL retain the same provider and destination; failures after issue retrieval SHALL return incomplete with all retrieved parts.

#### Scenario: Complete paginated GitLab import

- **WHEN** glab returns a readable GitLab issue and multiple pages of notes, including system notes and unknown authors
- **THEN** import returns the original issue content, canonical provenance and states, and every user comment in ascending identifier order without including system activity or performing a mutation.

#### Scenario: Equivalent input and response routes

- **WHEN** a complete project-level reference uses either supported route and the ordinary-issue response uses either supported route for the same project and number
- **THEN** import accepts route equivalence, ignores query parameters and fragments for identity checks, and preserves the issue URL returned by GitLab.

#### Scenario: Invalid or incomplete reference

- **WHEN** a reference contains embedded credentials, an unsupported route, missing project or number components, or a number that is not a positive safe integer
- **THEN** resolution reports the specific reference failure without querying provider content.

#### Scenario: Project resolution changes the destination

- **WHEN** the resolved project's URL does not match the requested project destination
- **THEN** resolution rejects the destination mismatch instead of reading issue content from that project.

#### Scenario: Response identity or content validation fails

- **WHEN** an issue response fails its ID, project, number, response URL, title, description, or state check
- **THEN** retrieval reports the specific failed validation and does not expose the response as a verified imported issue.

#### Scenario: Ordinary-issue type cannot be verified

- **WHEN** a response has a missing or invalid issue_type or identifies a task, incident, epic, or another non-issue type
- **THEN** retrieval rejects import with the concrete type-verification or unsupported-type explanation regardless of the display route.

#### Scenario: Creation-time order differs from identifier order

- **WHEN** paginated notes arrive in creation-time order with user-comment identifiers out of order across pages
- **THEN** retrieval requests supported creation-time ordering and returns every retrieved user comment sorted by identifier with original text and author data intact.

#### Scenario: Comment provenance contains an existing query and fragment

- **WHEN** GitLab returns an issue URL containing query parameters and an existing fragment
- **THEN** the issue retains that URL and each comment link retains the query parameters while replacing the fragment with its note anchor.

#### Scenario: Later GitLab comment page fails

- **WHEN** a note-page request fails after the issue and earlier comments have been retrieved
- **THEN** import reports incomplete with the concrete error and preserves the issue and already retrieved comments in ascending identifier order without switching provider or destination.

#### Scenario: Issue has no comments

- **WHEN** the verified issue's first notes page is empty
- **THEN** import returns complete with the original issue and an empty comments collection.

#### Scenario: GitLab project resolution fails

- **WHEN** glab cannot resolve or read the supplied project because of authentication, permissions, compatibility, or malformed responses
- **THEN** import reports the concrete failure rather than searching for a different issue or substituting another provider.

### Requirement: Provider-owned reference classification

Read-capable registry entries declaring classification: provider SHALL classify the trimmed raw reference through their adapter's classify(value) operation, including references that shared URL parsing cannot interpret. The operation SHALL return exactly match for a direct claim, fallback for a compatibility candidate, or null to decline; the helper SHALL reject every other result as invalid-registry. Classification SHALL inspect only the reference and SHALL perform no CLI reads, context lookup, or side effects. Entries without read capability SHALL NOT participate in classification. The helper SHALL resolve context only through the uniquely selected adapter after applying direct-before-fallback selection. It SHALL reuse an adapter loaded for classification when dispatching the selected resolution operation. Classification SHALL NOT replace reference validation; an adapter owning classification SHALL validate its raw reference during resolution. The shipped Azure DevOps registry entry SHALL use this seam to directly claim supported Services hosts and isolated positive safe-integer IDs while existing GitHub classification and GitLab fallback behavior remain unchanged.

#### Scenario: Provider claims a non-URL reference

- **WHEN** one read-capable provider-owned classifier returns match for the trimmed reference 123
- **THEN** the helper invokes that adapter's selected resolution operation with 123 and the supplied IO rather than rejecting it solely because shared URL parsing failed.

#### Scenario: Provider claims an organization-specific host

- **WHEN** one provider-owned classifier directly claims https://team.example/items/123 while a default provider is a fallback candidate
- **THEN** the helper selects the direct claimant and lets its resolver interpret the trimmed reference.

#### Scenario: Multiple direct claims prevent context resolution

- **WHEN** two read-capable provider-owned classifiers return match for the same reference
- **THEN** the helper returns unsupported-provider without invoking either candidate's context resolver.

#### Scenario: Unique fallback returns a delegated outcome

- **WHEN** a single winning provider-owned classifier returns fallback and its selected resolver returns needs_input
- **THEN** the helper preserves the delegated outcome and attaches the selected registry metadata.

#### Scenario: Multiple fallbacks prevent context resolution

- **WHEN** no classifier directly matches and two read-capable classifiers return fallback
- **THEN** the helper returns unsupported-provider without invoking either candidate's context resolver.

#### Scenario: Invalid classifier result

- **WHEN** a provider-owned classifier returns true instead of match, fallback, or null
- **THEN** the helper returns invalid-registry before context resolution.

#### Scenario: Non-readable entry does not participate

- **WHEN** an otherwise matching registry entry has only write capability
- **THEN** the helper excludes that entry from classification and selection.

#### Scenario: Selected adapter is reused

- **WHEN** an adapter loaded for provider-owned classification becomes the uniquely selected provider
- **THEN** the helper reuses that adapter for resolution instead of loading it again.
