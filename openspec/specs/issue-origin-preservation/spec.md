# issue-origin-preservation Specification

## Purpose
Preserve each selected change's verified originating issue across workflow handoffs so archival can supply supported closing references without inventing completion intent.

## Requirements

### Requirement: Preserve the selected issue through workflow handoffs

Claude Code and opencode SHALL carry the selected change's verified issue URL as `Backlog origin` in its Ready to Propose block and `backlog_origin` in its metadata. Provenance SHALL come from an imported issue, verified conversation evidence, or valid existing metadata. A parent or context-only issue SHALL NOT replace the selected child's origin. A valid existing origin SHALL be retained when no new origin is supplied; conflicting origins SHALL retain the existing valid value, warn, and continue without assigning new closing intent.

#### Scenario: Selected child reaches planning
- **WHEN** an imported or conversation-verified child issue is selected for work and its block is created and consumed by planning
- **THEN** its own verified URL is retained in the block and planning metadata rather than replaced by the parent's URL

#### Scenario: Existing metadata contains a valid origin
- **WHEN** planning refinement or backfill receives valid existing origin metadata without a new origin
- **THEN** it preserves that origin

#### Scenario: Incoming origin conflicts with existing metadata
- **WHEN** a new origin differs from a valid origin already stored for the selected change
- **THEN** the existing valid value remains and the workflow warns and continues without assigning new closing intent

### Requirement: Amend stored origin through validated block transport

An origin attached to a stored block SHALL use validated amendment, dispatchable checking, bounded hygiene judgment, refreshed hashes, and readback. Published slice sets SHALL export each original block, send verified `block_files: [{block_file, hash}]` with complete child correspondence to `attach-origin --harness <claude|opencode>`, and receive new private file/hash references rather than amended message text. The tool SHALL verify input files and preserve other block bytes, dependencies, scope, and E/I items. It SHALL refuse conflicting origins or incomplete correspondence. Callers SHALL validate the amended files, emit each through the file-backed amendment form, export again, and mechanically compare bytes/hash and selected origin before dispatch. Transfer directories SHALL remain until recovery cannot need them. Workflows SHALL NOT patch storage directly, reuse an old hash, or add a second origin envelope.

#### Scenario: Attach an imported issue after block preparation
- **WHEN** a verified issue origin is attached to an already stored block
- **THEN** the amended block is validated and stored through the existing amendment operation and its extracted origin and refreshed hash are checked before dispatch

#### Scenario: Attach a published slice set
- **WHEN** a published parent has verified child correspondence for several change blocks
- **THEN** each block receives its corresponding child's URL through the existing validated attachment mechanism

#### Scenario: Origin attachment keeps file references paired

- **WHEN** verified child correspondence is attached to exported blocks
- **THEN** each amended output has its own private-file reference and new hash, and mismatched input references fail without substituting text.

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
