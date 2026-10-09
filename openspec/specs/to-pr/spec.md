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

The system SHALL query open requests for the selected source repository, source branch, target repository, and target branch. One existing match SHALL select update instead of duplicate creation; multiple matches SHALL block publication for clarification. Updates SHALL write only title and description. Identical content SHALL end without mutation. Titles SHALL use the existing shared title validator.

#### Scenario: Existing request receives a content update
- **WHEN** exactly one open request matches the selected source and destination
- **THEN** the proposed operation updates only its title and description and does not create another request.

#### Scenario: Matching requests are ambiguous
- **WHEN** more than one open request matches
- **THEN** publication stops for clarification without mutation.

#### Scenario: Content is unchanged
- **WHEN** the existing title and description already match the proposed content
- **THEN** the operation ends without mutation.

#### Scenario: Title validation fails
- **WHEN** a proposed title violates the existing title rules
- **THEN** querying rejects the title before publication.

### Requirement: Complete presentation and exact publication approval

The skill SHALL show the operation, platform, repository, visibility, source branch, target branch, existing request URL when updating, and complete proposed title and description before asking for publication approval. Updates SHALL also show their baseline and changes, preserving unrelated description content unless replacement is explicitly approved. Any proposal concurrency warning SHALL be shown verbatim before approval. For Azure updates, the warning SHALL disclose that the interval between reread and PATCH is not protected against concurrent edits; rereading SHALL NOT be described as atomic protection. Public destinations SHALL receive an explicit warning. Invocation, unattended mode, and general prior grants SHALL NOT authorize publication. Changed content, destination, baseline, or HEAD SHALL require renewed review and approval.

#### Scenario: Approve publication
- **WHEN** the complete proposal has been presented
- **THEN** the skill offers approve, edit, or cancel and waits for an explicit answer binding the exact proposal and confirmation token.

#### Scenario: Approved content or state changes
- **WHEN** content, destination, baseline, or HEAD changes before publication
- **THEN** the system blocks stale approval and returns to full presentation and fresh authorization.

#### Scenario: Cancel publication
- **WHEN** the user cancels at the publication approval question
- **THEN** the skill ends without publication.

#### Scenario: Azure update concurrency limitation
- **WHEN** an Azure update proposal is presented for approval
- **THEN** the skill shows its exact concurrency warning before the question and the approval token binds that proposal and baseline.

### Requirement: Independent non-force push authorization

The system SHALL authorize any necessary push independently from publication. It SHALL show the exact remote, push URL, branch, and commit before asking approval. Only the separate push approval and token SHALL permit a non-force push. Declining SHALL stop publication that depends on that push. Publication SHALL require verification that the remote source branch contains the approved HEAD.

#### Scenario: Push requires separate consent
- **WHEN** the remote source branch does not contain the selected HEAD
- **THEN** the skill asks independently whether to push that commit to that remote branch without force.

#### Scenario: Push is declined
- **WHEN** the user declines a necessary push
- **THEN** dependent publication stops and the draft is preserved.

#### Scenario: Push is approved
- **WHEN** the exact push proposal receives its separate approval
- **THEN** the system pushes without force and verifies the remote branch before publication.

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

The shipped provider registry SHALL include an Azure DevOps Services adapter and conditional provider reference for to-pr. It SHALL verify organization, project, repository, authenticated identity, and source and target branches before publication, and reject Server or incompatible destinations. Queries SHALL identify active requests by repository and both branches, block multiple matches, and retain Markdown descriptions. Creation SHALL supply the exact source and target refs; updates SHALL change only title and description. Existing complete publication approval and independent non-force branch-push approval SHALL apply unchanged. Azure execution SHALL reuse the existing authenticated runner without installation, login, credential changes, or global-default changes.

#### Scenario: Azure creation is selected
- **WHEN** destination resolution selects a valid Azure Repos Services repository with no matching active request
- **THEN** preparation loads only the Azure provider reference and prepares exact repository, branches, title, and Markdown description for explicit publication approval.

#### Scenario: Azure update is selected
- **WHEN** exactly one active Azure request matches the repository and both branches
- **THEN** preparation selects that request for a title-and-description-only update rather than duplicate creation.

#### Scenario: Azure branch needs publication
- **WHEN** the remote source branch does not contain the approved commit
- **THEN** publication remains blocked until the separate non-force push approval and remote verification are completed.

#### Scenario: Azure access is unavailable
- **WHEN** CLI, installed extension, authentication, repository access, or compatible destination identity is unavailable
- **THEN** preparation reports a concrete blocker without publishing or altering the environment.

#### Scenario: Azure adapter is installed on both harnesses
- **WHEN** installation projections expand for Claude Code and opencode
- **THEN** both include the Azure provider reference, adapter, and shared transport tools under managed content tracking without new direct Azure CLI or push permission grants.
