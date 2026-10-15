# to-pr Specification

## Purpose
Prepare, review, create, and update GitHub pull requests and GitLab merge requests from committed Git changes with explicit remote-operation approvals and safe recovery.

## Requirements

### Requirement: Committed Git preparation with optional OpenSpec context

The to-pr skill SHALL prepare titles and descriptions primarily from committed branch history and diff against a verified target ref. It SHALL distinguish pending staged, unstaged, and untracked files, SHALL NOT create commits or automatically include pending files, and SHALL NOT require OpenSpec or generate pr.md. Relevant OpenSpec documents MAY supply supporting context but MUST NOT override Git evidence. Existing user documents SHALL be preserved.

#### Scenario: Prepare without OpenSpec
- **WHEN** a Git repository has committed branch changes but no relevant OpenSpec documents
- **THEN** preparation uses committed Git evidence and continues without an OpenSpec prerequisite.

#### Scenario: Pending files are present
- **WHEN** collection finds staged, unstaged, or untracked files
- **THEN** it reports pending state separately and does not incorporate those files or commit them automatically.

#### Scenario: The target ref is unavailable
- **WHEN** the selected target has no usable local or remote-tracking ref for collection
- **THEN** preparation stops or asks how to obtain the ref rather than inventing a diff.

### Requirement: Create or update the exact matching request

The system SHALL query open requests for the selected source repository, source branch, target repository, and target branch. One existing match SHALL select update instead of duplicate creation; multiple matches SHALL block publication for clarification. Updates SHALL write only title and description. Identical content SHALL end without mutation, where the compared description is the computed description including any tool-owned closing block. Titles SHALL use the existing shared title validator.

#### Scenario: Existing request receives a content update
- **WHEN** exactly one open request matches the selected source and destination
- **THEN** the proposed operation updates only its title and description and does not create another request.

#### Scenario: Matching requests are ambiguous
- **WHEN** more than one open request matches
- **THEN** publication stops for clarification without mutation.

#### Scenario: Content is unchanged
- **WHEN** the existing title and description already match the proposed content, including the recomputed closing block
- **THEN** the operation ends without mutation.

#### Scenario: Title validation fails
- **WHEN** a proposed title violates the existing title rules
- **THEN** querying rejects the title before publication.

### Requirement: Complete presentation and exact publication approval

The skill SHALL apply the same approval workflow on Claude Code and opencode. Before asking for approval, it SHALL complete `query` and, when publication is ready, `push-query`. It SHALL show the operation, platform, repository, visibility, source branch, target branch, existing request URL when updating, and complete proposed title and description. Updates SHALL also show their baseline and changes, preserving unrelated description content unless replacement is explicitly approved. Any proposal concurrency warning and every entry of the `query` result's `warnings` SHALL be shown verbatim before approval. For Azure updates, the warning SHALL disclose that the interval between reread and PATCH is not protected against concurrent edits; rereading SHALL NOT be described as atomic protection. Public destinations SHALL receive an explicit warning.

When `push-query` returns `ready`, the skill SHALL also show the exact remote, push URL, branch, and commit, then ask exactly "Push this commit to this remote branch without force and publish the title and description above?" It SHALL offer "Approve PR message and push branch", "Edit", and "Cancel" on GitHub and Azure Repos, substituting "MR" for "PR" on GitLab.

When `push-query` returns `no_changes`, the skill SHALL ask "Publish this exact title and description to this destination?" It SHALL offer "Approve PR message", "Edit", and "Cancel" on GitHub and Azure Repos, substituting "MR" for "PR" on GitLab.

The skill SHALL wait for an explicit answer binding the exact proposal and each operation named in the question. Invocation, unattended mode, and general prior grants SHALL NOT authorize these operations. Cancellation SHALL perform none of the operations proposed in that question and SHALL preserve the draft. Editing SHALL apply the edits, rerun `query` and `push-query` as applicable, present the complete updated proposal, and require fresh approval.

Changed content, destination, baseline, or HEAD SHALL invalidate stale approval and require full presentation and renewed approval for still-pending operations only. A completed push SHALL NOT be repeated.

#### Scenario: Approve a combined push and publication
- **WHEN** publication is ready and the remote branch does not contain the selected commit
- **THEN** the skill presents the complete publication proposal, warnings, and exact push details, asks the exact combined question, and waits for explicit approval of both operations.

#### Scenario: Approve publication
- **WHEN** publication is ready and `push-query` reports that the remote branch already holds the approved commit
- **THEN** the skill presents the complete publication proposal and asks only the publication approval question with publication-only approval, Edit, and Cancel options.

