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

Ordinary creation publication SHALL re-query the proposal and reject a missing or mismatched confirmation token before attempting issue creation. The creation token SHALL bind content, repository, Project, and visibility. The adapter SHALL invoke gh with separate arguments, no shell interpretation, and structured JSON input; it SHALL preserve the approved title and description exactly, create one repository issue, and then add it to the verified Project. Explicitly crystallized sliced-set creation SHALL instead publish the approved whole-objective parent and one child per agreed slice through the separate set-publication operations, with exact confirmation binding the parent, slices, destination and relationship recipe. An explicitly crystallized sliced set with an originating issue SHALL publish through the same set operations with that origin as the parent: it SHALL create and link only the agreed children, take its destination from the origin's repository, keep the origin's own Project membership, and rewrite the origin's description last without creating a replacement parent. Set publication SHALL preserve agreed source content and append only reviewed relationship references and structured correspondence. Creation SHALL NOT automatically add labels, assignees, priority, estimates, sprints, create Projects, install tools, or change authentication. Separately authorized implementation-start assignment SHALL remain a distinct operation rather than a creation or title-and-description update side effect. Origin-issue updates without a crystallized slice set SHALL use the separate restricted update operation instead of creation or insertion and SHALL NOT create replacement parents or additional children.

#### Scenario: Content or visibility changes before publication

- **WHEN** creation inspection differs from the confirmed proposal or the confirmation token is absent
- **THEN** publication fails before issue creation and requires renewed review.

#### Scenario: Markdown publication

- **WHEN** approved ordinary creation content contains Markdown, Unicode, or shell-looking text
- **THEN** the adapter publishes that content unchanged as data without executing it.

#### Scenario: Explicitly crystallized sliced set

- **WHEN** an approved GitHub create request explicitly contains an agreed crystallized slice set
- **THEN** the separate set operations publish the parent and one child per slice without another breakdown approval or automatic assignment.

#### Scenario: Existing origin update

- **WHEN** the workflow refines a previously published originating issue without a crystallized slice set
- **THEN** it retains restricted update mode without creating a replacement parent or additional children.

#### Scenario: Sliced set under an originating issue

- **WHEN** an approved GitHub request carries an agreed crystallized slice set and an originating issue
- **THEN** the set operations create one sub-issue of the origin per slice and rewrite the origin's description last, without creating a replacement parent.

### Requirement: Private bounded publication receipts

Creation publication, update publication, and their recovery operations SHALL require an absolute receipt path in an existing private local directory outside the target repository, including when invoked from a nested directory or through symlink aliases. On non-Windows platforms, receipt directories and existing files SHALL be private and owned by the current user. Existing receipt files SHALL be regular, non-symlink files with one hard link. New creation or update publication SHALL create a restrictive-permission receipt exclusively and refuse to overwrite an existing receipt to start another attempt. An update attempt SHALL record its approved proposal before submitting the mutation.

#### Scenario: Repository-contained receipt

- **WHEN** the supplied publication receipt resolves within the repository
- **THEN** the adapter rejects it before accessing GitHub or writing the receipt.

#### Scenario: Existing publication receipt

- **WHEN** creation or update publication reaches receipt creation with a receipt already used for an attempt
- **THEN** the adapter refuses to overwrite it and performs no new remote mutation.

### Requirement: Conservative publication results and recovery

For creation, the adapter SHALL distinguish complete publication, failure before publication, partial failure, and uncertain creation. It SHALL preserve a created issue and return its identification when insertion cannot be confirmed. Creation recovery SHALL never create an issue; it SHALL verify identity, repository, Project, visibility, issue content, and Project membership before attempting only pending insertion. Changed identity, destination, visibility, or known issue content SHALL block further insertion. Recovery without an exact pending-insertion confirmation SHALL inspect membership without remote mutation and return a continuation token when insertion remains pending. A request with `automatic_retry: true` SHALL require that exact verified token and SHALL durably consume the publication's single retry allowance before insertion. Already-present membership SHALL return complete without insertion or allowance consumption. An exhausted automatic retry SHALL be rejected; further insertion SHALL require an explicit user response and fresh confirmation without that flag. Origin-issue update results and recovery SHALL use the separate read-only update verification contract without creation or Project insertion.

#### Scenario: Project insertion failure

- **WHEN** issue creation succeeds but insertion fails
- **THEN** the adapter returns partial failure with the existing issue link and permits verified token-bound recovery of insertion without another creation.

#### Scenario: Lost insertion response

- **WHEN** insertion may have succeeded but its response was lost
- **THEN** creation recovery checks Project membership and avoids repeating an already completed insertion.

#### Scenario: Recovery content or visibility drift

- **WHEN** known issue content or repository visibility changes after creation
- **THEN** creation recovery blocks insertion and requests fresh review without overwriting the changed issue or recreating it.

#### Scenario: Pending insertion verification is read-only

