# build-new-command Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Build-new chains the implement-new segment

`/sai-build-new` SHALL run `/sai-3-implement-new` as its first segment and `/sai-4-review-new` as its second segment in the same session, each with the same `arguments_value`, without entering another wrapper, and without asking for approval between segments. It SHALL run exactly one review pass per run, SHALL never implement findings automatically, and SHALL NOT use `sai/orchestration/composition.md` or the `meta-build` coordinator. Segment 2 SHALL start only when segment 1 completes, including a segment 1 that completes with no new work.

#### Scenario: Build-new runs the implementation segment

- **WHEN** a user invokes `/sai-build-new` with a change name and the implement-new segment completes
- **THEN** the coordinator follows `sai/commands/review-new/coordinator.md` with the same `arguments_value` as the second segment and runs no further review pass.

### Requirement: Build-new closing line

After segment 2 ends, `/sai-build-new` SHALL print the report of each segment, replacing each segment's own closing line with its own. When segment 2 completed or found no changes against the parent branch, it SHALL end with exactly `Build-new done.`. When segment 1 ends blocked (an escalation the user did not resolve), stopped, or with a failed precondition, it SHALL print that report, name `build-log.md` when the segment wrote one, end without a closing line, and start no review. When segment 2 fails, is stopped, or cannot start, it SHALL print both segment reports and end without a closing line.

#### Scenario: Segment stops

- **WHEN** the implement-new segment ends with an escalation the user did not resolve or a failed precondition
- **THEN** `/sai-build-new` prints the segment's report, starts no review, and prints no `Build-new done.` line.

#### Scenario: Review segment is stopped

- **WHEN** the review segment exhausts its attempts on an invalid `review.md` and the user chooses to stop
- **THEN** `/sai-build-new` prints both segment reports and prints no `Build-new done.` line.

### Requirement: Build-new closes with a findings summary for human triage

When segment 2 completes, `/sai-build-new` SHALL read `openspec/changes/{name}/review.md` and print the finding counts from its `Summary:` tally by category (Critical, High, Medium, Low, Questions) and the `## Recommended Audits` block, without running any audit. With open fixable findings (Critical, High, Medium, or Low above zero), it SHALL invite the user to review `review.md`, delete the findings they do not want applied, and run `/sai-3-implement-new {name}`, and SHALL state that Questions stay open until the user answers them because `/sai-3-implement-new` applies only fixable findings. With zero findings, it SHALL report the zero counts and omit the invitation. When segment 2 found no changes against the parent branch, it SHALL say that no review ran.

#### Scenario: Open fixable findings

- **WHEN** segment 2 completes with a `review.md` whose tally lists two High findings and one Question
- **THEN** the close prints the counts by category and the recommended audits, invites the user to triage `review.md` and run `/sai-3-implement-new {name}`, and states that the Question stays open until answered.

#### Scenario: Zero findings

- **WHEN** segment 2 completes with a `review.md` whose tally lists no findings
- **THEN** the close prints the zero counts, omits the invitation to run `/sai-3-implement-new`, and ends with `Build-new done.`.
