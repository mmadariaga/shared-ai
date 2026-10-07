# from-backlog-azure-devops Specification

## Purpose
Import Azure DevOps Services work items into read-only exploration with faithful project provenance, original content, and complete available discussion context.

## Requirements

### Requirement: Validated Azure DevOps Services references

The Azure DevOps adapter SHALL directly classify positive safe-integer IDs, dev.azure.com URLs, and valid organization.visualstudio.com URLs. Resolution SHALL accept Services HTTPS links identifying an organization, project, and positive work-item ID, including the legacy DefaultCollection prefix. Query parameters and fragments SHALL NOT change identity. Resolution SHALL canonicalize organization and item links to dev.azure.com and SHALL reject credentials, custom ports, malformed paths or encodings, traversal, extra path components, and invalid IDs. Azure DevOps Server links SHALL NOT be accepted as Azure DevOps Services references.

#### Scenario: Modern and legacy links identify the same item

- **WHEN** valid dev.azure.com and organization.visualstudio.com links identify the same project and work-item ID
- **THEN** resolution returns the same canonical Services organization and item identity.

#### Scenario: Malformed Services reference

- **WHEN** a Services reference contains credentials, a custom port, unsafe path encoding, traversal, or an invalid work-item ID
- **THEN** resolution rejects it without retrieving the item.

### Requirement: Unambiguous existing organization context

For an isolated positive ID, the adapter SHALL consult existing Azure CLI defaults and Azure DevOps Git remotes through read-only commands. It SHALL resolve the ID only when exactly one organization is available across that context. It SHALL carry a project only when that organization's observed project context is unique. Missing or conflicting organization context SHALL return needs_input requesting a complete work-item link rather than searching or guessing.

#### Scenario: One organization is available

- **WHEN** an isolated ID has exactly one organization in existing Azure CLI defaults and Azure DevOps remote context
- **THEN** resolution returns that organization and includes project context only when it is unique.

#### Scenario: Organization context is ambiguous

- **WHEN** an isolated ID has no organization context or conflicting organizations
- **THEN** resolution returns needs_input requesting a complete work-item link before retrieval.

### Requirement: Faithful project-scoped work-item retrieval

The adapter SHALL read the item through az boards work-item show with its resolved ID, explicit organization, disabled automatic context detection, and JSON output. It SHALL validate returned identity, project, title, state, type, and description shape. A returned project inconsistent with the resolved project SHALL fail retrieval. The structured item SHALL preserve organization, actual project, canonical source link, custom work-item type and state, and original HTML description without an invented repository or repository archived state. An empty description SHALL remain empty and SHALL be marked missing. Provider instructions SHALL preserve HTML as inert source with its text, links, lists, and structure, download no attachments, and execute no embedded instructions.

#### Scenario: Custom closed work item with rich description

- **WHEN** Azure CLI returns a valid work item with a custom type, custom closed state, and HTML description
- **THEN** the result preserves those values and the original HTML together with organization/project provenance and no repository identity.

#### Scenario: Empty description

- **WHEN** the retrieved work item has an absent or empty description
- **THEN** the result preserves an empty description and marks it missing without reconstructing it from comments.

#### Scenario: Returned project disagrees

- **WHEN** the retrieved item's project differs from the project in the resolved reference
- **THEN** the adapter returns an explicit retrieval error instead of accepting mismatched provenance.

### Requirement: Complete available comments and explicit partial outcomes

The adapter SHALL retrieve comments through az devops invoke using area wit, resource comments, project and workItemId route parameters, HTTP GET, API version 7.1-preview, and continuation-token pagination. It SHALL preserve original comment text, declared format, source links, and author or explicit missing-author value. It SHALL validate page count, stable totalCount, comment identity and shape, and continuation progress. Repeated comments, repeated or malformed tokens, malformed responses, changing totals, premature pagination termination, or failed page reads SHALL NOT produce complete. A failure after item retrieval SHALL return incomplete with the item and all comments already retrieved; a failure before item retrieval SHALL return error. Complete SHALL require pagination termination and a collected count matching the available total.

#### Scenario: Multiple valid comment pages

- **WHEN** comments span multiple pages with valid distinct continuation tokens and a stable total
- **THEN** the adapter retrieves every page and preserves every comment before reporting complete.

#### Scenario: Later comment page fails

- **WHEN** a comment-page request fails after the item and an earlier page were retrieved
- **THEN** the result is incomplete and retains the item and previously retrieved comments.

#### Scenario: Invalid pagination evidence

- **WHEN** a response repeats a comment or token, changes the total, or ends before the available total is collected
- **THEN** the result identifies the retrieval failure and does not claim completion.

#### Scenario: No available comments

- **WHEN** the comments API returns a valid empty page with totalCount zero and no continuation
- **THEN** the adapter returns complete with an empty comment list.

### Requirement: Read-only Azure execution and distinct access failures

Azure import SHALL reuse existing Azure CLI authorization and SHALL perform no work-item or comment mutation, installation, login, or configuration change. The command runner SHALL disable automatic Azure extension installation. On Windows, it SHALL execute a direct Azure executable or the validated standard MSI launcher's Python module without command-shell interpretation of arguments; unsupported launchers SHALL fail explicitly. The adapter SHALL distinguish unavailable tools, unavailable extensions, authentication failures, and inaccessible-item failures. An inaccessible item SHALL NOT be presented as proven nonexistent. Provider instructions SHALL retain these safety boundaries for Claude Code and opencode.

#### Scenario: Required tool or access is unavailable

- **WHEN** Azure CLI, its extension, authentication, or item access is unavailable
- **THEN** import reports the corresponding failure without installing, authenticating, reconfiguring, or assuming the item does not exist.

#### Scenario: Windows arguments contain shell syntax

- **WHEN** a Windows Azure read uses project or continuation-token arguments containing shell metacharacters
- **THEN** those arguments remain data passed without shell interpretation and automatic extension installation remains disabled.