- **WHEN** recovery verifies an existing issue that is not in the approved Project and receives no exact continuation confirmation
- **THEN** it returns insertion pending with the verified token and sends no insertion mutation.

#### Scenario: One automatic insertion retry

- **WHEN** recovery receives the exact pending token and automatic retry flag with unused allowance
- **THEN** it saves consumed retry state before attempting only insertion of the existing issue.

#### Scenario: Repeated automatic insertion retry

- **WHEN** recovery is called again with automatic retry after the allowance was consumed
- **THEN** it reports exhaustion without repeating insertion or issue creation.

#### Scenario: Completion during verification

- **WHEN** membership verification finds the existing issue already in the approved Project
- **THEN** recovery reports complete without consuming retry allowance or making a remote mutation.

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

The skill-owned `scripts/prepare-temp.js` helper SHALL accept at most one harness argument, `claude` or `opencode`, and SHALL derive the harness from the installed root it runs from when the argument is absent. It SHALL run on Linux, Windows, and macOS, and SHALL create a unique new `to-backlog-` directory inside the SAI temp root through `sai/tools/temp-root.js`, which it loads from the SAI tools installed beside the skill (or from the source checkout). It SHALL keep no temporary-root computation of its own. It SHALL return JSON containing an absolute `directory` only after successful verification. Invalid arguments or preparation errors SHALL produce a nonzero exit and a concrete error without a usable directory result. The CLI SHALL NOT accept a temporary-root override or execute shell directory commands.

#### Scenario: Separate confirmed operations

- **WHEN** independent helper invocations prepare directories for either supported harness on any supported platform
- **THEN** each successful invocation returns a distinct absolute directory directly within that harness's SAI temp root.

#### Scenario: Unsupported invocation

- **WHEN** the helper receives an invalid harness or more than one CLI argument
- **THEN** it fails without returning a usable directory path.

#### Scenario: Harness derived from the installed root

- **WHEN** the helper runs with no harness argument
- **THEN** it prepares the directory under the SAI temp root of the harness whose installed root holds the script.

### Requirement: Existing temporary root safety

The helper SHALL apply the root checks of `sai/tools/temp-root.js`. The harness root and its `sai/` folder SHALL be non-symbolic-link directories. On POSIX the harness root SHALL be owned by root or the current user and `sai/` by the current user, and a root with group-write or other-write permission SHALL require the sticky bit. On Linux the SAI temp root's canonical path SHALL equal its resolved path. The resolver SHALL check the SAI temp root before creating the child and again before returning it, and SHALL reject a detected root identity change. The helper SHALL reject a SAI temp root inside the target repository. It SHALL NOT create, repair, or change permissions on the Linux harness root. A missing Linux harness root SHALL produce an error identifying the required path and the prerequisite to restore it before retrying.

#### Scenario: Missing temporary root

- **WHEN** the Linux harness temporary root does not exist
- **THEN** preparation fails with the required root path and restoration prerequisite, without creating the root or choosing another location.

#### Scenario: Unsafe shared root

- **WHEN** the root has an unacceptable owner, is a symbolic link, or permits shared writes without sticky-bit protection
- **THEN** preparation fails without repairing the root or returning a usable directory.

#### Scenario: Root changes during preparation

- **WHEN** the resolver's final checks find a changed SAI temp root identity, unsafe ownership, or unsafe shared-write permissions after the child is created
- **THEN** preparation fails without returning the created directory as usable.

### Requirement: Verified private child directory

Before returning a directory, the helper SHALL create it through `sai/tools/temp-root.js` `makeTempDir` as a direct child of the SAI temp root. It SHALL verify that the SAI temp root lies outside the target repository discovered from the canonical working directory and its ancestors. On POSIX the new directory SHALL belong to the current user, SHALL NOT be a symbolic link, and SHALL have mode `0700`. The resolver SHALL set that mode through a no-follow directory descriptor and SHALL compare directory identity during verification. It SHALL reject detected substitutions or real-path changes and SHALL NOT reuse an incidental existing directory.

#### Scenario: Verified private directory

- **WHEN** creation and every resolver root and child check succeed
- **THEN** the helper returns the new current-user-owned non-symbolic-link directory with mode `0700` outside the repository.

#### Scenario: Repository-contained location

- **WHEN** the SAI temp root would be within the discovered target repository
- **THEN** preparation fails without returning a usable directory.

#### Scenario: Child verification failure

- **WHEN** the resolver's child verification finds unsafe ownership, unsafe permissions, the wrong type, a changed identity, or a symbolic-link substitution
- **THEN** preparation fails without presenting that directory as usable.

### Requirement: Preparation-only mutation scope

The helper SHALL create only a missing `sai/` folder of the SAI temp root (and, on Windows and macOS, a missing harness folder) and its unique temporary child, and set permissions only on those new directories. It SHALL NOT publish a work item, write repository files, delete receipts, or change permissions on existing directories. Subsequent preparation SHALL leave previously retained receipts intact, and failures SHALL NOT trigger automatic cleanup or insecure fallback.

