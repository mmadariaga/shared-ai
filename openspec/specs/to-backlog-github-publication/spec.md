# to-backlog-github-publication Specification

## Purpose
Publish approved work to a GitHub repository issue and Project with verified destinations, faithful content, and conservative recovery.

## Requirements

### Requirement: Read-only GitHub destination inspection

For creation, the adapter SHALL check gh availability and github.com authentication, inspect repository visibility and issue support, and reject inaccessible, archived, or issue-disabled repositories. An explicit Project URL SHALL identify an open writable user or organization Project independently of repository ownership. Without an explicit Project, creation inspection SHALL exhaust linked Project pages, exclude closed or non-writable Projects, select exactly one valid candidate, and request clarification for zero or multiple candidates. Failed or incomplete queries SHALL remain errors rather than empty discovery results. Origin-issue updates SHALL use editable-origin inspection instead of creation destination or Project discovery.

#### Scenario: Unique linked Project

- **WHEN** complete creation discovery finds one open writable Project across all linked Project pages
- **THEN** inspection returns that Project, repository visibility, approved-content proposal, and confirmation token.

#### Scenario: Explicit independently owned Project

- **WHEN** the user supplies a valid writable creation Project whose owner differs from the repository owner
- **THEN** inspection uses that Project rather than imposing an owner match.

#### Scenario: Failed Project query

- **WHEN** linked Project discovery for creation fails or pagination is incomplete
- **THEN** the adapter reports the query error instead of claiming that no Projects exist.

### Requirement: Faithful confirmed issue publication

Creation publication SHALL re-query the proposal and reject a missing or mismatched confirmation token before attempting issue creation. The creation token SHALL bind content, repository, Project, and visibility. The adapter SHALL invoke gh with separate arguments, no shell interpretation, and structured JSON input; it SHALL preserve the approved title and description exactly, create one repository issue, and then add it to the verified Project. It SHALL NOT automatically add labels, assignees, priority, estimates, sprints, or create Projects, install tools, or change authentication. Origin-issue updates SHALL use the separate restricted update operation instead of creation or insertion.

#### Scenario: Content or visibility changes before publication

- **WHEN** creation inspection differs from the confirmed proposal or the confirmation token is absent
- **THEN** publication fails before issue creation and requires renewed review.

#### Scenario: Markdown publication

- **WHEN** approved creation content contains Markdown, Unicode, or shell-looking text
- **THEN** the adapter publishes that content unchanged as data without executing it.

### Requirement: Private bounded publication receipts

Creation publication, update publication, and their recovery operations SHALL require an absolute receipt path in an existing private local directory outside the target repository, including when invoked from a nested directory or through symlink aliases. On non-Windows platforms, receipt directories and existing files SHALL be private and owned by the current user. Existing receipt files SHALL be regular, non-symlink files with one hard link. New creation or update publication SHALL create a restrictive-permission receipt exclusively and refuse to overwrite an existing receipt to start another attempt. An update attempt SHALL record its approved proposal before submitting the mutation.

#### Scenario: Repository-contained receipt

- **WHEN** the supplied publication receipt resolves within the repository
- **THEN** the adapter rejects it before accessing GitHub or writing the receipt.

#### Scenario: Existing publication receipt

- **WHEN** creation or update publication reaches receipt creation with a receipt already used for an attempt
- **THEN** the adapter refuses to overwrite it and performs no new remote mutation.

### Requirement: Conservative publication results and recovery

For creation, the adapter SHALL distinguish complete publication, failure before publication, partial failure, and uncertain creation. It SHALL preserve a created issue and return its identification when insertion cannot be confirmed. Creation recovery SHALL never create an issue; it SHALL verify identity, repository, Project, visibility, issue content, and Project membership before attempting only pending insertion. Changed identity, destination, visibility, or known issue content SHALL block further insertion. Origin-issue update results and recovery SHALL use the separate read-only update verification contract without creation or Project insertion.

#### Scenario: Project insertion failure

- **WHEN** issue creation succeeds but insertion fails
- **THEN** the adapter returns partial failure with the existing issue link and permits recovery of insertion without another creation.

#### Scenario: Lost insertion response

- **WHEN** insertion may have succeeded but its response was lost
- **THEN** creation recovery checks Project membership and avoids repeating an already completed insertion.

#### Scenario: Recovery content or visibility drift

- **WHEN** known issue content or repository visibility changes after creation
- **THEN** creation recovery blocks insertion and requests fresh review without overwriting the changed issue or recreating it.

### Requirement: Uncertain creation verification

Before creation, the adapter SHALL record existing issue identifiers. When creation has an uncertain result, recovery SHALL enumerate issues and return candidates absent from that baseline matching approved content and authenticated author. It SHALL require the user to identify the verified issue by URL; a concurrent matching issue SHALL NOT be treated as proof. If the issue cannot be established, the outcome SHALL remain uncertain without automatic recreation.

