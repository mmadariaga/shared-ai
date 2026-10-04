# gitlab-issue-publication Specification

## Purpose
Publish explicitly approved GitLab issues and originating-issue refinements through authenticated glab, with verified remote outcomes and conservative recovery.

## Requirements

### Requirement: Provider-owned GitLab destination inspection

The GitLab adapter SHALL resolve project addresses through `glab repo view --output json` using existing configuration and authentication rather than a maintained host catalogue. Explicit destination fields SHALL override configuration; a missing repository SHALL require exactly one distinct remote address or return clarification. Board or Project destinations SHALL require correction rather than authorize publication. Inspection SHALL validate canonical project identity, hostname, visibility, archived state, and issue-enablement signals, and read the authenticated actor through structured glab API responses. Missing or malformed issue-enablement signals, archived projects, or either a false issues_enabled value or disabled issues_access_level SHALL block POST and PUT. glab errors SHALL remain concrete blockers on the same provider and destination.

#### Scenario: Missing GitLab destination

- **WHEN** no repository is supplied and remote addresses do not identify exactly one candidate
- **THEN** resolution requests destination information without inventing a project or publishing an issue.

#### Scenario: Issue-enablement evidence unavailable

- **WHEN** fresh project inspection lacks both issue-enablement signals or supplies a malformed signal
- **THEN** publication fails before POST or PUT and reports the incomplete response.

#### Scenario: Project cannot accept publication

- **WHEN** the project is archived or either recognized issue-enablement signal disables issues
- **THEN** creation and update stop before remote mutation.

### Requirement: Faithful confirmed GitLab issue creation

Creation query SHALL bind the canonical project URL, project identifier, hostname, visibility, authenticated actor, and exact nonempty title and string description in a confirmation digest. Publication SHALL repeat inspection and require the matching confirmation before mutation. It SHALL record the proposal and complete existing-issue identifier baseline in an exclusively created private receipt before POST. The adapter SHALL use separate glab arguments and JSON stdin without shell interpretation, send only title and description, and verify the created issue identity and exact remote content before reporting complete. It SHALL NOT insert boards or modify labels, assignments, or other issue metadata.

#### Scenario: Proposal changes before creation

- **WHEN** content, destination, visibility, actor, or the confirmation token differs from the approved proposal
- **THEN** creation performs no POST and requires renewed inspection and confirmation.

#### Scenario: Literal approved content

- **WHEN** approved title or description contains Markdown, Unicode, leading option-like text, or shell-looking text
- **THEN** glab receives that exact content as JSON data without executing it and completion requires a matching remote read.

#### Scenario: Receipt already used

- **WHEN** an attempt supplies an existing receipt path
- **THEN** publication refuses to overwrite the receipt and performs no new mutation.

### Requirement: Non-creating GitLab creation recovery

Creation recovery SHALL use the saved private receipt, recheck bound project and actor identity and visibility, and enumerate all issue pages before verifying the result. With no recorded created identity, it SHALL return candidates absent from the saved baseline that match exact approved content and authenticated author. It SHALL require a confirmed canonical issueUrl to select a candidate; matching content alone SHALL NOT establish which issue belongs to the attempt. Recovery SHALL report complete only after verifying recorded identity and exact content, SHALL remain uncertain when verification fails, and SHALL never create another issue.

#### Scenario: Lost GitLab creation response

- **WHEN** POST may have succeeded but its response was lost
- **THEN** recovery reads remote issues and returns matching candidates for confirmed identification without repeating POST.

#### Scenario: Candidate explicitly identified

- **WHEN** the user supplies a confirmed candidate URL and current identity and content match the approved receipt
- **THEN** recovery records that identity and reports the verified issue link as complete.

#### Scenario: Recovery identity or content changes

- **WHEN** actor, project, visibility, recorded issue identity, or approved issue content cannot be verified
- **THEN** recovery retains uncertainty and performs no creation or corrective mutation.

### Requirement: Baseline-bound restricted GitLab origin update

Origin-update inspection SHALL resolve the exact originating issue and read fresh canonical identity, project, visibility, authenticated actor, and a baseline containing title, description, and updated_at without reading comments or selecting a board. Query and update SHALL compare the entire supplied baseline against the current baseline; any change, including version-only changes, SHALL return stale-baseline for renewed preparation and explicit confirmation. Equal final title and description SHALL return no_changes without a receipt or mutation. A ready confirmation SHALL bind the exact origin, baseline, actor, destination, visibility, and final content. Before approval, provider instructions SHALL disclose that rereading before PUT is not atomic concurrency protection. After matching confirmation, update SHALL record a private receipt and submit only title and description as JSON data to that origin. It SHALL NOT change comments, state, boards, labels, assignments, or create a replacement issue.

#### Scenario: Version changes during preparation

- **WHEN** the originating issue's updated_at differs from the prepared baseline even though its title and description are unchanged
- **THEN** update returns stale-baseline without PUT and requires a new proposal and explicit confirmation.

#### Scenario: No GitLab update needed

- **WHEN** the proposed title and description already equal the freshly verified baseline
- **THEN** the adapter reports no_changes without writing an attempt receipt or changing the issue.

#### Scenario: Exact GitLab origin update

- **WHEN** the current origin, baseline, and final content match the explicitly approved confirmation
- **THEN** the adapter records the attempt and sends only the approved title and description to that originating issue.

#### Scenario: Update review exposes concurrency limitation

- **WHEN** a GitLab update proposal reaches approval
- **THEN** the user is told that a concurrent edit between the final read and PUT can still be overwritten.

### Requirement: Read-only GitLab update verification and recovery

After update submission, including a failed or lost response, the adapter SHALL reread the origin and compare its issue identity, project, hostname, visibility, and authenticated actor with the approved proposal. Matching final title and description SHALL yield complete; an unchanged original baseline SHALL yield pending; other readable content SHALL yield divergent with the current baseline. Failed reads or changed bound identity SHALL yield uncertainty. Recover-update SHALL perform this verification from the original receipt without remote mutation. Pending or divergent results SHALL require fresh review, explicit confirmation, and a new receipt before another update. Provider errors SHALL NOT authorize a destination change or replacement creation.

#### Scenario: Applied update loses its response

- **WHEN** the PUT response is lost but a fresh read matches the approved final content and bound identity
- **THEN** verification reports complete without repeating the update.

#### Scenario: Original baseline remains

- **WHEN** verification finds the entire original baseline unchanged
- **THEN** it reports pending and requires renewed review, confirmation, and a new receipt before another PUT.

#### Scenario: Remote content diverges

- **WHEN** verification finds content matching neither the original baseline nor the approved final content
- **THEN** it reports divergent with current content for reconciliation and performs no corrective mutation.

#### Scenario: Verification cannot establish identity

- **WHEN** remote reads fail or bound project, actor, visibility, or issue identity changes
- **THEN** the outcome remains uncertain and recovery performs no remote mutation.