#### Scenario: Provider terminology matches the destination
- **WHEN** the skill presents either approval question
- **THEN** its approval option uses PR on GitHub and Azure Repos and MR on GitLab.

#### Scenario: Cancel publication
- **WHEN** the user selects Cancel at either approval question
- **THEN** the skill performs none of the operations proposed in that question and preserves the draft.

#### Scenario: Edit before approval
- **WHEN** the user selects Edit
- **THEN** the skill applies the edits, reruns the applicable publication and push queries, presents the complete updated proposal, and requests fresh approval.

#### Scenario: Approved content or state changes
- **WHEN** content, destination, baseline, or HEAD changes before all approved operations finish
- **THEN** stale approval is rejected and the skill returns to complete presentation and fresh authorization for still-pending operations without repeating a completed push.

#### Scenario: Azure update concurrency limitation
- **WHEN** an Azure update proposal is presented for approval
- **THEN** the skill shows its exact concurrency warning before the question and the publication token binds that proposal and baseline.

#### Scenario: Query warnings are shown before approval
- **WHEN** the `query` result carries warnings
- **THEN** the skill shows every entry verbatim before asking for approval.

### Requirement: Independent non-force push authorization

The system SHALL retain independent tokens and validation for a necessary non-force push and publication while permitting one explicit human approval to authorize both exact operations. Before that approval, the skill SHALL show the exact remote, push URL, branch, commit, and complete publication proposal and SHALL name both operations in the combined question.

The same explicit answer SHALL authorize `approved:true` separately for the push token and publication token. Tokens SHALL NOT be combined or interchangeable. The existing token derivation and validation SHALL remain unchanged.

When a push is required, the system SHALL execute that approved non-force push first and verify that the remote source branch contains the approved HEAD before preparing and executing publication. It SHALL NOT offer a publication-only bypass for a required push. Force pushes, automatic commits, authentication changes, and installation SHALL remain prohibited.

A publication `query` result of `no_changes` SHALL end the flow without mutation or a push approval question, including when an existing request has identical content but the branch has unpushed commits.

#### Scenario: Push requires separate consent
- **WHEN** the remote source branch does not contain the selected HEAD and the user approves the combined question
- **THEN** the answer authorizes the exact push and publication through their separate tokens and validation checks.

#### Scenario: Tokens cannot substitute for one another
- **WHEN** a publication token is supplied for a push or a push token is supplied for publication
- **THEN** validation rejects the operation without performing that mutation.

#### Scenario: Push is declined
- **WHEN** the user cancels the combined approval question
- **THEN** neither the required push nor dependent publication executes and the draft is preserved.

#### Scenario: Push is approved
- **WHEN** the exact combined proposal receives approval and a push is needed
- **THEN** the system pushes without force, verifies the remote branch contains the approved HEAD, prepares the publication receipt, and only then publishes.

#### Scenario: Identical publication content ends the flow
- **WHEN** publication `query` returns `no_changes`, even if the source branch contains unpushed commits
- **THEN** the skill ends without mutation and does not offer a push question.

### Requirement: Private publication receipts and safe preparation

Publication SHALL record its proposal in a new receipt outside the repository before the remote mutation. Receipt paths SHALL reject repository containment, symlinked paths, and existing files that are not regular single-link files; POSIX receipt directories and files SHALL be private and owned by the current user. Preparation SHALL use an existing nonsymlink temporary root, use `/tmp/opencode` for OpenCode on Linux and the operating system temporary directory otherwise, and create a private child directory on POSIX. Missing roots SHALL produce a concrete blocker without root creation or repair.

#### Scenario: Unsafe receipt path
- **WHEN** publication or recovery receives an unsafe receipt path
- **THEN** receipt validation rejects it before publication mutation or recovery provider contact.

#### Scenario: Required temporary root is missing
- **WHEN** preparation cannot find its required temporary root
- **THEN** it reports the missing root and restoration guidance without creating, replacing, or repairing that root.

#### Scenario: Existing receipt would be reused
- **WHEN** publication attempts to create a receipt at an existing file
- **THEN** exclusive receipt creation prevents overwriting it and no publication mutation follows.

### Requirement: Verified publication and read-only uncertain-outcome recovery

The system SHALL verify published content by reading the selected destination after mutation. An uncertain response SHALL NOT authorize repeated creation. Recovery SHALL perform reads only, verify repository identity, and check requests for the selected source and target and the exact approved content. An unverifiable result SHALL report uncertainty and the receipt location. An unapplied update SHALL require reconciliation and fresh approval before retrying. Azure publication SHALL save private destination, approved content, branches, commit, and pre-publication request IDs before mutation and retain a verified write-response identity when available. Azure recovery SHALL verify project, repository, authenticated identity, visibility, branches, commit, and full content. Without a write-response identity, a creation candidate SHALL also match the author, be absent from saved IDs, and have its actual URL confirmed by the user. A coincident title SHALL NOT establish publication evidence. Zero or ambiguous eligible candidates SHALL require clarification, not repeated creation. Confirmed write rejection SHALL remain distinct from uncertainty; failed readback after a write SHALL remain uncertain even when the read itself is rejected.