#### Scenario: Lost creation response

- **WHEN** creation may have succeeded but the response was lost
- **THEN** recovery returns matching candidates and waits for a verified issue URL before recovering insertion.

#### Scenario: No verified issue

- **WHEN** verification establishes no issue belonging to the attempt
- **THEN** recovery remains uncertain and requests manual verification without creating another issue.

### Requirement: Editable originating issue baseline

GitHub origin-update inspection SHALL check gh availability and github.com authentication, reuse concrete issue-reference normalization and issue-only reading, and return canonical issue identity, repository, visibility, authenticated actor, and the exact current title and description as the baseline. It SHALL reject missing, inaccessible, archived, non-editable, pull-request, or incomplete responses. It SHALL support a readable editable closed issue. It SHALL read neither comments nor Projects for update preparation and SHALL NOT require from-backlog invocation. Imported source content SHALL NOT substitute for a fresh baseline.

#### Scenario: Equivalent issue references

- **WHEN** a supported full GitHub issue URL or domainless /owner/repo/issues/123 reference includes a query or fragment
- **THEN** inspection resolves the same canonical issue and reads its current title and description without reading comments or Projects.

#### Scenario: Closed editable issue

- **WHEN** the originating issue is closed but readable and editable in a non-archived repository
- **THEN** inspection returns its baseline without changing its state.

#### Scenario: Origin cannot be updated

- **WHEN** the reference identifies a pull request or a missing, inaccessible, archived, or non-editable issue
- **THEN** preparation fails without attempting an update or creating a replacement issue.

### Requirement: Baseline-bound update proposal

The query-update operation SHALL compare the supplied baseline with the freshly read current title and description. A difference SHALL return needs_input with stale-baseline and current content for renewed preparation, review, and approval. A ready proposal and confirmation digest SHALL bind provider, update operation, canonical issue identity, repository, visibility, authenticated actor, baseline, and exact final title and description. A proposed final title and description already equal to the current baseline SHALL return no_changes without remote mutation.

#### Scenario: Changed baseline during preparation

- **WHEN** either remote title or description differs from the supplied baseline
- **THEN** query-update returns stale-baseline and current content instead of a publishable proposal.

#### Scenario: No update necessary

- **WHEN** the proposed title and description already equal the freshly verified baseline
- **THEN** the operation returns no_changes without creating an update receipt or attempting remote mutation.

### Requirement: Restricted confirmed GitHub update

The update operation SHALL reread and re-query the proposal immediately before submission and require its exact confirmation token before attempting remote mutation. Missing or mismatched confirmation SHALL fail before mutation. Detected baseline changes SHALL require renewed preparation, review, and explicit approval. The adapter SHALL record the attempt before submission and invoke only updateIssue with issue id, title, and body through separate gh arguments and structured JSON input without shell interpretation. It SHALL preserve the approved content exactly and SHALL NOT create another issue or modify state, comments, labels, assignees, Project fields, or Project membership.

#### Scenario: Exact approved update

- **WHEN** the current proposal still matches the approved token
- **THEN** the adapter records the attempt and submits only the approved issue id, title, and body.

#### Scenario: Changed approval binding

- **WHEN** the target, actor, visibility, baseline, final content, or supplied token no longer matches the approved proposal
- **THEN** the operation performs no update and requires renewed review and approval.

#### Scenario: Markdown and shell-looking content

- **WHEN** the approved title or description contains Markdown, Unicode, or shell-looking text
- **THEN** the adapter submits that exact content as data without executing it.

### Requirement: Read-only update verification and recovery

After an attempted update, including a failed or lost submission response, the adapter SHALL reread the remote issue before claiming success. Verification SHALL check repository, authenticated actor, issue identity, and visibility against the approved proposal. Matching final title and description SHALL produce complete; matching baseline content SHALL produce pending; content matching neither SHALL produce divergent with current content. Failed reads or changed bound identity SHALL remain uncertain. Recover-update SHALL use the saved update receipt to repeat this verification without remote mutation. Pending results SHALL require fresh review, explicit approval, and a new receipt before retrying; divergent results SHALL require reconciliation from the current baseline and fresh approval. Unreadable results SHALL stop without automatic retry or replacement creation.

#### Scenario: Lost response after an applied update

- **WHEN** submission loses its response but remote title and description match the approved final content
- **THEN** verification reports complete from the remote read rather than from the submission response.

#### Scenario: Update remains pending

- **WHEN** verification finds unchanged baseline content
- **THEN** it reports pending and requires renewed review and explicit approval before another attempt.

#### Scenario: Divergent remote content

- **WHEN** remote content matches neither the baseline nor the proposal
- **THEN** verification reports divergent with current content for reconciliation and performs no corrective mutation.

#### Scenario: Repository identity changed

- **WHEN** recovery observes a different repository despite unchanged issue URL or issue id
- **THEN** it reports uncertainty requiring fresh review without another remote mutation.

