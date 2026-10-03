# from-backlog-provider-resolution Specification

## Purpose
Resolve concrete GitHub issue references and retrieve complete original issue data through separate registry-selected read-only mechanics.

## Requirements

### Requirement: Registry-selected concrete GitHub references

The common helper SHALL select a read-capable provider from the from-backlog registry and return its provider identifier, instruction reference, adapter, repository, number, and canonical URL. The initial registry SHALL support only github.com and domainless `/owner/repo/issues/123` references. Full URLs SHALL use HTTPS without credentials or custom ports. Query parameters and fragments SHALL NOT change issue identity. Incomplete paths, unsupported hosts, pull-request paths, and invalid issue numbers SHALL be rejected without search or guessing.

#### Scenario: Equivalent concrete references

- **WHEN** a supported full GitHub issue URL or domainless issue path includes query parameters or a fragment
- **THEN** resolution returns the same canonical issue URL without those additions and selects the GitHub provider reference.

#### Scenario: Unsupported or incomplete reference

- **WHEN** the input names another host, an incomplete issue reference, or a pull-request path
- **THEN** resolution returns an explicit rejection without searching for or guessing an issue.

### Requirement: Conditional provider mechanics and separate import helpers

The skill SHALL load provider instructions only after resolving the provider. The common from-backlog helper and its separate GitHub adapter SHALL implement import mechanics without repurposing to-backlog publication helpers. Provider instruction and adapter references SHALL be validated before loading.

#### Scenario: Resolve before provider disclosure

- **WHEN** a GitHub reference resolves successfully
- **THEN** the skill loads the registry-selected GitHub mechanics and uses the separate from-backlog read operation.

### Requirement: Structured read-only GitHub issue retrieval

The GitHub adapter SHALL use structured `gh api graphql` queries against github.com with separate arguments, JSON input, and no shell interpretation. It SHALL identify the retrieved item type and reject pull requests even when supplied through an issue-number path. Readable closed issues and issues in archived repositories SHALL be supported, and their states SHALL be returned without requiring GitHub Projects access or publication permissions.

#### Scenario: Pull request supplied as an issue number

- **WHEN** the resolved issue-number path identifies a pull request
- **THEN** retrieval rejects the item as not an issue before loading its comments.

#### Scenario: Readable closed issue in an archived repository

- **WHEN** GitHub returns a readable closed issue from an archived repository
- **THEN** retrieval returns its original title and description together with the closed and archived states.

### Requirement: Complete paginated comments and explicit failures

Retrieval SHALL preserve original title, description, and comment text as structured data. It SHALL retrieve every comment page and retain comment identifiers, source links, and authors, representing a missing author explicitly. Missing or repeated cursors, repeated or malformed comments, malformed responses, authentication or access errors, and command or buffer failures SHALL produce explicit outcomes. The helper SHALL distinguish `complete`, `incomplete`, and `error`; a failure after retrieving an issue SHALL retain the retrieved parts without reporting completion.

#### Scenario: Multiple comment pages

- **WHEN** an issue's comment connection spans multiple pages
- **THEN** retrieval follows all valid cursors and returns every original comment before reporting complete.

#### Scenario: Later page cannot be retrieved

- **WHEN** a comment-page request fails after the issue and earlier comments were retrieved
- **THEN** retrieval returns incomplete with the retrieved parts and concrete failure rather than silently shortening the comment list.

### Requirement: Missing description is represented without reconstruction

The adapter SHALL return the original description and a missing-description indicator derived from its emptiness. It SHALL NOT replace an empty description with comment content.

#### Scenario: Issue has an empty body and comments

- **WHEN** an issue has an empty description but readable comments
- **THEN** structured retrieval preserves the empty description, marks it missing, and returns comments separately.