#### Scenario: Creation response is lost
- **WHEN** creation may have succeeded but its response is uncertain
- **THEN** recovery queries the selected destination without creating another request.

#### Scenario: Published content is verified
- **WHEN** exactly one eligible request has the approved title and description at the verified destination
- **THEN** recovery reports completion with that request's verified URL.

#### Scenario: Recovery cannot verify the outcome
- **WHEN** the request content or destination identity cannot be verified
- **THEN** the system reports a concrete blocker or uncertainty instead of claiming success or repeating creation.

#### Scenario: Azure creation identity needs confirmation
- **WHEN** the Azure creation response is lost and compatible candidates are found through queries
- **THEN** recovery remains uncertain until the actual created URL identifies one eligible candidate and never creates another request.

#### Scenario: Azure candidate commit differs
- **WHEN** an Azure recovery candidate has the approved title and description but a different source commit
- **THEN** recovery does not claim completion.

#### Scenario: Azure write readback is rejected
- **WHEN** an Azure write returned successfully but its verification read is forbidden or fails
- **THEN** the outcome remains uncertain with the saved receipt rather than being reported as a confirmed write rejection.

### Requirement: Azure Repos Services publication adapter

The shipped provider registry SHALL include an Azure DevOps Services adapter and conditional provider reference for to-pr. It SHALL verify organization, project, repository, authenticated identity, and source and target branches before publication, and reject Server or incompatible destinations. Queries SHALL identify active requests by repository and both branches, block multiple matches, and retain Markdown descriptions. Creation SHALL supply the exact source and target refs; updates SHALL change only title and description.

Azure publication SHALL use the shared complete-proposal approval workflow: combined human approval when a push is required and publication-only approval otherwise. Push and publication SHALL retain separate tokens and validation. Azure approval options SHALL use PR terminology. Azure execution SHALL reuse the existing authenticated runner without installation, login, credential changes, or global-default changes. The adapter and its recovery mechanisms SHALL remain unchanged by the combined human approval.

#### Scenario: Azure creation is selected
- **WHEN** destination resolution selects a valid Azure Repos Services repository with no matching active request
- **THEN** preparation loads only the Azure provider reference and prepares exact repository, branches, title, and Markdown description for explicit approval.

#### Scenario: Azure update is selected
- **WHEN** exactly one active Azure request matches the repository and both branches
- **THEN** preparation selects that request for a title-and-description-only update rather than duplicate creation.

#### Scenario: Azure branch needs publication
- **WHEN** the remote source branch does not contain the approved commit
- **THEN** the skill requests combined push and publication approval with a PR label and publication remains blocked until the approved non-force push and remote verification complete.

#### Scenario: Azure access is unavailable
- **WHEN** CLI, installed extension, authentication, repository access, or compatible destination identity is unavailable
- **THEN** preparation reports a concrete blocker without publishing or altering the environment.

#### Scenario: Azure adapter is installed on both harnesses
- **WHEN** installation projections expand for Claude Code and opencode
- **THEN** both include the Azure provider reference, adapter, and shared transport tools under managed content tracking without new direct Azure CLI or push permission grants.

### Requirement: Closing set from commit closing keywords

For GitHub and GitLab destinations, `query` SHALL compute the closing set from the subjects and bodies of the `base..HEAD` commits. A commit contributes an issue only when a closing keyword precedes that issue's reference. The keywords are `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, and `resolved`, matched case-insensitively with an optional colon. The reference is `#N`, `owner/repo#N`, `group/project#N`, or an issue URL. Each issue SHALL appear once.
- An issue in the destination repository or project SHALL be written as `Closes #N`.
- An issue in another repository or project on the same host SHALL be written as `Closes owner/repo#N` or `Closes group/project#N`.
- An issue on another host SHALL be left out of the closing set and reported in `warnings`.
- When the commit log cannot be read, `query` SHALL compute no closing references and SHALL report that in `warnings`.

#### Scenario: Keyword issues are normalized against the destination
- **WHEN** the commits contain `Closes #5`, `Fixes: other/repo#6`, a closing keyword before a destination issue URL for issue 7, and `Refs: #8`
- **THEN** the closing block lists `Closes #5`, `Closes other/repo#6`, and `Closes #7`, and it omits issue 8

