# to-backlog-github-publication Specification

## Purpose
Publish approved work to a GitHub repository issue and Project with verified destinations, faithful content, and conservative recovery.

## Requirements

### Requirement: Read-only GitHub destination inspection

The adapter SHALL check gh availability and github.com authentication, inspect repository visibility and issue support, and reject inaccessible, archived, or issue-disabled repositories. An explicit Project URL SHALL identify an open writable user or organization Project independently of repository ownership. Without an explicit Project, inspection SHALL exhaust linked Project pages, exclude closed or non-writable Projects, select exactly one valid candidate, and request clarification for zero or multiple candidates. Failed or incomplete queries SHALL remain errors rather than empty discovery results.

#### Scenario: Unique linked Project

- **WHEN** complete discovery finds one open writable Project across all linked Project pages
- **THEN** inspection returns that Project, repository visibility, approved-content proposal, and confirmation token.

#### Scenario: Explicit independently owned Project

- **WHEN** the user supplies a valid writable Project whose owner differs from the repository owner
- **THEN** inspection uses that Project rather than imposing an owner match.

#### Scenario: Failed Project query

- **WHEN** linked Project discovery fails or pagination is incomplete
- **THEN** the adapter reports the query error instead of claiming that no Projects exist.

### Requirement: Faithful confirmed issue publication

Publication SHALL re-query the proposal and reject a missing or mismatched confirmation token before attempting issue creation. The token SHALL bind content, repository, Project, and visibility. The adapter SHALL invoke gh with separate arguments, no shell interpretation, and structured JSON input; it SHALL preserve the approved title and description exactly, create one repository issue, and then add it to the verified Project. It SHALL NOT automatically add labels, assignees, priority, estimates, sprints, or create Projects, install tools, or change authentication.

#### Scenario: Content or visibility changes before publication

- **WHEN** publication inspection differs from the confirmed proposal or the confirmation token is absent
- **THEN** publication fails before issue creation and requires renewed review.

#### Scenario: Markdown publication

- **WHEN** approved content contains Markdown, Unicode, or shell-looking text
- **THEN** the adapter publishes that content unchanged as data without executing it.

### Requirement: Private bounded publication receipts

Publication and recovery SHALL require an absolute receipt path in an existing private local directory outside the target repository, including when invoked from a nested directory or through symlink aliases. On non-Windows platforms, receipt directories and existing files SHALL be private and owned by the current user. Existing receipt files SHALL be regular, non-symlink files with one hard link. New publication SHALL create a restrictive-permission receipt exclusively and refuse to overwrite an existing receipt to start another creation.

#### Scenario: Repository-contained receipt

- **WHEN** the supplied receipt resolves within the repository
- **THEN** the adapter rejects it before accessing GitHub or writing the receipt.

#### Scenario: Existing publication receipt

- **WHEN** publication is invoked with a receipt already used for an attempt
- **THEN** the adapter refuses to overwrite it and does not create another issue.

### Requirement: Conservative publication results and recovery

The adapter SHALL distinguish complete publication, failure before publication, partial failure, and uncertain creation. It SHALL preserve a created issue and return its identification when insertion cannot be confirmed. Recovery SHALL never create an issue; it SHALL verify identity, repository, Project, visibility, issue content, and Project membership before attempting only pending insertion. Changed identity, destination, visibility, or known issue content SHALL block further insertion.

#### Scenario: Project insertion failure

- **WHEN** issue creation succeeds but insertion fails
- **THEN** the adapter returns partial failure with the existing issue link and permits recovery of insertion without another creation.

#### Scenario: Lost insertion response

- **WHEN** insertion may have succeeded but its response was lost
- **THEN** recovery checks Project membership and avoids repeating an already completed insertion.

#### Scenario: Recovery content or visibility drift

- **WHEN** the known issue content or repository visibility changes after creation
- **THEN** recovery blocks insertion and requests fresh review without overwriting the changed issue or recreating it.

### Requirement: Uncertain creation verification

Before creation, the adapter SHALL record existing issue identifiers. When creation has an uncertain result, recovery SHALL enumerate issues and return candidates absent from that baseline matching approved content and authenticated author. It SHALL require the user to identify the verified issue by URL; a concurrent matching issue SHALL NOT be treated as proof. If the issue cannot be established, the outcome SHALL remain uncertain without automatic recreation.

#### Scenario: Lost creation response

- **WHEN** creation may have succeeded but the response was lost
- **THEN** recovery returns matching candidates and waits for a verified issue URL before recovering insertion.

#### Scenario: No verified issue

- **WHEN** verification establishes no issue belonging to the attempt
- **THEN** recovery remains uncertain and requests manual verification without creating another issue.
