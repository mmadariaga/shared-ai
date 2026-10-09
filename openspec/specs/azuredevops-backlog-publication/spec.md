# azuredevops-backlog-publication Specification

## Purpose
Publish Azure DevOps Services work items through the existing to-backlog workflow with exact approval, restricted updates, and evidence-backed recovery.

## Requirements

### Requirement: Services-only Boards destination and invocation-selected type

Azure Boards publication SHALL resolve organization and project from explicit destination fields, then configuration, then supported remote evidence. It SHALL normalize supported current and legacy Services addresses, reject Server or incompatible destinations, and ask only for unresolved destination choices. A complete explicit destination SHALL NOT require clarification merely because alternative remotes exist. Creation SHALL require an invocation-selected work-item type, ask when it is absent, validate the selected type through the project, and introduce no persistent type default.

#### Scenario: Explicit destination is complete
- **WHEN** explicit input identifies a valid organization and project and remotes identify other destinations
- **THEN** resolution retains the explicit destination without an alternative-remote question.

#### Scenario: Destination remains ambiguous
- **WHEN** ordered destination evidence cannot identify one organization and project
- **THEN** resolution requests clarification before publication.

#### Scenario: Server or incompatible destination
- **WHEN** input supplies an Azure DevOps Server address or conflicting organization, project, or repository identity
- **THEN** preparation stops without publishing.

#### Scenario: Type is absent
- **WHEN** creation has no work-item type
- **THEN** preparation requests the type for this invocation before provider inspection or publication.

#### Scenario: Type is invalid
- **WHEN** the requested type cannot be verified as the selected project's work-item type
- **THEN** creation preparation stops without publication.

### Requirement: Deterministic outgoing Boards content

The adapter SHALL convert supported Markdown descriptions to deterministic HTML before publication approval. Supported forms SHALL include ATX headings, paragraphs and line breaks, flat ordered and unordered lists, blockquotes, inline code, fenced code with optional language, bold, italic, HTTP(S) and mailto inline links, and the exact backlog identifier-counter comment. Code text SHALL remain literal and escaped; the counter comment SHALL remain metadata. Unsupported nested or indented blocks, tables, raw HTML, images, reference links, footnotes, strikethrough, task lists, backslash escapes outside code, and unsupported or unbalanced syntax SHALL stop preparation rather than silently degrade content. A title-only update SHALL preserve the existing HTML description without conversion or a description-field write.

#### Scenario: Supported formatted description
- **WHEN** a description contains headings, emphasis, literal code, links, flat lists, and the supported counter comment
- **THEN** conversion produces the corresponding deterministic HTML while preserving literal code and counter metadata.

#### Scenario: Unsupported content
- **WHEN** outgoing Markdown contains an unsupported form
- **THEN** preparation fails before approval and publication, retaining the draft for an explicitly agreed supported representation.

#### Scenario: Title-only update
- **WHEN** an update omits description or supplies the exact unchanged baseline description
- **THEN** the adapter preserves its bytes and writes no description field.

#### Scenario: Description replacement needs clarification
- **WHEN** a supported Markdown replacement cannot preserve the agreed unaffected meaning
- **THEN** the skill asks for clarification and stops until the replacement boundary is agreed.

### Requirement: Exact Boards publication approval and project-rule enforcement

Before creation approval, the skill SHALL display organization, project, visibility, work-item type, title, source Markdown, and complete outgoing HTML as literal content. It SHALL ask "Create this exact work item of this type in this Azure project?" using the existing confirm, edit, and cancel workflow. Approval SHALL bind the exact prepared destination, type, content, and confirmation token. The adapter SHALL submit only supported title and description inputs and SHALL NOT bypass project rules or automatically fill additional required fields. A project-rule rejection SHALL be reported and stop creation.

#### Scenario: Exact creation approval
- **WHEN** the user approves the displayed type, destination, and outgoing content
- **THEN** publication requires the unchanged proposal and confirmation token before one creation request.

#### Scenario: Approval does not match
- **WHEN** destination, type, content, or token differs from the prepared proposal
- **THEN** the adapter performs no publication and requires fresh preparation and approval.

#### Scenario: Additional required field prevents creation
- **WHEN** project rules reject creation because an additional required field is missing
- **THEN** publication reports the rejection without bypassing rules, assigning a value, or automatically repeating creation.

### Requirement: Origin-bound revision-conditional Boards updates

Updates SHALL require a complete Services work-item origin URL, verify returned item and project identity, and obtain a baseline containing revision, title, and description. Inaccessible or incomplete origins SHALL NOT become replacement creations. Updates SHALL change only title and description. A changed baseline SHALL require fresh preparation and approval. The write SHALL include a test of the confirmed `/rev` and all title or description changes in the same JSON Patch request. Revision rejection SHALL require rereading and renewed approval without automatic retry. Identical content SHALL end without mutation.

#### Scenario: Baseline changes before publication
- **WHEN** the current revision or baseline content differs from the approved baseline
- **THEN** preparation returns the current baseline and requires new approval without writing.

