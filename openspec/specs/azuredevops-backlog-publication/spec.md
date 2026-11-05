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

The description format SHALL be a property of each Azure Boards work item. Creation SHALL send the Markdown description unconverted, together with the `add /multilineFieldsFormat/System.Description = Markdown` operation in the same creation request, so tables, images, and nested lists SHALL NOT be rejected for a new work item. An update SHALL read the work item's format from the top-level `multilineFieldsFormat["System.Description"]` value of the read it already performs, with no additional request, and SHALL treat the work item as Markdown only when that value equals `markdown` compared case-insensitively. An update of a Markdown work item SHALL send the Markdown description unconverted. An update of any other work item SHALL convert supported Markdown to deterministic HTML before publication approval. An update SHALL NOT send the `/multilineFieldsFormat/System.Description` operation, so it SHALL NOT switch an HTML work item to Markdown. A Markdown description SHALL be rejected before approval, naming its line, when it contains raw HTML outside backtick code spans and fenced code blocks; the exact backlog identifier-counter comment SHALL remain allowed. For HTML conversion, supported forms SHALL include ATX headings, paragraphs and line breaks, flat ordered and unordered lists, blockquotes, inline code, fenced code with optional language, bold, italic, HTTP(S) and mailto inline links, and the exact backlog identifier-counter comment. Code text SHALL remain literal and escaped; the counter comment SHALL remain metadata. Unsupported nested or indented blocks, tables, raw HTML, images, reference links, footnotes, strikethrough, task lists, backslash escapes outside code, and unsupported or unbalanced syntax SHALL stop HTML preparation rather than silently degrade content. A title-only update SHALL preserve the existing description without conversion or a description-field write.

#### Scenario: Supported formatted description
- **WHEN** an update of an HTML work item carries a description that contains headings, emphasis, literal code, links, flat lists, and the supported counter comment
- **THEN** conversion produces the corresponding deterministic HTML while preserving literal code and counter metadata.

#### Scenario: Unsupported content
- **WHEN** outgoing Markdown for an HTML work item contains a form the converter does not support
- **THEN** preparation fails before approval and publication, retaining the draft for an explicitly agreed supported representation.

#### Scenario: Title-only update
- **WHEN** an update omits description or supplies the exact unchanged baseline description
- **THEN** the adapter preserves its bytes and writes no description field.

#### Scenario: Description replacement needs clarification
- **WHEN** a supported Markdown replacement cannot preserve the agreed unaffected meaning
- **THEN** the skill asks for clarification and stops until the replacement boundary is agreed.

#### Scenario: New work item is created in Markdown
- **WHEN** creation publishes a description that contains a table, an image, or a nested list
- **THEN** the creation request sends the description unconverted with the `add /multilineFieldsFormat/System.Description = Markdown` operation and preparation does not reject those forms.

#### Scenario: Markdown work item update
- **WHEN** an update targets a work item whose read returns `multilineFieldsFormat["System.Description"]` equal to `markdown` in any letter case
- **THEN** the update sends the Markdown description unconverted and sends no format operation.

#### Scenario: HTML work item update keeps HTML
- **WHEN** an update targets a work item whose `multilineFieldsFormat` is empty, absent, or holds another value
- **THEN** the update sends HTML through the converter with its rejections and sends no format operation.

#### Scenario: Raw HTML in a Markdown description
- **WHEN** a Markdown description contains raw HTML outside backtick code spans and fenced code blocks
- **THEN** preparation fails before approval with an error that names the line, and HTML inside code spans or fenced code blocks is accepted.

### Requirement: Exact Boards publication approval and project-rule enforcement

Before ordinary creation or update approval, the skill SHALL display the exact destination, visibility, work-item type, title, description and every resolved planning change, including automatic parent linkage. Azure descriptions SHALL show the exact outgoing content in the work item's format: Markdown for a creation or an update of a Markdown work item, and the converted outgoing HTML for an update of an HTML work item. The skill SHALL ask "Apply this exact work-item content and these planning changes?" through the existing confirm, edit and cancel workflow. Approval SHALL bind destination, type, content, planning inputs, authenticated identity and the unchanged confirmation token. The adapter SHALL publish content first and then apply approved planning fields separately, with project rules enabled. It SHALL NOT invent additional required field values or bypass project rules. Changed inputs SHALL require fresh preparation and approval.

#### Scenario: Exact creation approval
- **WHEN** the user approves the displayed type, destination, outgoing content, and resolved planning changes
- **THEN** publication requires the unchanged proposal and confirmation token before one creation request.

#### Scenario: Approval does not match
- **WHEN** destination, type, content, planning, identity, or token differs from the prepared proposal
- **THEN** the adapter performs no publication and requires fresh preparation and approval.

