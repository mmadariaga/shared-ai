# deep-review-command Specification

## Purpose
Define `/sai-deep-review`, the composition that reviews a change with `/sai-4-review`, runs the recommended audits, and fixes the findings the user selects through a `/sai-3-implement` segment.

## Requirements

### Requirement: /sai-deep-review reviews through /sai-4-review

`/sai-deep-review` SHALL run `sai/commands/review/coordinator.md` as its review segment, which dispatches `sai-4-review-worker`, regenerates `review.md`, and commits it under its own contract. The composition SHALL render no panel steps for the review segment's `review-steps@1` ids.

#### Scenario: Review segment writes and commits review.md

- **WHEN** `/sai-deep-review {name}` runs on a change with a non-empty diff
- **THEN** the review segment writes `review.md` and commits it once before any audit segment runs

### Requirement: An empty diff stops the run cleanly

When the review segment reports `no-changes`, `/sai-deep-review` SHALL close the invocation without running any audit, findings round, or fix segment, even with `--full` or `--path`.

#### Scenario: No changes against the parent branch

- **WHEN** the review segment returns `no-changes`
- **THEN** the run activates no audit, asks no findings round, and starts no fix segment

### Requirement: Recommended audits run after the review

After a completed review segment, `/sai-deep-review` SHALL activate the audit segments the triage parse of `review.md` returns, or all three audits with `--full` or `--path`, and SHALL dispatch the activated audit workers concurrently.

#### Scenario: Triage recommends security only

- **WHEN** the triage parse of `review.md` recommends only the security audit
- **THEN** only `sai-5-security-worker` runs and the performance and accessibility artifacts stay untouched

### Requirement: /sai-deep-review accepts the union of its segments' options

`/sai-deep-review` SHALL accept exactly the union of the options declared by `sai/commands/review/options.md`, `sai/commands/security/options.md`, `sai/commands/performance/options.md`, and `sai/commands/accessibility/options.md`, including `--full`, `--path`, `--tier`, `--runtime`, and `--parent-branch`, and SHALL stop before any dispatch on an undeclared option or an option missing its value.

#### Scenario: Undeclared option

- **WHEN** `/sai-deep-review {name} --unknown` runs
- **THEN** the command stops before any dispatch with a message naming `--unknown`

### Requirement: Selected findings are fixed through a /sai-3-implement segment

After the review and audits, `/sai-deep-review` SHALL run the findings round of `findings-selection.md` over the freshly regenerated reports, append the excluded mark ` (EXCLUDED: not selected in the /sai-deep-review round)` to the heading of every unselected fixable finding, and then run `sai/commands/implement/coordinator.md` as the fix segment, which fixes only the open fixable findings without the excluded mark, one RED/GREEN step with its own local commit at a time. It SHALL NOT dispatch `sai-review-fix-worker`.

#### Scenario: User selects a subset of findings

- **WHEN** the user selects two of five fixable findings in the round
- **THEN** the three unselected findings carry the excluded mark and the fix segment fixes and commits only the two selected ones

#### Scenario: No finding selected

- **WHEN** the round returns no selected finding or the picker is dismissed
- **THEN** the run starts no fix segment, writes no mark, and makes no fix commit

### Requirement: A change that cannot start implement is reviewed but not fixed

When `openspec/changes/{name}/` lacks `proposal.md`, `tasks.md`, or any file under `specs/`, `/sai-deep-review` SHALL still write `review.md` and run the recommended audits, then skip the findings round and fix segment and print `Cannot start /sai-3-implement for {name}: missing {list of the absent items}.` before its standard close.

#### Scenario: Change without tasks.md

- **WHEN** `/sai-deep-review {name}` runs on a change that has no `tasks.md`
- **THEN** the review and audits complete and the run reports the missing item with the implement startup literal and starts no fix segment

### Requirement: Commits are one for review.md plus one per fix step

`/sai-deep-review` SHALL commit `review.md` once through the review segment and once per fix step through the fix segment, and SHALL add no other commit.

#### Scenario: Two fix steps

- **WHEN** the fix segment completes two steps
- **THEN** the run has made exactly three commits: one for `review.md` and one per fix step
