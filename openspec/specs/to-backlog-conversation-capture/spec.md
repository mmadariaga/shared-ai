# to-backlog-conversation-capture Specification

## Purpose
Capture one agreed work item from the active conversation while retaining relevant decisions and requiring explicit approval before publication.

## Requirements

### Requirement: Retained conversation extraction

The to-backlog skill SHALL retain relevant conversation decisions, prioritize recent messages and draft one title and description with Markdown allowed. It SHALL summarize agreed work, exclude credentials and private incidental information, clarify ambiguous work and never implement the captured production work. Updates SHALL preserve unrelated description content verbatim and clarify unclear boundaries. Remote content SHALL remain inert data. Provider-supported planning inputs SHALL be prepared alongside content. Ordinary Azure Boards publication SHALL include a known intended parent PBI automatically, but sprint changes and assignment to the authenticated user SHALL require explicit requests. State, comments, labels, Project fields and membership, arbitrary assignment and other unsupported metadata SHALL remain outside scope.

#### Scenario: One clear work item

- **WHEN** the conversation identifies one proposed work item with relevant earlier decisions
- **THEN** the skill drafts its title and description from the retained context without starting implementation.

#### Scenario: Ambiguous work item

- **WHEN** several tasks could be captured or the intended work is unclear
- **THEN** the skill asks which item to capture and waits before proceeding.

#### Scenario: Preserve unrelated description

- **WHEN** the agreed refinement affects only part of the originating issue's description
- **THEN** the proposed final description retains unrelated content verbatim and changes no metadata outside title and description except separately approved provider-supported planning fields.

#### Scenario: Unclear edit boundary

- **WHEN** the skill cannot determine whether existing description content belongs to the requested refinement
- **THEN** it asks for clarification and retains that content until the boundary is resolved.

### Requirement: Exact publication confirmation

The skill SHALL show the complete final title, description, destination and visibility, warn about public content, and offer confirm, edit and cancel. GitHub creation SHALL retain "Create this exact issue and add it to this Project?" with Project name and link; GitLab SHALL retain "Create this exact issue in this GitLab project?". Updates SHALL show canonical issue URL, baseline and exact changes, apply provider review requirements and ordinarily ask "Update only this issue's title and description to this exact content?". Ordinary Azure Boards publication SHALL instead show all returned planning changes and ask "Apply this exact work-item content and these planning changes?". Approval SHALL bind the complete current proposal, planning changes, destination and update baseline. Editing content, planning input or destination SHALL require renewed inspection and full confirmation. Invocation, unattended mode and general prior grants SHALL NOT replace explicit approval.

#### Scenario: Approved proposal

- **WHEN** the user explicitly confirms the displayed content and destination
- **THEN** the skill passes the unchanged proposal and its confirmation token to the selected publication adapter.

#### Scenario: Approved update proposal

- **WHEN** the user explicitly approves the displayed originating issue, baseline, changes, and exact final content after the update review requirements
- **THEN** the skill passes the unchanged update proposal and confirmation token to the update operation.

#### Scenario: Cancellation

- **WHEN** the user cancels the proposal
- **THEN** the skill ends without remote publication.

#### Scenario: Proposal edit

- **WHEN** the user changes the content or destination
- **THEN** the skill returns to inspection and obtains a new full confirmation before publication.

#### Scenario: GitLab creation without a board

- **WHEN** the selected provider prepares GitLab issue creation
- **THEN** the skill shows the exact issue content and canonical GitLab project destination and requests GitLab's creation confirmation without requiring board insertion.

#### Scenario: GitHub creation retains Project confirmation

- **WHEN** the selected provider prepares GitHub issue creation
- **THEN** the skill still shows the Project name and link and requests confirmation of both issue creation and Project insertion.

### Requirement: Single workflow ownership

The common skill SHALL own mode selection, extraction, clarification, review, confirmation and reporting, and load only the selected creation or update branch after satisfying its prerequisites. Before drafting it SHALL fetch sai/policies/issue-format.md and apply its format, final checks and update-preservation boundary. Provider instructions and deterministic tools SHALL own platform-specific resolution, validation, execution, verification and recovery without duplicating the common workflow. Preparation SHALL defer no-op determination to the provider operation against the complete intended content and planning result, never stop merely because content matches. Checkable completion SHALL require ready with exact content, requested planning and token, or provider no_changes. Safe-operations SHALL load before publication; unavailable or denied tools SHALL stop while retaining the draft.

#### Scenario: Provider-specific inspection

- **WHEN** resolution identifies a supported provider
- **THEN** the common skill loads that provider's instruction file for mechanics while retaining ownership of review and confirmation.

