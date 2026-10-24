# finding-state Specification

## Purpose
TBD - created by archiving change sai-review-single-fix-round. Update Purpose after archive.

## Requirements

### Requirement: Fixable Finding Definition

The policy `sai/policies/finding-state.md` SHALL define a Question as a finding that needs an answer from the user, carrying a `Q*` identifier in `review.md`, and a fixable finding as any finding that is not a Question. The definition SHALL need no report field and no worker judgment, and SHALL hold no fixable finding back for a requirement or design change. The Assessment passes of `/sai-build` and `/sai-deep-review` and `/sai-3-implement` SHALL take the fixable definition from this policy.

#### Scenario: A non-Question finding is fixable

- **WHEN** a report in the input carries a finding without a `Q*` identifier
- **THEN** the command SHALL treat it as fixable without reading any report field and without asking a worker

#### Scenario: A Question is not fixable

- **WHEN** `review.md` carries a `Q*` finding
- **THEN** the command SHALL treat it as a Question waiting for the user's answer, never as a fixable finding

### Requirement: No Finding Is Routed To Another Command

The policy `sai/policies/finding-state.md` SHALL state that a Question is a finding waiting for the user's answer, never a finding to send to another command, and that `/sai-build` and `/sai-deep-review` ask no one: Questions stay open and the fix segment applies only fixable findings. No finding SHALL be routed to `/sai-1-spec`, `/sai-2-design`, or `/sai-explore`.

#### Scenario: A Question reaches the close

- **WHEN** a `/sai-deep-review` run meets an open Question in one of its reports
- **THEN** the run SHALL leave it open, SHALL say in its close that Questions stay open for the user, and SHALL name no other command to route it to

### Requirement: Open And Fixed Findings

The policy `sai/policies/finding-state.md` SHALL define a finding as open when it carries no fixed mark, and as fixed when it carries one. A review or audit report SHALL keep its fixed findings, so that it records both what was found and what was fixed. A Question SHALL stay open until it is answered and fixed, and an unanswered Question SHALL stay open. Every consumer of a review or audit report SHALL act on open findings only: `/sai-3-implement` applies them, except the findings that carry the excluded mark, which it skips.

#### Scenario: A marked finding is fixed

- **WHEN** a finding's heading line in a review or audit report carries the fixed mark
- **THEN** the finding SHALL be fixed, SHALL stay in its report, and no report consumer SHALL act on it

#### Scenario: An unanswered Question stays open

- **WHEN** a `/sai-deep-review` run ends while a Question of its report was left unanswered
- **THEN** that Question SHALL carry no fixed mark and SHALL stay open

#### Scenario: Implement-new skips a marked finding

- **WHEN** `/sai-3-implement` reads an audit report whose finding carries the fixed mark
- **THEN** it SHALL run no step for that finding

#### Scenario: Implement-new skips an excluded finding

- **WHEN** `/sai-3-implement` reads an audit report whose finding carries the excluded mark
- **THEN** it SHALL run no step for that finding, while other consumers still treat it as open

### Requirement: Fixed Mark Form

The fixed mark SHALL be the literal ` (FIXED)` appended to the end of the finding's heading line. Marking a finding SHALL change only that heading line: the body, the identifier, the severity, and the report's closing `Summary:` tally SHALL stay as the report wrote them. The mark SHALL carry no commit hash, because `git log` or `git blame` on the marked heading line leads to the commit that fixed the finding. Regenerating a report SHALL replace its findings together with their marks. The `/sai-3-implement` coordinator SHALL write each mark itself in the commit of the step that fixed the finding.

#### Scenario: Marking keeps the tally

- **WHEN** a finding of a report is marked as fixed
- **THEN** its heading line SHALL end with ` (FIXED)`, and the closing `Summary:` tally of the report SHALL stay unchanged

#### Scenario: The mark carries no hash

- **WHEN** a finding is marked as fixed by a `/sai-3-implement` step
- **THEN** the mark SHALL be exactly ` (FIXED)` with no commit hash, and the fixing commit SHALL be found through `git log` or `git blame` on that line

#### Scenario: Regeneration replaces the marks

- **WHEN** a report that carries fixed marks is regenerated
- **THEN** its findings SHALL be replaced together with their marks

#### Scenario: Implement-new marks in the step commit

- **WHEN** a `/sai-3-implement` step fixes an audit finding
- **THEN** the coordinator SHALL append the fixed mark to that finding's heading line and SHALL commit it together with the fix in that step's commit

### Requirement: Fixed Mark Documentation

`docs/commands/sai-4-review.md` and `docs/commands/sai-deep-review.md` SHALL describe the fixed mark that `/sai-3-implement` writes with each fix. That description SHALL say that the mark is committed with the fixes in the same commit, that it carries no commit hash, and that later runs act on open findings only. `docs/commands/sai-3-implement.md` SHALL state that the command acts on the open findings of existing review and audit reports only. Each of the three documents SHALL state that this holds on Claude Code and opencode.

#### Scenario: Command documentation names the mark on both harnesses

- **WHEN** a reader opens the documentation of `/sai-deep-review`, `/sai-4-review`, or `/sai-3-implement`
- **THEN** it SHALL describe the fixed mark or the open-findings-only behavior and SHALL state that it holds on Claude Code and opencode

### Requirement: Excluded Mark Written By Assessment Passes

The policy `sai/policies/finding-state.md` SHALL define the excluded mark as the literal ` (EXCLUDED: <reason>)` appended to the end of a finding's heading line, with a concrete reason that fits on that line. The `/sai-build` and `/sai-deep-review` coordinators SHALL write it after their Assessment pass for a fixable finding they decide not to fix, and a user MAY write it by hand. Marking a finding as excluded SHALL change only its heading line: the body, the identifier, the severity, and the report's closing `Summary:` tally SHALL stay as the report wrote them. A Question SHALL never carry the mark. An excluded finding SHALL stay open for every consumer except `/sai-3-implement`, which skips it standalone and inside `/sai-build` and `/sai-deep-review`. Removing the mark SHALL reopen the finding for `/sai-3-implement`, which then fixes it and writes the fixed mark. Regenerating a report SHALL replace its excluded marks together with its fixed marks, so no exclusion carries over to a new report.

#### Scenario: Excluding keeps the tally

- **WHEN** a finding of `review.md` is marked as excluded
- **THEN** its heading line SHALL end with ` (EXCLUDED: <reason>)`, and its body, identifier, severity, and the closing `Summary:` tally SHALL stay unchanged

#### Scenario: Direct Build close ignores the mark

- **WHEN** the command catalog is read
- **THEN** no Direct Build fix close exists for `/sai-review` or `/sai-5-review`, so no close reads the excluded mark

#### Scenario: Deep review Assessment pass writes the mark

- **WHEN** the `/sai-deep-review` Assessment pass decides not to fix a fixable finding
- **THEN** it SHALL append ` (EXCLUDED: <reason>)` to that finding's heading line and the fix segment SHALL skip it

#### Scenario: Removing the mark reopens the finding

- **WHEN** the user removes ` (EXCLUDED: …)` from a finding's heading and runs `/sai-3-implement {name}`
- **THEN** the finding SHALL be open again, SHALL be fixed, and SHALL carry the fixed mark

#### Scenario: Regeneration drops excluded marks

- **WHEN** a report that carries excluded marks is regenerated
- **THEN** its findings SHALL be replaced together with their excluded marks