#### Scenario: Existing receipt retention

- **WHEN** another operation prepares a new directory while an earlier directory contains a receipt
- **THEN** preparation leaves the earlier receipt unchanged.

#### Scenario: Filesystem operation fails

- **WHEN** root resolution, creation, descriptor access, permission setting, or verification fails
- **THEN** the helper reports the failure without publishing, deleting receipts, or repairing existing paths.

### Requirement: Direct GitHub Project membership verification

Single-issue creation publication and its recovery SHALL decide Project membership only through direct reads and SHALL NOT read the ProjectV2 `items` connection. The direct item read SHALL read the item returned by `addProjectV2ItemById` and accept it only when its Project is the destination Project and its content is the published issue. The issue-side read SHALL read the issue's Project items across all pages and count only items whose Project is the destination Project, archived items included. A `null` Project items connection SHALL count as no items. Before adding, publication SHALL check membership with the issue-side read, and an issue already in the destination Project, archived or not, SHALL count as verified with no add mutation and no unarchiving. After the add mutation, verification SHALL read immediately and then up to four more times two seconds apart. It SHALL use the direct item read when the response carries an item id, and the issue-side read otherwise. Publication SHALL report complete only after a verified insertion. An exhausted verification SHALL return partial failure with `Project membership not verified`, the insertion left pending, and the created issue preserved.

Single-issue publication and recovery SHALL use the same membership check, insertion, and verification operation as GitHub set publication and continuation. If insertion returns the specific `Content already exists` error, the operation SHALL verify membership with fresh issue-side reads under the existing verification bound before reporting complete. A structured GraphQL error response SHALL qualify only when every error message is exactly `Content already exists` and each error path is absent or starts with `addProjectV2ItemById`. A command error SHALL qualify only when its trimmed message is exactly `Content already exists`, optionally prefixed by repeated `gh:` prefixes and optionally suffixed by ` (addProjectV2ItemById)`. Other errors SHALL retain their failure treatment without duplicate-error verification. If fresh verification fails or does not establish membership in the destination Project, publication SHALL retain the existing issue identity and receipt with insertion pending and report partial failure. Recovery SHALL reuse the existing issue rather than create another issue to resolve membership.

#### Scenario: Insertion visible on the first read

- **WHEN** the direct item read of the added item returns the destination Project and the published issue on its first read
- **THEN** publication reports complete without waiting.

#### Scenario: Lagging direct visibility

- **WHEN** the added item becomes visible to the direct read only on a later attempt within five reads
- **THEN** publication waits two seconds before each repeated read and reports complete.

#### Scenario: Unverified insertion

- **WHEN** none of the five verification reads finds the issue in the destination Project
- **THEN** publication returns partial failure with `Project membership not verified`, the insertion pending, and the created issue preserved.

#### Scenario: Item of another issue

- **WHEN** the direct item read returns an item whose content is not the published issue
- **THEN** that read does not count as membership.

#### Scenario: Insertion response without an item id

- **WHEN** the add mutation succeeds without an item id in its response
- **THEN** publication verifies membership with the issue-side read instead of failing at once.

#### Scenario: Issue already in the Project

- **WHEN** the issue-side read before adding finds an item of the issue in the destination Project, archived or not
- **THEN** publication counts the issue as verified without sending the add mutation.

#### Scenario: Other Projects and null Project items

- **WHEN** the issue-side read finds only items of other Projects or a `null` Project items connection
- **THEN** the issue counts as not yet a member of the destination Project.

#### Scenario: Recovery after an unverified insertion

- **WHEN** recovery runs after an unverified insertion and the issue-side read finds the issue in the destination Project
- **THEN** recovery reports complete without repeating the add mutation or creating another issue.

#### Scenario: Concurrent auto-add establishes requested membership

- **WHEN** auto-add inserts the issue after the initial membership check and insertion returns a qualifying duplicate-content error
- **THEN** publication performs fresh issue-side verification and reports complete only when the destination Project membership is confirmed within the existing bound.

#### Scenario: Duplicate response without verified destination membership

- **WHEN** insertion returns a qualifying duplicate-content error but subsequent reads find no membership, find only another Project, or fail
- **THEN** publication reports partial failure and retains the existing issue identity and receipt with insertion pending for recovery.

#### Scenario: Unrelated insertion error remains a failure

- **WHEN** insertion fails with another message, mixed GraphQL errors, or a duplicate error tied to another mutation
- **THEN** the operation preserves the failure rather than accepting the error as membership or starting duplicate-error verification.

#### Scenario: Recovery encounters concurrent insertion

- **WHEN** recovery retries pending insertion of the existing issue and receives a qualifying duplicate-content error
- **THEN** it verifies destination membership through fresh issue-side reads and completes only on confirmation without creating another issue.
