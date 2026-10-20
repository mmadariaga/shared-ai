# build-new-command Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Build-new chains the implement-new segment

`/sai-build` SHALL run `/sai-3-implement` as its first segment, `/sai-4-review` as its second segment, and `/sai-3-implement` again as its third segment in the same session, each with the same `arguments_value`, without entering another wrapper, and without asking for approval between segments. Segment 2 SHALL fix nothing. Segment 3 SHALL apply every open fixable finding of `review.md` that carries no excluded mark, and SHALL start only when the assessment pass leaves at least one such finding. It SHALL run exactly one review pass per run and no review after segment 3, and SHALL NOT use `sai/orchestration/composition.md` or a meta-build coordinator. Each segment SHALL start only when the previous one completes, including a segment 1 that completes with no new work.

#### Scenario: Build-new runs the implementation segment

- **WHEN** a user invokes `/sai-build` with a change name and the implementation segment completes
- **THEN** the coordinator follows `sai/commands/review/coordinator.md` with the same `arguments_value` as the second segment and runs no further review pass.

#### Scenario: Fix segment applies the selected findings

- **WHEN** the assessment pass leaves at least one fixable finding without a mark
- **THEN** the coordinator follows `sai/commands/implement/coordinator.md` as the third segment, which fixes those findings and marks each one ` (FIXED)`, and no review runs afterwards

### Requirement: Build-new closing line

After the last segment that ran ends, `/sai-build` SHALL print the report of each segment, replacing each segment's own closing line with its own. When segment 2 completed or found no changes against the parent branch, it SHALL end with exactly `Build done.`. When segment 1 or segment 3 ends blocked (an escalation the user did not resolve), stopped, or with a failed precondition, it SHALL print that report, end without a closing line, and start no later segment; the report SHALL NOT name `build-log.md`. When segment 2 fails, is stopped, or cannot start, it SHALL print both segment reports and end without a closing line.

#### Scenario: Segment stops

- **WHEN** the implementation segment ends with an escalation the user did not resolve or a failed precondition
- **THEN** `/sai-build` prints the segment's report, starts no review, and prints no `Build done.` line.

#### Scenario: Fix segment stops

- **WHEN** segment 3 ends blocked, stopped, or with a failed precondition
- **THEN** `/sai-build` prints its report without naming `build-log.md` and prints no `Build done.` line.

#### Scenario: Review segment is stopped

- **WHEN** the review segment exhausts its attempts on an invalid `review.md` and the user chooses to stop
- **THEN** `/sai-build` prints both segment reports and prints no `Build done.` line.

### Requirement: Build-new assessment pass

After segment 2 completes and writes `review.md`, the `/sai-build` coordinator SHALL run one assessment pass itself, never in a worker, before any fix. The pass SHALL NOT run when `review.md` holds no fixable finding (zero findings, or Questions only). The coordinator SHALL judge each fixable finding on its own and either select it for fixing or exclude it, with no fixed selection rule, threshold, or severity cutoff; impact, correction cost, and correction risk MAY be weighed and SHALL NOT be mandatory checks. For each excluded finding it SHALL append the excluded mark ` (EXCLUDED: <reason>)` defined by `sai/policies/finding-state.md` to the end of the heading line, with a concrete one-line reason, and SHALL change nothing else in the report. It SHALL never mark a Question. When it wrote at least one mark, it SHALL commit `review.md` alone under the review-new commit rule: check the path with `git check-ignore -q` first, stage and commit it path-limited only when it is not ignored, with a Conventional Commits subject of at most 50 characters, no `Co-Authored-By` trailer or other AI attribution, no force-add, and no push; an ignored `review.md` SHALL keep the marks on disk uncommitted. The invocation SHALL authorize this one local commit. The pass SHALL keep no memory across runs: a rerun regenerates `review.md` without earlier marks and judges every finding again.

#### Scenario: Some findings are excluded

- **WHEN** segment 2 writes a `review.md` with three fixable findings and the coordinator judges one of them unwarranted
- **THEN** that finding's heading line ends with ` (EXCLUDED: <reason>)`, the other two stay unmarked, and `review.md` is committed alone before segment 3 starts

#### Scenario: Every fixable finding is excluded

- **WHEN** the assessment pass excludes every fixable finding of `review.md`
- **THEN** the coordinator commits `review.md` with every excluded mark, starts no segment 3, and goes to the close

#### Scenario: Questions are never marked

- **WHEN** `review.md` holds a Question
- **THEN** the assessment pass leaves its heading without an excluded mark

#### Scenario: Ignored review report

- **WHEN** `git check-ignore -q` reports `review.md` as ignored
- **THEN** the excluded marks stay on disk and nothing is committed

### Requirement: Build-new closes with fixed, excluded, and left-open findings

When segment 2 completes, `/sai-build` SHALL read `openspec/changes/{name}/review.md` again after the assessment pass and segment 3, and SHALL print the finding counts from its `Summary:` tally by category (Critical, High, Medium, Low, Questions) and the `## Recommended Audits` block, without running any audit. It SHALL then print, each only when it has entries: the **Fixed** findings whose heading carries ` (FIXED)`, with identifier and title; the **Excluded** findings whose heading carries ` (EXCLUDED: …)`, with identifier, title, and reason, followed by the recovery instruction to remove the mark from the heading in `review.md` and run `/sai-3-implement {name}`; the findings **Left open by the fix segment**, each selected finding segment 3 did not fix and left without a mark, with the reason from segment 3's report and never listed as excluded; and the statement that Questions stay open until the user answers them because the fix segment applies only fixable findings. It SHALL ask no question and SHALL NOT invite the user to triage `review.md`. With zero findings it SHALL report the zero counts and print none of these lists. When segment 2 found no changes against the parent branch, it SHALL say that no review ran.

#### Scenario: Fixed and excluded findings

- **WHEN** segment 3 fixed two findings and the assessment pass excluded one
- **THEN** the close prints the counts, the recommended audits, the Fixed list with two entries, and the Excluded list with the reason and the recovery instruction, and ends with `Build done.`

#### Scenario: Nothing excluded

- **WHEN** the assessment pass excludes no finding
- **THEN** the close prints no Excluded list and no recovery instruction

#### Scenario: A selected finding stays open

- **WHEN** segment 3 judges a selected finding mistaken and leaves it without a mark
- **THEN** the close lists it under Left open by the fix segment with that reason and not under Excluded

#### Scenario: Zero findings

- **WHEN** segment 2 completes with a `review.md` whose tally lists no findings
- **THEN** the close prints the zero counts, prints none of the lists, and ends with `Build done.`
