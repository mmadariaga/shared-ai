# implement-fix-round-ratings Specification

## Purpose
TBD - created by archiving change review-inherent-risk-block. Update Purpose after archive.

## Requirements

### Requirement: Fix round close stores the ratings block

The `/sai-3-implement` coordinator SHALL, as the first item of its close and before the learnings step, store the inherent-risk ratings block in `openspec/changes/{name}/review.md` only when the run completed, marked at least one finding of any report (`review.md`, `security.md`, `performance.md`, `accessibility.md`) fixed, and `review.md` exists. It SHALL follow `sai/policies/inherent-risk.md` with the parent branch that the `**Reviewed:**` line of `review.md` names, and the step SHALL be complete when `risk-signals.js validate` on `review.md` with that parent branch prints `fresh`. The behavior SHALL be the same on Claude Code and opencode. `/sai-4-review` SHALL NOT compute the ratings.

#### Scenario: A completed fix round with a review report
- **WHEN** a completed run marked a `review.md` finding fixed and the `**Reviewed:**` line names a parent branch that resolves
- **THEN** the coordinator stores the ratings block in `review.md` and confirms that `validate` prints `fresh` before the learnings step

#### Scenario: Only an audit report was fixed and no review report exists
- **WHEN** a completed run fixed only `security.md` findings and the change has no `review.md`
- **THEN** the coordinator creates no `review.md` and stores no ratings block

#### Scenario: The run did not complete
- **WHEN** the run ends blocked, stopped, or with an unanswered escalation
- **THEN** `review.md` is left without a new or changed ratings block

### Requirement: Unresolvable parent leaves review.md unchanged

When the `**Reviewed:**` line names no parent branch, the named branch no longer resolves, or `validate` cannot print `fresh`, the coordinator SHALL leave `review.md` as `HEAD` holds it and SHALL state the reason in the closing report. The closing report SHALL carry one line on the ratings block — stored and committed, stored and uncommitted, or not stored with the reason — and no such line when the step did not apply.

#### Scenario: The Reviewed line names no parent branch
- **WHEN** a completed fix round closes and `review.md` has no `**Reviewed:**` line naming a parent branch
- **THEN** no ratings block is written and the closing report states why

### Requirement: Ratings block commit

The coordinator SHALL commit `review.md` alone in its own local commit after storing the block, under the commit authorization the run already holds, with a Conventional Commits subject of at most 50 characters and no attribution. It SHALL check the path with `git check-ignore` first, SHALL stage it only when it is not ignored, and SHALL NOT force-add it; an ignored `review.md` SHALL keep the block uncommitted in the working tree. Nothing SHALL be pushed.

#### Scenario: review.md is tracked
- **WHEN** the block is stored in a `review.md` that Git does not ignore
- **THEN** the coordinator makes one local commit holding only `review.md`

#### Scenario: review.md is ignored
- **WHEN** the block is stored in a `review.md` that Git ignores
- **THEN** no commit is made and the block stays in the working tree

### Requirement: Compositions account for the ratings commit

The `/sai-deep-review` coordinator's commit rule SHALL count, after the `review.md` commit and the per-step fix commits, the one ratings block commit that its fix segment makes at close when it fixed a finding. The `/sai-build` coordinator SHALL state that its third segment stores and commits the ratings block when it fixes a finding; a build whose third segment does not start SHALL leave `review.md` without a ratings block.

#### Scenario: A deep review fixes a selected finding
- **WHEN** the `/sai-deep-review` fix segment fixes at least one selected finding
- **THEN** the run's commits are the `review.md` commit, one commit per fix step, and one ratings block commit

#### Scenario: A build selects no finding
- **WHEN** the `/sai-build` assessment excludes every fixable finding so segment 3 does not start
- **THEN** `review.md` carries no ratings block
