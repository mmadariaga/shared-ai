# from-next-backlog-item Specification

## Purpose
Complete available backlog destination information before asking the user and select an importable next GitLab issue from the highest available priority group.

## Requirements

### Requirement: Resolve available destination information before asking

The selector SHALL use supplied destination information and the existing Git destination resolver to complete missing provider and destination fields before requesting user input. It SHALL preserve complete explicit destinations and supported filters.

#### Scenario: GitLab destination is available from Git

- **WHEN** no provider or project is supplied and Git remotes identify one GitLab project
- **THEN** the selector SHALL resolve that provider and project and proceed to issue selection without a destination question.

#### Scenario: Explicit destination and filters are complete

- **WHEN** the request supplies a complete GitLab destination and supported filters
- **THEN** the selector SHALL use that destination and those filters without consulting Git to replace them.

#### Scenario: Equivalent remotes identify one repository

- **WHEN** remote URLs use different supported address forms for the same host and repository
- **THEN** the selector SHALL treat those URLs as one destination rather than require a destination choice.

### Requirement: Retain resolved context while requesting missing information

An unresolved selection SHALL remain pending and retain known selection context and available destination candidates. The skill SHALL ask only for unresolved components. A conflicting explicit provider and repository SHALL remain pending rather than silently replace either identity.

#### Scenario: Provider is known but repository is ambiguous

- **WHEN** Git remotes identify multiple GitLab repositories and no project is supplied
- **THEN** the selector SHALL retain GitLab as the known provider and report the unresolved repository choice without offering a provider question.

#### Scenario: Explicit identities conflict

- **WHEN** the explicit provider conflicts with the supplied repository address
- **THEN** the selector SHALL return a pending destination-conflict result without selecting an item.

### Requirement: Default GitLab selection to open project issues

GitLab selection SHALL use project issues when `pile` is omitted and SHALL default the issue query to `state: opened`. Supported explicit filters SHALL override defaults and constrain membership. Supported filters SHALL be `state`, `labels`, `milestone`, and `assignee_id`, with string values.

#### Scenario: No pile or filters are supplied

- **WHEN** a GitLab project is resolved and the request omits the pile and filters
- **THEN** the selector SHALL retrieve open project issues.

#### Scenario: Explicit supported filters override defaults

- **WHEN** the request supplies `state: closed` and supported issue-list filters
- **THEN** the selector SHALL query closed issues with the supplied filters rather than replace them with default filters.

### Requirement: Return the highest available GitLab priority group

The selector SHALL treat non-negative safe-integer `relative_position` values as valid manual positions. It SHALL return every member at the smallest valid position when any valid position exists. When none exists, it SHALL return all matching members as equally eligible candidates. It SHALL NOT require every member to have a valid position or impose a deterministic tie-break.

#### Scenario: Positioned and unpositioned issues coexist

- **WHEN** matching members include unavailable positions, two members at position zero, and a member at a larger valid position
- **THEN** the candidate group SHALL contain exactly the two members at position zero.

#### Scenario: No member has a valid position

- **WHEN** every matching member has an absent, negative, non-integer, or unsafe manual position
- **THEN** the candidate group SHALL contain every matching member.

### Requirement: Validate candidate membership and importability

GitLab selection SHALL establish complete matching membership before returning candidates. Every highest-priority candidate SHALL be an ordinary issue with a positive issue identifier and a reference matching the resolved project and issue identifier. A non-importable highest-priority member SHALL keep selection pending without silently skipping that member.

#### Scenario: Highest-priority group contains an incident

- **WHEN** an ordinary issue and an incident share the highest available priority
- **THEN** the selector SHALL return a pending non-importable result instead of selecting only the ordinary issue.

#### Scenario: Candidate reference identifies another project

- **WHEN** a highest-priority member has a reference inconsistent with the resolved project
- **THEN** the selector SHALL keep selection pending without returning an import reference.

#### Scenario: Query membership is incomplete

- **WHEN** pagination or response validation does not establish complete matching membership
- **THEN** the selector SHALL keep selection pending rather than report candidates or an empty pile.

### Requirement: Choose a returned candidate without a user tie-break question

A successful GitLab candidate result SHALL contain `status: candidates`, the provider, candidate references, the project pile, and the available ordering description. The selector CLI SHALL treat this result as success. The skill SHALL choose any one returned candidate without asking the user to break a tie and SHALL pass its exact reference to the existing authoritative import flow.

#### Scenario: Multiple equally prioritized candidates are returned

- **WHEN** the helper returns several valid candidates at the same highest priority
- **THEN** the skill SHALL choose any member of that candidate set and import its exact reference without a tie-breaking question.

#### Scenario: Candidate result reaches the CLI

- **WHEN** GitLab selection returns a successful candidate group
- **THEN** the CLI SHALL emit that candidate result and exit with code zero.

### Requirement: Keep unsupported GitLab pile contexts pending

GitLab requests that specify a board, list, or view SHALL remain pending because the issue-list adapter cannot establish their membership and order. An explicit unsupported pile SHALL NOT be replaced silently by project issues.

#### Scenario: Explicit board is requested

- **WHEN** the request specifies a GitLab board
- **THEN** the selector SHALL report unavailable board ordering and SHALL NOT substitute the project issue list.

#### Scenario: Unsupported explicit pile is requested

- **WHEN** the request supplies a pile other than project issues
- **THEN** the selector SHALL keep selection pending and request a supported pile rather than apply the omitted-pile default.
