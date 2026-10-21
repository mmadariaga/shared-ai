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

Updates SHALL require a complete Services work-item origin URL, verify returned item and project identity, and obtain a baseline containing revision, title, and description. Inaccessible or incomplete origins SHALL NOT become replacement creations. Updates SHALL change only title and description. A changed baseline SHALL require fresh preparation and approval. The write SHALL include a test of the confirmed `/rev` and all title or description changes in the same JSON Patch request. Revision rejection SHALL require rereading and renewed approval without automatic retry. Content whose title equals the current baseline title and whose description differs from the current baseline description only by harmless Azure normalization SHALL end without approval request or mutation.

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
- **WHEN** the proposed title equals the current baseline title and the proposed description equals the current baseline description or differs from it only by harmless Azure normalization
- **THEN** preparation returns no_changes without an approval request or a remote mutation.

#### Scenario: Origin cannot be read
- **WHEN** the originating work item is inaccessible or its identity cannot be verified
- **THEN** update stops without creating a replacement item.

### Requirement: Boards publication evidence and query-only recovery

Before a write, the adapter SHALL save a new private receipt containing the exact authorized proposal, destination, authenticated identity, and either the update identity or pre-creation item IDs. Completion SHALL require verified remote identity, exact title equality, and a description equal to the approved description up to harmless Azure normalization. Confirmed write rejection and uncertain outcomes SHALL remain distinct; a failed readback after a write SHALL remain uncertain. Recovery SHALL perform queries only and SHALL NOT repeat publication. Without a verified creation-response identity, recovery SHALL compare saved IDs, type, author, title, and full description content up to harmless Azure normalization and require the actual created URL to be confirmed. A coincident title SHALL NOT prove publication. Zero or ambiguous compatible candidates SHALL require clarification rather than another creation.

#### Scenario: Verified creation response
- **WHEN** the write returns an item identity and readback verifies its destination, type, and complete approved content
- **THEN** the adapter reports completion with the verified item URL.

#### Scenario: Creation response is lost
- **WHEN** creation may have succeeded without a verified response identity
- **THEN** recovery queries candidates absent from the saved inventory, including candidates whose description differs only by harmless Azure normalization, and requires confirmation of the actual created URL without creating another item.

#### Scenario: Recovery candidate is incompatible
- **WHEN** destination identity, type, author, or approved content cannot establish the candidate's eligibility
- **THEN** recovery reports uncertainty or requests clarification rather than claiming completion.

#### Scenario: Remote readback fails
- **WHEN** a write may have completed but its content cannot be reread
- **THEN** the adapter retains the receipt and reports uncertainty without repeating the write.

#### Scenario: Update remains unapplied or diverges
- **WHEN** recovery finds the old update baseline or current content that differs from the approved content beyond harmless Azure normalization
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

### Requirement: Boards slice sets preserve type content and native relationship meaning

Azure DevOps crystallized slice publication SHALL create the agreed parent and one child per slice through separate verified operations using the invocation-selected project and work-item type. When the set is published under an originating work item, that work item SHALL be the parent and SHALL keep its own work-item type; only the created children SHALL use the invocation-selected type, and each child SHALL be linked to the origin with a `Hierarchy-Reverse` relation. Child blocks SHALL be preserved as losslessly escaped HTML pre blocks, and full source Markdown and outgoing HTML SHALL be shown before approval. Correspondence SHALL be stored in a visible escaped `sai-backlog-slices@1` pre block. Native Parent/Child hierarchy and Predecessor links for agreed immediate dependencies SHALL be inspected, written and verified separately. Relation mutations SHALL test the current revision. Project rules SHALL remain enabled; incompatible type or hierarchy rules SHALL stop the pending operation for a human decision without automatic type changes.

#### Scenario: Approved slice set

- **WHEN** exact publication approval covers the selected project, type, parent, child contents and relationships
- **THEN** publication creates and verifies those items and relationships while preserving each child's complete block.

#### Scenario: Project rejects a native relationship

- **WHEN** project rules reject a relationship after work items have been created
- **THEN** recovery reports existing items and proposes a disclosed written fallback requiring explicit approval without duplicate creation.

#### Scenario: Originating work item keeps its type

- **WHEN** a slice set is published under an originating work item whose type differs from the invocation-selected type
- **THEN** the origin keeps its type as the parent, the children use the selected type, and no type-change error is raised for the origin.

### Requirement: Boards child assignment is revision conditional and separate from content

Azure selected-child assignment SHALL inspect authenticated identity and current responsibility, require exact assignment approval and test the current work-item revision in the same JSON Patch request that changes `System.AssignedTo`. The request SHALL write the authenticated user's unique name (email or UPN) reported by `connectionData` to `System.AssignedTo`, while every proposal, verification and identity-changed check SHALL compare identity ids. When no unique name is reported, assignment SHALL fail as a rejection before the PATCH and SHALL leave the work item unchanged. The Azure SDK route SHALL carry the HTTP status of a service error so that a definite client rejection such as an unknown-identity 400 is reported as `rejected`, while a transport error, timeout or 5xx is reported as `uncertain`. It SHALL NOT change title, description, state, tags or parent responsibility. Keeping existing responsibility SHALL perform verification without mutation. A rejected or uncertain assignment SHALL never count as verified responsibility and SHALL return to the implementation-start gate's Retry, Skip or Stop decision, where Retry re-verifies after `uncertain` and requires renewed approval after `rejected`.