#### Scenario: An issue on another host is not closable
- **WHEN** a commit closes an issue URL on a host other than the destination
- **THEN** that issue is left out of the block and `query` returns a warning naming it as on another host

#### Scenario: An empty closing set adds no block
- **WHEN** no commit in `base..HEAD` carries a closing keyword before an issue reference
- **THEN** the description is published without a closing block and `query` returns no warnings

### Requirement: Branch-id parent closes only when every child is covered

When the source branch is named `<type>/<id>_<name>` with a numeric `<id>`, the system SHALL add issue `<id>` to the closing set only when that issue has at least one child and every child is either closed in the provider or closed by a keyword in a `base..HEAD` commit. The issue's repository SHALL be the backlog repository in `.sai/settings.jsonc` when it is set, otherwise the destination repository. Children and their state SHALL be read without paging comments or assignees. When the child read fails, the closing set SHALL be computed without that issue and `query` SHALL return a warning that it was not evaluated.

#### Scenario: The last pending child closes the parent
- **WHEN** the branch is `feat/10_closing`, issue 10 has children 11, 12, and 13, child 13 is already closed, and the commits close 11 and 12
- **THEN** the closing block lists `Closes #11`, `Closes #12`, and `Closes #10`

#### Scenario: A pending child keeps the parent open
- **WHEN** the branch is `feat/10_closing` and child 13 of issue 10 is open and not closed by any commit
- **THEN** the closing block omits issue 10

#### Scenario: A non-numeric branch id contributes no parent
- **WHEN** the branch is `feat/abc_closing`
- **THEN** no branch-derived issue enters the closing set

#### Scenario: A failed child read leaves the parent out
- **WHEN** reading the children of the branch issue from the provider fails
- **THEN** the closing set omits that issue and `query` returns a warning that it was not evaluated for closing

### Requirement: Tool-owned closing block at the end of the description

For GitHub and GitLab destinations, `query` SHALL place the closing lines between `<!-- sai-closing-refs:start -->` and `<!-- sai-closing-refs:end -->` at the end of the description before the proposal is presented. On update, the recomputed block SHALL replace any previous marked block and all other text SHALL stay intact. When a closing line elsewhere in the description already covers a closing-set issue, that line SHALL stay where it is and the block SHALL omit that issue. The approved description, including the block, SHALL be what is published.

#### Scenario: A hand-written closing line is kept
- **WHEN** the drafted description already contains `Closes #5` and the commits close issues 5 and 6
- **THEN** the hand-written line stays in place and the block lists only `Closes #6`

#### Scenario: An update replaces the previous block
- **WHEN** the existing description ends with a marked block listing `Closes #99` and the commits now close only issue 5
- **THEN** the proposed description keeps all other text and ends with a block listing only `Closes #5`

#### Scenario: The approved block is published
- **WHEN** a GitHub proposal with a closing block is approved and published
- **THEN** the created request body equals the approved description including the block

### Requirement: Azure Repos descriptions carry no closing block

For Azure Repos destinations, `query` SHALL keep the drafted description unchanged, add no closing block, and read no commit log for closing references.

#### Scenario: Azure description is published as drafted
- **WHEN** an Azure Repos request is queried with a description that contains `Closes #5`
- **THEN** the proposed description equals the drafted description, no warnings are returned, and no `git log` call is made

### Requirement: Preserve separate push and publication failure outcomes

If an approved push fails or cannot be verified, the skill SHALL skip publication, preserve the draft, report the failure, and leave remote history as it is. It SHALL NOT attempt a force push.

When publication fails or remains uncertain after a verified push, the skill SHALL report the completed push and failed or uncertain publication separately and SHALL preserve the draft and pushed branch. Existing read-only recovery SHALL remain in force; an uncertain response SHALL NOT authorize repeated creation or repetition of the completed push.

#### Scenario: Push fails
- **WHEN** the approved non-force push fails
- **THEN** the skill skips publication, preserves the draft and remote history, and reports the push failure without attempting force.

#### Scenario: Push cannot be verified
- **WHEN** a push attempt does not yield verification that the remote branch contains the approved HEAD
- **THEN** publication remains blocked and the skill reports the unverified push while preserving the draft and existing remote history.

#### Scenario: Publication fails after a verified push
- **WHEN** the push is verified but publication fails
- **THEN** the skill reports the completed push and failed publication separately and retains the draft and pushed branch.

#### Scenario: Publication is uncertain after a verified push
- **WHEN** publication returns an uncertain outcome after a verified push
- **THEN** the skill reports the two outcomes separately, retains the draft and branch, and uses existing read-only recovery without repeating the push or treating uncertainty as permission to create again.