#### Scenario: Revision changes inside the write interval
- **WHEN** another edit changes the revision after preparation but before the conditional update is applied
- **THEN** the revision test rejects the update and the workflow requires rereading and renewed approval without retrying automatically.

#### Scenario: Restricted update succeeds
- **WHEN** the confirmed revision still matches
- **THEN** one request tests that revision and changes only the authorized title and description fields with project rules enabled.

#### Scenario: Update is a no-op
- **WHEN** the proposed title and description equal the current baseline
- **THEN** preparation returns no_changes without a remote mutation.

#### Scenario: Origin cannot be read
- **WHEN** the originating work item is inaccessible or its identity cannot be verified
- **THEN** update stops without creating a replacement item.

### Requirement: Boards publication evidence and query-only recovery

Before a write, the adapter SHALL save a new private receipt containing the exact authorized proposal, destination, authenticated identity, and either the update identity or pre-creation item IDs. Completion SHALL require verified remote identity and exact title and description equality. Confirmed write rejection and uncertain outcomes SHALL remain distinct; a failed readback after a write SHALL remain uncertain. Recovery SHALL perform queries only and SHALL NOT repeat publication. Without a verified creation-response identity, recovery SHALL compare saved IDs, type, author, and full content and require the actual created URL to be confirmed. A coincident title SHALL NOT prove publication. Zero or ambiguous compatible candidates SHALL require clarification rather than another creation.

#### Scenario: Verified creation response
- **WHEN** the write returns an item identity and readback verifies its destination, type, and complete approved content
- **THEN** the adapter reports completion with the verified item URL.

#### Scenario: Creation response is lost
- **WHEN** creation may have succeeded without a verified response identity
- **THEN** recovery queries candidates absent from the saved inventory and requires confirmation of the actual created URL without creating another item.

#### Scenario: Recovery candidate is incompatible
- **WHEN** destination identity, type, author, or approved content cannot establish the candidate's eligibility
- **THEN** recovery reports uncertainty or requests clarification rather than claiming completion.

#### Scenario: Remote readback fails
- **WHEN** a write may have completed but its content cannot be reread
- **THEN** the adapter retains the receipt and reports uncertainty without repeating the write.

#### Scenario: Update remains unapplied or diverges
- **WHEN** recovery finds the old update baseline or different current content
- **THEN** it reports pending or divergent state and requires fresh approval or reconciliation before a new attempt.

### Requirement: Existing authenticated Azure transport without environment mutation

Publication SHALL reuse the existing from-backlog Azure runner and address interpretation. CLI and SDK child processes SHALL preserve the inherited authenticated environment while locally setting `AZURE_EXTENSION_USE_DYNAMIC_INSTALL` to `no`; they SHALL NOT install tools, authenticate, or change global defaults. SDK access SHALL require the already-installed azure-devops extension and use distinct official locations for work-item creation, ID-based read/update, and authenticated identity. Supported SDK launchers SHALL be the standard Windows MSI interpreter and absolute Python-shebang CLI launchers; unsupported packaging SHALL stop explicitly without guessing an interpreter. Windows arguments SHALL remain data without command-shell interpretation. Access failures SHALL report concrete blockers. Owned transport payloads SHALL be cleaned after success or failure without deleting recovery receipts.

#### Scenario: Dynamic installation is enabled globally
- **WHEN** inherited configuration permits automatic extension installation
- **THEN** Azure child processes disable it locally while leaving the parent environment and credentials unchanged.

#### Scenario: Extension or launcher is unavailable
- **WHEN** the installed extension or a supported CLI interpreter cannot be verified
- **THEN** SDK execution stops without installation, credential changes, or an interpreter fallback.

#### Scenario: Work-item routes differ
- **WHEN** creation, ID-based read/update, or authenticated identity is requested
- **THEN** the SDK bridge selects the applicable distinct location and encodes route values before template expansion.

#### Scenario: Transport payload cleanup
- **WHEN** an invoke operation completes or encounters preparation, execution, or JSON parsing failure
- **THEN** cleanup removes only that operation's scratch payload and directory while retaining publication receipts and the actual outcome.

### Requirement: Offline Azure publication and mirrored installation coverage

Offline tests SHALL cover destination and type questions, supported conversion and unsupported-content stops, exact authorization, revision conflicts, restricted writes, uncertain outcomes, query-only recovery, installed SDK routing, inherited environment handling, and transport cleanup. Both Claude Code and opencode projections SHALL include the shared Azure tools, registries, and branch-specific references under existing managed content tracking and helper-only access declarations. These checks SHALL NOT be presented as live Azure integration validation.

#### Scenario: Simulated publication checks
- **WHEN** Azure publication tests exercise destination, content, revision, or recovery behavior
- **THEN** simulated provider responses establish the tested result and assert forbidden mutations remain unexecuted without publishing real work items.

#### Scenario: Both harness projections expand
- **WHEN** installation is expanded for Claude Code and opencode
- **THEN** both receive the Azure adapters, shared tools, and applicable references without independent Azure CLI or push permission grants.

#### Scenario: Protocol checks are reported
- **WHEN** offline routing and launcher tests pass
- **THEN** their result is described as offline evidence rather than proof of a live Azure publication.