#### Scenario: Additional required field prevents creation
- **WHEN** project rules reject creation because an additional required field is missing
- **THEN** publication reports the rejection without bypassing rules, assigning a value, or automatically repeating creation.

### Requirement: Origin-bound revision-conditional Boards updates

Updates SHALL require a complete Services work-item origin URL, verified item and project identity, and a baseline containing revision, title and description. Inaccessible or incomplete origins SHALL NOT become replacement creations. Updates SHALL support title, description and approved ordinary planning fields only. Changed baselines SHALL require fresh preparation and approval. The content request SHALL test the confirmed /rev and change only authorized title or description fields; approved planning changes SHALL follow in a separate revision-tested request. Revision rejection SHALL require rereading and renewed approval without automatic retry. Preparation SHALL return no_changes only when content matches under the existing harmless Azure normalization rule and every requested planning field already matches.

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
- **WHEN** the proposed title equals the current baseline title and the proposed description equals the current baseline description or differs from it only by harmless Azure normalization, and all requested planning fields already match
- **THEN** preparation returns no_changes without an approval request or a remote mutation.

#### Scenario: Origin cannot be read
- **WHEN** the originating work item is inaccessible or its identity cannot be verified
- **THEN** update stops without creating a replacement item.

### Requirement: Boards publication evidence and query-only recovery

Before a write, the adapter SHALL save a private receipt containing the exact approved proposal, destination, authenticated identity, and update identity or pre-creation IDs. Completion SHALL require verified remote identity, exact title, equivalent description under harmless Azure normalization, and all requested planning fields. Confirmed rejection and uncertain outcomes SHALL remain distinct. Recovery without an approved continuation SHALL be read-only remotely and SHALL NOT repeat content publication. Lost creation identities SHALL require candidate evidence from saved IDs, type, author and full content, plus confirmation of the actual created URL; a coincident title SHALL NOT prove creation. Missing or ambiguous candidates SHALL require clarification, never replacement creation. Verified content with incomplete planning SHALL report partial_failure with confirmed and pending changes. Only explicit approval of the exact returned continuation and current state SHALL authorize pending-only planning writes with the same receipt.

#### Scenario: Verified creation response
- **WHEN** the write returns an item identity and readback verifies its destination, type, complete approved content, and all requested planning fields
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

Publication SHALL reuse the existing Azure runner and address interpretation without tool installation, authentication or global-default changes. CLI and SDK children SHALL preserve authentication and disable dynamic extension installation locally. SDK execution SHALL require the installed azure-devops extension, use official distinct locations for creation, ID-based work-item operations, identity, iteration classification trees and current team iterations, and encode route values. Iteration trees SHALL use API 7.1; current team iterations SHALL use API 7.1-preview.1 with $timeframe=current. Supported launchers SHALL remain the standard Windows MSI interpreter and absolute Python-shebang CLI launchers; unsupported packaging SHALL stop without guessing. Windows arguments SHALL remain data. Access failures SHALL report blockers, and scratch cleanup SHALL preserve receipts.

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

Offline tests SHALL cover exact planning approval, content-before-planning writes, native parent and iteration resolution, authenticated-user assignment, planning-only updates, complete-result no-op detection, partial completion, lost responses, stale continuations and pending-only recovery. Existing destination, content, revision, installed-SDK routing, environment and cleanup coverage SHALL remain. Both Claude Code and opencode SHALL receive the same shared tools and provider references through managed projections and existing helper-only access declarations. Offline checks SHALL NOT be reported as live Azure validation.

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

Azure DevOps crystallized slice publication SHALL create the agreed parent and one child per slice through separate verified operations using the invocation-selected project and work-item type. When the set is published under an originating work item, that work item SHALL be the parent and SHALL keep its own work-item type; only the created children SHALL use the invocation-selected type, and each child SHALL be linked to the origin with a `Hierarchy-Reverse` relation. Every work item the set creates SHALL be created in Markdown format, with the format operation in its creation request: child blocks SHALL be preserved losslessly as fenced code blocks whose fence is longer than any backtick run inside the block, relationship references SHALL be Markdown lines, and correspondence SHALL be stored in a fenced `sai-backlog-slices@1` code block. An originating work item SHALL keep its own description format and SHALL NOT receive the format operation: a Markdown origin SHALL be rewritten in Markdown, and an HTML origin SHALL be rewritten in HTML with escaped relationship lines and a visible escaped `sai-backlog-slices@1` pre block. The full outgoing content of each item SHALL be shown before approval. Native Parent/Child hierarchy and Predecessor links for agreed immediate dependencies SHALL be inspected, written and verified separately. Relation mutations SHALL test the current revision. Project rules SHALL remain enabled; incompatible type or hierarchy rules SHALL stop the pending operation for a human decision without automatic type changes.

#### Scenario: Approved slice set

- **WHEN** exact publication approval covers the selected project, type, parent, child contents and relationships
- **THEN** publication creates and verifies those items and relationships while preserving each child's complete block.

