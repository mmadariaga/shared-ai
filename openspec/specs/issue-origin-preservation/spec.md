# issue-origin-preservation Specification

## Purpose
Preserve each selected change's verified originating issue across workflow handoffs so archival can supply supported closing references without inventing completion intent.

## Requirements

### Requirement: Preserve the selected issue through workflow handoffs

Claude Code and opencode SHALL carry the selected change's verified issue URL as the `Backlog origin:` line of the `## Change` section of its change document and as `backlog_origin` in its metadata. Provenance SHALL come from an imported issue, verified conversation evidence, or valid existing metadata. A parent or context-only issue SHALL NOT replace the selected child's origin. A valid existing origin SHALL be retained when no new origin is supplied; conflicting origins SHALL retain the existing valid value, warn, and continue without assigning new closing intent.

#### Scenario: Selected child reaches planning
- **WHEN** an imported or conversation-verified child issue is selected for work and its change document is created and consumed by planning
- **THEN** its own verified URL is retained in the document and planning metadata rather than replaced by the parent's URL

#### Scenario: Existing metadata contains a valid origin
- **WHEN** planning refinement or backfill receives valid existing origin metadata without a new origin
- **THEN** it preserves that origin

#### Scenario: Incoming origin conflicts with existing metadata
- **WHEN** a new origin differs from a valid origin already stored for the selected change
- **THEN** the existing valid value remains and the workflow warns and continues without assigning new closing intent

### Requirement: Amend stored origin through validated block transport

An origin attached to a stored change document SHALL use validated amendment, dispatchable checking, bounded hygiene judgment, refreshed hashes, and readback. Published slice sets SHALL export each original document, send verified `document_files: [{document_file, hash}]` with complete child correspondence to `change-document.js attach-origin --harness <claude|opencode>`, and receive new private file/hash references rather than amended message text. The tool SHALL verify input files and preserve the other document lines, dependencies, scope, and E/I items. A document whose existing origin equals the published set's parent (an adopted originating issue) SHALL receive its child's URL in place of that origin. It SHALL refuse any other conflicting origin or incomplete correspondence. Callers SHALL validate the amended files, emit each through the file-backed amendment form (`--amend <name> --document-file <path>`), export again, and mechanically compare bytes/hash and selected origin before dispatch. For an imported single issue attached to an already prepared document, the amended file SHALL come from `change-document.js set-origin`, the readback SHALL be `sai-state block <id> <change-name> --export --harness <claude|opencode>`, the check SHALL use the `hash` that export returns, and an export returning `BLOCK_EXPORT_FAILED` or `BLOCK_NOT_FOUND` SHALL stop the workflow before dispatch. Transfer directories SHALL remain until recovery cannot need them. Workflows SHALL NOT patch storage directly, reuse an old hash, or add a second origin envelope.

#### Scenario: Attach an imported issue after block preparation
- **WHEN** a verified issue origin is attached to an already stored change document
- **THEN** the amended document is validated and stored through the existing amendment operation, re-read through `sai-state block … --export`, and its extracted origin and the refreshed hash that export returns are checked before dispatch

#### Scenario: Attach a published slice set
- **WHEN** a published parent has verified child correspondence for several change documents
- **THEN** each document receives its corresponding child's URL through the existing validated attachment mechanism

#### Scenario: Origin attachment keeps file references paired

- **WHEN** verified child correspondence is attached to exported documents
- **THEN** each amended output has its own private-file reference and new hash, and mismatched input references fail without substituting text.

#### Scenario: Failed amended-block export stops before dispatch

- **WHEN** the export that re-reads an amended imported-issue document returns `BLOCK_EXPORT_FAILED` or `BLOCK_NOT_FOUND`
- **THEN** the workflow stops before dispatch and does not reuse a pre-amendment hash

#### Scenario: Block crystallized from the adopted origin

- **WHEN** a document's `Backlog origin:` equals the parent of the published set because the set was published under that originating issue
- **THEN** attachment replaces that origin with the document's child URL, while a document naming any other issue is refused.

### Requirement: Backfill accepts origin independently of intent

Backfill SHALL permit optional validated `backlog_origin` alongside the required `schema`, date-only `created`, and `backfilled` metadata keys, and alongside `prior_intent` only when usable intent exists. An origin alone SHALL NOT set `prior_intent`. The ordinary backfill coordinator and Direct Build draft review SHALL accept the same optional origin, preserve valid existing origins, and compare known origins at draft and materialized-metadata handoffs.

