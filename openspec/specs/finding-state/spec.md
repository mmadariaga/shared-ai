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

### Requirement: Open And Fixed Findings

The policy `sai/policies/finding-state.md` SHALL define a finding as open when it carries no fixed mark, and as fixed when it carries one. A review or audit report SHALL keep its fixed findings, so that it records both what was found and what was fixed. A Question SHALL stay open until it is answered and fixed, and an unanswered Question SHALL stay open. Every consumer of a review or audit report SHALL act on open findings only: the Direct Build close selects from them, and `/sai-3-implement` ingests them.

#### Scenario: A marked finding is fixed

- **WHEN** a finding's heading line in a review or audit report carries the fixed mark
- **THEN** the finding SHALL be fixed, SHALL stay in its report, and no report consumer SHALL act on it

#### Scenario: An unanswered Question stays open

- **WHEN** a Direct Build close converges while a Question of its report was left unanswered
- **THEN** that Question SHALL carry no fixed mark and SHALL stay open

### Requirement: Fixed Mark Form

The fixed mark SHALL be the literal ` (FIXED)` appended to the end of the finding's heading line. Marking a finding SHALL change only that heading line: the body, the identifier, the severity, and the report's closing `Summary:` tally SHALL stay as the report wrote them. The mark SHALL carry no commit hash, because `git log` or `git blame` on the marked heading line leads to the commit that fixed the finding. Regenerating a report SHALL replace its findings together with their marks.

#### Scenario: Marking keeps the tally

- **WHEN** a finding of a report is marked as fixed
- **THEN** its heading line SHALL end with ` (FIXED)`, and the closing `Summary:` tally of the report SHALL stay unchanged

#### Scenario: The mark carries no hash

- **WHEN** a finding is marked as fixed in the Direct Build close
- **THEN** the mark SHALL be exactly ` (FIXED)` with no commit hash, and the fixing commit SHALL be found through `git log` or `git blame` on that line

#### Scenario: Regeneration replaces the marks

- **WHEN** a report that carries fixed marks is regenerated
- **THEN** its findings SHALL be replaced together with their marks

### Requirement: Fixed Mark Documentation

`docs/commands/sai-5-review.md` and `docs/commands/sai-review.md` SHALL describe the fixed mark that the Direct Build close writes on convergence. That description SHALL say that the mark is committed with the fixes in the single commit, that it carries no commit hash, and that later runs act on open findings only. `docs/commands/sai-3-implement.md` SHALL state that the command acts on the open findings of existing review and audit reports only. Each of the three documents SHALL state that this holds on Claude Code and opencode.

#### Scenario: Command documentation names the mark on both harnesses

- **WHEN** a reader opens the documentation of `/sai-review`, `/sai-5-review`, or `/sai-3-implement`
- **THEN** it SHALL describe the fixed mark or the open-findings-only behavior and SHALL state that it holds on Claude Code and opencode
