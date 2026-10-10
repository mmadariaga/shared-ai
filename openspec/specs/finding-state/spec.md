# finding-state Specification

## Purpose
TBD - created by archiving change sai-review-single-fix-round. Update Purpose after archive.

## Requirements

### Requirement: Fixable Finding Definition

The policy `sai/policies/finding-state.md` SHALL define, for the Direct Build close of `/sai-review` and `/sai-5-review`, a Question as a finding that needs an answer from the user, carrying a `Q*` identifier in `review.md`, and a fixable finding as any finding that is not a Question. The definition SHALL need no report field and no worker judgment, and SHALL hold no fixable finding back for a requirement or design change. The shared Direct Build close and its round SHALL take the fixable definition from this policy.

#### Scenario: A non-Question finding is fixable

- **WHEN** a report in the close input carries a finding without a `Q*` identifier
- **THEN** the close SHALL treat it as fixable without reading any report field and without asking a worker

#### Scenario: A Question is not fixable

- **WHEN** `review.md` carries a `Q*` finding
- **THEN** the close SHALL treat it as a Question waiting for the user's answer, never as a fixable finding

### Requirement: No Finding Is Routed To Another Command

The policy `sai/policies/finding-state.md` SHALL state that a Question is a finding waiting for the user's answer, never a finding to send to another command, and that no finding of the Direct Build close is routed to `/sai-1-spec`, `/sai-2-design`, or `/sai-explore`.

#### Scenario: A Question reaches the close

- **WHEN** the Direct Build close meets an open Question
- **THEN** the close SHALL offer it for an answer in the round and SHALL name no other command to route it to