#### Scenario: Backfill without usable intent
- **WHEN** backfill has a verified issue origin but no usable intent context
- **THEN** its metadata permits that origin without introducing `prior_intent`

#### Scenario: Direct Build with usable intent
- **WHEN** Direct Build prepares and reviews backfill drafts from a block containing a verified origin and usable intent
- **THEN** its metadata permits both `prior_intent: true` and the block's validated origin and the handoff checks compare the retained value

### Requirement: Diagnose known origin loss without blocking

At planning output, backfill draft, materialized metadata, and archived metadata handoffs, the owning workflow SHALL compare a known incoming origin with its outgoing representation. Missing or unverifiable origins SHALL produce a warning naming the change and affected handoff, continue remaining work, and omit unsupported closing intent. A change with no known issue association SHALL omit the origin silently. Branch identifiers and ordinary `Refs` mentions SHALL NOT invent origin or completion evidence.

#### Scenario: Known origin is lost
- **WHEN** an outgoing handoff omits an origin known from the incoming change
- **THEN** the workflow warns with the change and affected handoff and continues without inventing a URL or closing line

#### Scenario: Known origin cannot be verified
- **WHEN** a received origin cannot be verified at a handoff
- **THEN** the workflow warns and continues without unsupported closing intent

#### Scenario: Change never had an issue
- **WHEN** no issue association was known for a change
- **THEN** the workflow omits the origin without an origin-loss warning

### Requirement: Archive checks origin on both sides of the move

The ordinary and Direct Build archive routes SHALL retain the pre-move origin as handoff evidence and compare it with archived metadata after the move. They SHALL read both sides rather than assume the archive CLI drops metadata. Archive commit closing lines SHALL consume the archived value through the existing commit rules, and the pull-request tool SHALL continue consuming commit closing lines under its existing provider, host, repository-identity, and parent-completeness restrictions. This protocol SHALL add no Azure Boards closing-reference support.

#### Scenario: Verified child origin survives archival
- **WHEN** a completed child change with valid issue metadata is archived
- **THEN** its pre-move and archived origins are compared and the retained archived URL supplies its supported repository-qualified commit closing reference

#### Scenario: Archived origin is missing or unverifiable
- **WHEN** the archive handoff cannot retain or verify a known pre-move origin
- **THEN** the workflow warns and continues without inventing a closing line

### Requirement: Attaching a published origin keeps the Explore origin line after it

When `attach-origin` or `set-origin` inserts a `Backlog origin:` line into the `## Change` section of a stored change document that has none, it SHALL insert the line before the first later key of the documented order (`Explore origin:`, then `Specs:`), or at the end of the section when neither is present, with the list marker the other lines of the section use, so the document keeps the canonical key order. An existing `Backlog origin:` line SHALL be replaced in place, and every other line SHALL stay as it was.

#### Scenario: the origin is inserted before Explore origin
- **WHEN** `attach-origin` adds a child issue URL to a document whose `## Change` section carries `Explore origin:` and no `Backlog origin:`
- **THEN** the amended document carries `Backlog origin:` immediately before `Explore origin:`, with the same list marker, and the document still passes the dispatchable check

### Requirement: A re-imported change document takes the imported URL as its origin

A published change document cannot name the URL of its own publication. When a published issue is re-imported, `change-document.js sections --origin <issue-url>` SHALL report the `Backlog origin` the change takes: the imported URL when the document's `## Change` section has no `Backlog origin:` line, and the document's own value, with a warning naming both URLs, when the document names a different issue. For a document already stored, `change-document.js set-origin --document-file <path> --origin <issue-url> --harness <claude|opencode>` SHALL write a private copy of the document whose `Backlog origin:` line holds the imported URL when the line was missing, keep a different existing value and report it, and return the new file and its hash. `--origin` SHALL accept only a canonical GitHub, GitLab, or Azure DevOps issue URL. Claude Code and opencode SHALL behave alike.

#### Scenario: A missing origin is filled from the imported URL

- **WHEN** a re-imported published change document has no `Backlog origin:` line and the import names its issue URL
- **THEN** the origin the change takes is the imported URL and no warning is reported.

#### Scenario: A different existing origin is kept with a warning

- **WHEN** a re-imported published change document names a `Backlog origin:` that differs from the imported URL
- **THEN** the existing value is kept and a warning naming both URLs is reported.

#### Scenario: A stored document receives the imported origin

- **WHEN** `set-origin` runs on a stored document without a `Backlog origin:` line
- **THEN** it writes a new private file whose `## Change` section carries the imported URL as `Backlog origin:` and returns that file and its hash, leaving every other line unchanged.
