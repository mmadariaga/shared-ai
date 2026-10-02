# to-backlog-conversation-capture Specification

## Purpose
Capture one agreed work item from the active conversation while retaining relevant decisions and requiring explicit approval before publication.

## Requirements

### Requirement: Retained conversation extraction

The to-backlog skill SHALL operate in the current conversation, prioritize recent messages while retaining earlier decisions that still apply, and draft only one title and description with Markdown allowed in the description. It SHALL summarize agreed work rather than copy the complete transcript, exclude credentials and private incidental information, and request clarification when the intended item is unclear or several items are possible. It SHALL NOT implement production code from the captured work.

#### Scenario: One clear work item

- **WHEN** the conversation identifies one proposed work item with relevant earlier decisions
- **THEN** the skill drafts its title and description from the retained context without starting implementation.

#### Scenario: Ambiguous work item

- **WHEN** several tasks could be captured or the intended work is unclear
- **THEN** the skill asks which item to capture and waits before proceeding.

### Requirement: Exact publication confirmation

The skill SHALL present the complete title, description, repository, Project name and link, and repository visibility before publication. It SHALL explicitly warn when content will be public and request confirmation of the exact issue and Project. Confirm, edit, and cancel SHALL be offered; an edit to content or destination SHALL require renewed inspection and full confirmation. Invocation, unattended mode, and a general prior grant SHALL NOT replace explicit approval of the current proposal.

#### Scenario: Approved proposal

- **WHEN** the user explicitly confirms the displayed content and destination
- **THEN** the skill passes the unchanged proposal and its confirmation token to the selected publication adapter.

#### Scenario: Cancellation

- **WHEN** the user cancels the proposal
- **THEN** the skill ends without publishing an issue.

#### Scenario: Proposal edit

- **WHEN** the user changes the content or destination
- **THEN** the skill returns to inspection and obtains a new full confirmation before publication.

### Requirement: Single workflow ownership

The common skill SHALL own extraction, clarification, destination resolution, proposal review, confirmation, and result presentation. Provider instruction files SHALL supply platform-specific requirements, operations, and results without duplicating that workflow. The skill SHALL load safe-operations before publication and stop when required tools are unavailable or denied, retaining the draft.

#### Scenario: Provider-specific inspection

- **WHEN** resolution identifies a supported provider
- **THEN** the common skill loads that provider's instruction file for mechanics while retaining ownership of review and confirmation.