#### Scenario: Project rejects a native relationship

- **WHEN** project rules reject a relationship after work items have been created
- **THEN** recovery reports existing items and proposes a disclosed written fallback requiring explicit approval without duplicate creation.

#### Scenario: Originating work item keeps its type

- **WHEN** a slice set is published under an originating work item whose type differs from the invocation-selected type
- **THEN** the origin keeps its type as the parent, the children use the selected type, and no type-change error is raised for the origin.

#### Scenario: Created set items are Markdown

- **WHEN** a slice set publication creates its parent or its children
- **THEN** each creation request carries the `add /multilineFieldsFormat/System.Description = Markdown` operation, each child block is a fenced code block, and the slice marker is a fenced `sai-backlog-slices@1` code block.

#### Scenario: HTML origin keeps HTML

- **WHEN** a slice set is published under an originating work item whose description format is HTML
- **THEN** the origin's rewritten description is HTML with a visible escaped `sai-backlog-slices@1` pre block, no format operation is sent for it, and its created children are Markdown.

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

The Azure DevOps adapter SHALL compare a sent description with a description read back from Azure Boards directionally, using the rule of the work item's description format. For an HTML work item, the received description SHALL be equivalent to the sent description only when it equals the sent description plus whitespace inserted between block tags (`p`, `li`, `ul`, `ol`, `h1`-`h6`, `pre`, `blockquote`), immediately before a block closing tag, or at the start or end of the description next to a block tag, with the exact `backlog-id-counters` comment optionally removed. Whitespace removed anywhere, whitespace added before an inline closing tag, any whitespace change inside `<pre>` or `<code>`, any other comment, a counters comment with different values, and any change to text, links, or structure SHALL remain differences. For a Markdown work item, the received description SHALL be equivalent to the sent description only when both match after entity decoding of `&quot;`, `&amp;`, `&lt;`, `&gt;`, and numeric character references, with at most the exact `backlog-id-counters` comment removed and only whitespace left at its place; entity decoding SHALL be a single pass, and every other difference SHALL remain a difference. Titles SHALL be compared exactly. Comparisons between two Azure reads (the stale-baseline digest and the pending-update digest) SHALL remain exact. The comparison SHALL be supplied only by the Azure DevOps adapter; GitHub and GitLab publication SHALL compare descriptions byte for byte.

#### Scenario: Added block whitespace and a dropped counters comment

- **WHEN** Azure Boards returns the sent HTML description with whitespace added between block tags or before a block closing tag and without the exact counters comment
- **THEN** verification treats the description as equal to the sent content.

#### Scenario: Meaningful whitespace or content changes

- **WHEN** the returned HTML description removes whitespace, adds whitespace before an inline closing tag, changes whitespace inside `<pre>` or `<code>`, carries another comment or a counters comment with different values, or changes text, links, or structure
- **THEN** verification reports a difference, even when harmless normalization also occurs.

#### Scenario: Slice set readback after normalization

- **WHEN** a slice set publication rereads an Azure work item after creation or after writing slice references and finds only harmless normalization for that work item's format
- **THEN** the set publication continues and its recovery readback reports completion.

#### Scenario: Other providers stay byte-exact

- **WHEN** a GitLab slice set publication reads back a description that differs from the sent one only by added whitespace
- **THEN** creation verification fails as a content mismatch.

#### Scenario: Markdown description stored with entities

- **WHEN** Azure Boards returns a sent Markdown description with `"` encoded as `&quot;`, including inside a code fence, a non-BMP character encoded as a numeric reference, and the exact counters comment removed
- **THEN** verification treats the description as equal to the sent content.

#### Scenario: Markdown description changed beyond entities

- **WHEN** a returned Markdown description differs from the sent one after entity decoding in text, whitespace outside the removed counters comment, or a counters comment with different values
- **THEN** verification reports a difference.

#### Scenario: Lost Markdown creation is recovered without a duplicate

- **WHEN** the response of a Markdown work item creation is lost and recovery finds a candidate whose description matches the sent one under the Markdown equivalence
- **THEN** recovery offers that candidate for confirmation and creates no second work item.

### Requirement: Direct verification and shared bounded publication recovery

Azure publication instructions SHALL direct verification without an additional permission question after partial or uncertain outcomes. Ordinary individual recovery SHALL remain read-only unless the user explicitly approves the returned pending-planning continuation. Such continuation SHALL preserve completed content and apply only still-pending planning fields under revision and state checks, without another creation or automatic content retry. Pending slice-set operations SHALL retain the shared warning, verification and one durable publication-wide verified pending-only retry allowance within unchanged approval. Incompatible types, hierarchy rules or changed representation SHALL require a human decision. Existing-issue content edits SHALL receive no automatic mutation retry.