#### Scenario: Approved responsibility replacement

- **WHEN** the approved responsibility and authenticated identity remain current
- **THEN** assignment tests the revision and changes only the selected child's assigned identity before verifying it.

#### Scenario: Keep existing assignee

- **WHEN** the user approves keeping the selected child's current assignee
- **THEN** verification checks the approved identity without a work-item mutation.

#### Scenario: Unique name is written

- **WHEN** an approved assignment runs and `connectionData` reports the authenticated user's unique name
- **THEN** the PATCH writes that unique name to `System.AssignedTo` and verification compares the identity id.

#### Scenario: Unknown identity rejection

- **WHEN** Azure answers the assignment PATCH with an HTTP 400 unknown-identity error through the SDK route
- **THEN** assignment returns `rejected` and the work item stays unassigned.

#### Scenario: Missing unique name

- **WHEN** `connectionData` reports no unique name for the authenticated user
- **THEN** assignment returns `rejected` before any PATCH request.

#### Scenario: Server or transport failure

- **WHEN** the assignment request fails with a 5xx status, a timeout or a transport error
- **THEN** assignment returns `uncertain` and directs `verify-assignment`.

### Requirement: Boards description verification accepts only harmless Azure normalization

The Azure DevOps adapter SHALL compare a sent description with a description read back from Azure Boards directionally. The received description SHALL be equivalent to the sent description only when it equals the sent description plus whitespace inserted between block tags (`p`, `li`, `ul`, `ol`, `h1`-`h6`, `pre`, `blockquote`), immediately before a block closing tag, or at the start or end of the description next to a block tag, with the exact `backlog-id-counters` comment optionally removed. Whitespace removed anywhere, whitespace added before an inline closing tag, any whitespace change inside `<pre>` or `<code>`, any other comment, a counters comment with different values, and any change to text, links, or structure SHALL remain differences. Titles SHALL be compared exactly. Comparisons between two Azure reads (the stale-baseline digest and the pending-update digest) SHALL remain exact. The comparison SHALL be supplied only by the Azure DevOps adapter; GitHub and GitLab publication SHALL compare descriptions byte for byte.

#### Scenario: Added block whitespace and a dropped counters comment

- **WHEN** Azure Boards returns the sent description with whitespace added between block tags or before a block closing tag and without the exact counters comment
- **THEN** verification treats the description as equal to the sent content.

#### Scenario: Meaningful whitespace or content changes

- **WHEN** the returned description removes whitespace, adds whitespace before an inline closing tag, changes whitespace inside `<pre>` or `<code>`, carries another comment or a counters comment with different values, or changes text, links, or structure
- **THEN** verification reports a difference, even when harmless normalization also occurs.

#### Scenario: Slice set readback after normalization

- **WHEN** a slice set publication rereads an Azure work item after creation or after writing slice references and finds only harmless normalization
- **THEN** the set publication continues and its recovery readback reports completion.

#### Scenario: Other providers stay byte-exact

- **WHEN** a GitLab slice set publication reads back a description that differs from the sent one only by added whitespace
- **THEN** creation verification fails as a content mismatch.

### Requirement: Direct verification and shared bounded publication recovery

The Azure DevOps publication instructions SHALL direct recovery queries without an additional verification permission question, including partial and uncertain outcomes. Failed new-issue publications SHALL use the shared warning, verification and bounded retry contract: preserve completed work, allow one verified pending-only retry within original approval when executable pending actions exist, record its publication-wide allowance before writes, then verify and consult if incomplete. Individual Boards recovery SHALL remain query-only and SHALL NOT repeat publication. Pending set operations SHALL follow the shared retry sequence while retaining project rules and the approved work-item type. Incompatible types, hierarchy rules or changed relationship representation SHALL require a human decision rather than an automatic scope or type change. Existing-issue content edits SHALL receive no automatic mutation retry.

#### Scenario: Uncertain individual creation

- **WHEN** individual creation has no verified outcome
- **THEN** the workflow queries directly without a verification permission question, retains the receipt and requests identification when necessary without another creation.

#### Scenario: Set relationships remain pending

- **WHEN** a set has verified pending relationships within the unchanged approval and an unused automatic retry allowance
- **THEN** continuation consumes the durable allowance before retrying pending work while preserving created items and completed relationships.

#### Scenario: Automatic retry fails

- **WHEN** the automatic set retry remains incomplete
- **THEN** the workflow verifies again without additional consent and consults the user with completed and pending state instead of granting another automatic retry.