#### Scenario: Remote verification unavailable

- **WHEN** the remote result cannot be read reliably
- **THEN** the outcome remains uncertain and recovery does not authorize an automatic retry.

### Requirement: Update concurrency limitation disclosure

Before every update approval, including renewed approval, the skill SHALL present the GitHub provider's required note: "GitHub checks the current content before updating, but cannot make that check and update atomic. A concurrent edit between them can be overwritten." The workflow SHALL NOT claim atomic concurrency protection because updateIssue supplies no atomic content-version precondition. Creation SHALL NOT require this update-specific note.

#### Scenario: Initial or renewed update review

- **WHEN** an update proposal reaches explicit approval
- **THEN** the concurrency limitation note is visible before the approval question.

#### Scenario: Strict atomic protection requested

- **WHEN** the user requires atomic prevention of concurrent overwrites
- **THEN** the workflow reports the API limitation rather than claiming that its final reread provides that guarantee.

### Requirement: Deterministic Linux receipt directory preparation

The skill-owned `scripts/prepare-temp.js` helper SHALL accept exactly one harness argument, `claude` or `opencode`, and support Linux only. It SHALL use native Node filesystem operations to create a unique new directory under `/tmp` for Claude Code or `/tmp/opencode` for OpenCode. It SHALL return JSON containing an absolute `directory` only after successful verification. Invalid arguments, unsupported platforms, or preparation errors SHALL produce a nonzero exit and a concrete error without a usable directory result. The CLI SHALL NOT accept a temporary-root override or execute shell directory commands.

#### Scenario: Separate confirmed operations

- **WHEN** independent Linux helper invocations prepare directories for either supported harness
- **THEN** each successful invocation returns a distinct absolute directory directly within that harness's permitted temporary root.

#### Scenario: Unsupported invocation

- **WHEN** the helper receives an unsupported platform, invalid harness, or extra CLI arguments
- **THEN** it fails without returning a usable directory path.

### Requirement: Existing temporary root safety

The helper SHALL require an existing non-symbolic-link temporary root whose canonical path equals its configured path and whose owner is root or the current user. A root with group-write or other-write permission SHALL require the sticky bit. The helper SHALL check these safety conditions before creation and again before returning the directory, and SHALL reject a detected root identity change. It SHALL NOT create, repair, or change permissions on the shared root. A missing root SHALL produce an error identifying the required path and the prerequisite to restore it before retrying.

#### Scenario: Missing temporary root

- **WHEN** the configured temporary root does not exist
- **THEN** preparation fails with the required root path and restoration prerequisite, without creating the root or choosing another location.

#### Scenario: Unsafe shared root

- **WHEN** the root has an unacceptable owner, is a symbolic link, or permits shared writes without sticky-bit protection
- **THEN** preparation fails without repairing the root or returning a usable directory.

#### Scenario: Root changes during preparation

- **WHEN** final checks detect changed root identity, unsafe ownership, or unsafe shared-write permissions after child creation
- **THEN** preparation fails without returning the created directory as usable.

### Requirement: Verified private child directory

Before returning a directory, the helper SHALL verify that it is a direct child of the configured temporary root and outside the target repository discovered from the canonical working directory and its ancestors. The new directory SHALL belong to the current user, SHALL NOT be a symbolic link, and SHALL have mode `0700`. The helper SHALL use a no-follow directory descriptor to set permissions only on the newly created directory and compare directory identity during verification. It SHALL reject detected substitutions or canonical-path changes and SHALL NOT reuse an incidental existing directory.

#### Scenario: Verified private directory

- **WHEN** creation and all descriptor, path, ownership, and permission checks succeed
- **THEN** the helper returns the new current-user-owned non-symbolic-link directory with mode `0700` outside the repository.

#### Scenario: Repository-contained location

- **WHEN** the configured root or created directory would be within the discovered target repository
- **THEN** preparation fails without returning a usable directory.

#### Scenario: Child verification failure

- **WHEN** child verification detects unsafe ownership, permissions, type, changed identity, or a symbolic-link substitution
- **THEN** preparation fails without presenting that directory as usable.

### Requirement: Preparation-only mutation scope

The helper SHALL create only its unique temporary child and set permissions only on that new directory. It SHALL NOT publish a work item, write repository files, delete receipts, or change permissions on existing directories. Subsequent preparation SHALL leave previously retained receipts intact, and failures SHALL NOT trigger automatic cleanup or insecure fallback.

#### Scenario: Existing receipt retention

- **WHEN** another operation prepares a new directory while an earlier directory contains a receipt
- **THEN** preparation leaves the earlier receipt unchanged.

#### Scenario: Filesystem operation fails

- **WHEN** creation, descriptor access, permission setting, or verification fails
- **THEN** the helper reports the failure without publishing, deleting receipts, or repairing existing paths.