#### Scenario: Uncertain individual creation

- **WHEN** individual creation has no verified outcome
- **THEN** the workflow queries directly without a verification permission question, retains the receipt and requests identification when necessary without another creation.

#### Scenario: Set relationships remain pending

- **WHEN** a set has verified pending relationships within the unchanged approval and an unused automatic retry allowance
- **THEN** continuation consumes the durable allowance before retrying pending work while preserving created items and completed relationships.

#### Scenario: Automatic retry fails

- **WHEN** the automatic set retry remains incomplete
- **THEN** the workflow verifies again without additional consent and consults the user with completed and pending state instead of granting another automatic retry.

### Requirement: Ordinary Boards planning resolution and two-step completion

Ordinary Azure Boards creation and updates SHALL complete approved title and description first, then the intended parent and explicitly requested planning fields. The skill SHALL include a known intended parent PBI ID or URL from context without requiring a separate linkage request. The helper SHALL validate a same-organization Product Backlog Item, reject self-parenting and conflicting existing parents, and preserve project rules. Sprint changes SHALL require an explicit request and resolve a native iteration path against the project tree; current sprint SHALL require a team and exactly one current iteration. Assignment SHALL require an explicit request to assign the authenticated user, write that user's unique name and verify the identity ID. Arbitrary assignees and work-item state changes SHALL remain unsupported. Deterministic tools SHALL own resolution, validation, execution, verification and recovery; shared instructions SHALL state goals rather than case-by-case operational policies.

#### Scenario: Known parent without other planning requests
- **WHEN** ordinary publication has a known intended parent PBI but no explicit sprint or assignment request
- **THEN** its proposal includes only parent linkage and does not infer sprint or assignment.

#### Scenario: Requested current sprint and self assignment
- **WHEN** the user requests the current sprint and assignment to the authenticated user
- **THEN** preparation resolves exactly one team iteration and the authenticated identity before full approval.

#### Scenario: Planning-only update
- **WHEN** content already matches but a requested planning field differs
- **THEN** preparation returns a ready proposal rather than no_changes and completion verifies the full intended result.

#### Scenario: Planning remains incomplete
- **WHEN** content succeeds but planning fails or its response is lost
- **THEN** recovery verifies actual state, retains the item and receipt, and applies only pending fields after exact continuation approval.

#### Scenario: Planning changes after approval
- **WHEN** planning state or revision changes before an approved continuation writes
- **THEN** state or revision checks prevent overwriting the changed state and require renewed verification and approval.

#### Scenario: Invalid planning reference
- **WHEN** a parent, iteration, current sprint or authenticated identity cannot be validated
- **THEN** preparation fails before publication rather than guessing a reference or expanding scope.

### Requirement: Bounded Azure publication processes with local telemetry opt-out

Azure CLI and Azure SDK processes used by publication SHALL be bounded by the shared 120 s per-process limit, and a stalled process SHALL fail with reason `process-timeout` naming its step, such as `az extension show` or `Azure SDK <client> <method>`. Those child processes SHALL receive `AZURE_CORE_COLLECT_TELEMETRY` set to `no` beside the disabled dynamic extension installation, in their own environment only, leaving the parent environment and the user's Azure CLI configuration unchanged. The Azure CLI runtime and the installed `azure-devops` extension SHALL be resolved at most once per tool process after a successful lookup and kept in memory only; a failed lookup SHALL NOT be kept. A missing or unsupported CLI or extension SHALL still fail with `tool-unavailable` or `extension-unavailable` before any write, and a timeout during the extension lookup SHALL be reported as `process-timeout`, not as a missing extension.

#### Scenario: An Azure SDK write stalls

- **WHEN** the Azure SDK Python process of a publication request runs longer than 120 s
- **THEN** publication fails with reason `process-timeout` and a message naming `Azure SDK` with the request's client and method.

#### Scenario: Telemetry is enabled in the inherited environment

- **WHEN** the parent environment sets `AZURE_CORE_COLLECT_TELEMETRY` to another value
- **THEN** each Azure CLI and Azure SDK child process runs with `AZURE_CORE_COLLECT_TELEMETRY=no`, and the parent environment keeps its original value.

#### Scenario: Several Azure requests in one invocation

- **WHEN** one tool invocation sends several Azure CLI and Azure SDK requests
- **THEN** the Azure CLI runtime lookup and the `az extension show` lookup each run once.

#### Scenario: The extension lookup fails and is retried

- **WHEN** the `az extension show` lookup fails because the extension is not installed
- **THEN** the request fails with `extension-unavailable` before any write, and a later request in the same invocation looks the extension up again.

#### Scenario: The extension lookup times out

- **WHEN** the `az extension show` process runs longer than 120 s
- **THEN** the request fails with reason `process-timeout` naming `az extension show`, not with `extension-unavailable`.