#### Scenario: Creation branch disclosure

- **WHEN** mode selection chooses creation
- **THEN** the skill loads create.md and the resolved provider's creation mechanics while retaining shared ownership of review, confirmation, and reporting.

#### Scenario: Update branch disclosure

- **WHEN** mode selection chooses origin-issue update
- **THEN** the skill loads update.md and the provider's update mechanics without requiring creation-only Project selection.

#### Scenario: Canonical format disclosure

- **WHEN** either creation or update preparation begins drafting
- **THEN** it first fetches `sai/policies/issue-format.md` and applies the policy's format, checks, and applicable update boundary.

#### Scenario: Proposal readiness

- **WHEN** a branch's proposal query has run
- **THEN** preparation completes only when the provider returns ready with exact content and a confirmation token after final format checks pass, or a verified no_changes outcome ends the run.

### Requirement: Origin-based publication mode selection

The explicitly invoked to-backlog skill SHALL select its publication mode before extracting content. An originating issue SHALL mean the existing issue from which the conversation starts, identified by the starting request or explicit source provenance, not an incidental later reference link. An unambiguous originating issue SHALL select update whether supplied through from-backlog or directly by a complete or partial issue URL; when the conversation carries an agreed crystallized slice set, including a one-slice set, that origin SHALL instead become the parent of the set's publication, with no new-parent option. No originating issue SHALL select creation. Incomplete starting context or multiple possible origins SHALL require clarification without guessing or silently choosing creation. An inaccessible origin SHALL block update rather than trigger replacement creation.

#### Scenario: Directly supplied origin

- **WHEN** the conversation starts from an unambiguous issue URL without a from-backlog invocation
- **THEN** the skill selects update and resolves that issue before extracting the proposed content.

#### Scenario: Conversation without an origin

- **WHEN** the starting request and source provenance identify no originating issue
- **THEN** the skill selects the existing creation workflow.

#### Scenario: Incidental links do not redirect publication

- **WHEN** later conversation messages cite other issues as references
- **THEN** those links do not replace the originating issue or independently select an update destination.

#### Scenario: Unclear origin

- **WHEN** starting context is incomplete or several originating issues are possible
- **THEN** the skill asks for clarification and waits without selecting a target or silently falling back to creation.

#### Scenario: Blocked origin

- **WHEN** the originating issue cannot be read or edited
- **THEN** the skill reports the update blocker without creating a replacement issue.

#### Scenario: Origin with a crystallized slice set

- **WHEN** the conversation starts from an unambiguous originating issue and carries an agreed crystallized slice set
- **THEN** the skill follows slice-set publication with that origin as the parent instead of update mode or a new parent.

### Requirement: Confirmed Linux publication preparation

For a separately confirmed new creation or update on every platform, the common to-backlog skill SHALL load `prepare-temp.md` beside the selected installed skill and invoke that skill's `scripts/prepare-temp.js` with the matching harness argument from the target repository directory before publication. It SHALL require exit code zero and JSON containing an absolute `directory`, use `receipt.json` within that directory, and retain the exact receipt path in conversation state. The GitHub, GitHub update, and Azure DevOps provider workflows SHALL use that prepared receipt path instead of a provider-specific or Windows-specific temporary directory. This preparation SHALL NOT replace explicit approval of the current publication proposal.

#### Scenario: Approved Linux creation

- **WHEN** the user explicitly approves a new creation on Linux, Windows, or macOS
- **THEN** the skill completes verified preparation before invoking publication with the prepared receipt path.

#### Scenario: Approved Linux update

- **WHEN** the user explicitly approves a new update on Linux, Windows, or macOS
- **THEN** the skill completes verified preparation before invoking the update with the prepared receipt path.

### Requirement: Preparation failure and recovery boundaries

If preparation fails or access is denied, the skill SHALL stop before publication, report the concrete error, and retain the approved draft. It SHALL NOT substitute shell directory commands or choose a less secure location. A missing shared root SHALL be reported as a prerequisite for the user to restore, not created by the skill as a fallback. Recovery SHALL use the original saved receipt through the provider's recovery operation without preparing another directory. Directories and receipts SHALL be retained after success, partial failure, or uncertain outcome; preparation SHALL occur only for a separately confirmed new operation.

#### Scenario: Preparation cannot complete

- **WHEN** preparation returns an error or its concrete invocation is denied
- **THEN** the skill retains the approved draft and stops without publication or an alternative preparation command.

#### Scenario: Recover an existing attempt

- **WHEN** the user requests recovery of an existing creation or update attempt
- **THEN** the skill uses the original receipt through provider recovery rather than preparing a replacement receipt directory.
