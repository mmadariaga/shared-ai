# deep-review-command Specification

## Purpose
Define `/sai-deep-review`, the composition that reviews a change with `/sai-4-review`, runs the recommended audits, and fixes the findings the user selects through a `/sai-3-implement` segment.

## Requirements

### Requirement: /sai-deep-review reviews through /sai-4-review

`/sai-deep-review` SHALL follow `sai/commands/review/coordinator.md` as its first segment, which resolves the change, reviews the diff in a fresh `sai-4-review-worker`, regenerates `review.md`, and commits it under its own contract. The review segment SHALL fix nothing, and its closing line `Review done.` SHALL be replaced by the `/sai-deep-review` close.

#### Scenario: Review segment writes and commits review.md

- **WHEN** `/sai-deep-review {name}` runs on a change with a non-empty diff
- **THEN** the review segment writes `review.md` and commits it once before any audit cycle runs

### Requirement: An empty diff stops the run cleanly

When the review segment finds no changes against the parent branch, `/sai-deep-review` SHALL run no audit, no Assessment pass, and no fix segment, even with `--full` or `--path`, SHALL say that no review ran because there was nothing to review, SHALL print the unused-options lines, and SHALL end with exactly `Deep review done.`.

#### Scenario: No changes against the parent branch

- **WHEN** the review segment finds no changes against the parent branch
- **THEN** the run activates no audit, runs no Assessment pass, starts no fix segment, and ends with `Deep review done.`

### Requirement: Recommended audits run after the review

After a completed review segment, `/sai-deep-review` SHALL activate the audits whose triage value in `review.md` is exactly `Yes`, or all three audits with `--full` or `--path`, and SHALL run each activated audit as one cycle of the shared audit coordinator `sai/commands/audit/coordinator.md`, with the change, the options that audit declares, and the report path `openspec/changes/{name}/{audit}.md` in place of that coordinator's own start steps. It SHALL create the activated audit workers in one batch (several `Agent` calls in one turn on Claude Code, several `task` calls on opencode), each creation carrying only the ready prompt, and each cycle SHALL keep its own `sai-state` session keyed `{audit}-{name}` and its own `{audit}-steps@1` machine.

#### Scenario: Triage recommends security only

- **WHEN** the triage parse of `review.md` recommends only the security audit
- **THEN** only `sai-5-security-worker` runs and the performance and accessibility reports stay untouched

### Requirement: /sai-deep-review accepts the union of its segments' options

`/sai-deep-review` SHALL drop every `--fast-track` token silently and SHALL accept exactly the union of the options declared by `sai/commands/review/options.md`, `sai/commands/security/options.md`, `sai/commands/performance/options.md`, and `sai/commands/accessibility/options.md`, including `--full`, `--path`, `--tier`, `--runtime`, `--url`, and `--parent-branch`, keeping no option list of its own. An unknown option, a second leftover token, an option without its value, or a value outside a declared set SHALL print `Cannot start /sai-deep-review: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.` and end the run before any dispatch, writing nothing.

#### Scenario: Undeclared option

- **WHEN** `/sai-deep-review {name} --unknown` runs
- **THEN** the command stops before any dispatch with the malformed-argument message naming `--unknown`

### Requirement: A change that cannot start implement is reviewed but not fixed

When `openspec/changes/{name}/` lacks `proposal.md`, `tasks.md`, or any file under `specs/`, `/sai-deep-review` SHALL still write `review.md` and run the activated audits, then run no Assessment pass and no fix segment, write nothing more, and print `Cannot start /sai-3-implement for {name}: missing {list of the absent items}.` after the summary of its close.

#### Scenario: Change without tasks.md

- **WHEN** `/sai-deep-review {name}` runs on a change that has no `tasks.md` and a report holds a fixable finding
- **THEN** the review and audits complete, no Assessment pass runs, the close prints the implement startup literal with the missing item, and no fix segment starts

### Requirement: /sai-deep-review runs unattended in the shape of /sai-build

`sai/commands/deep-review/coordinator.md` SHALL be the single card of `/sai-deep-review` and SHALL chain, in one session and in this order, the review segment, the triage, the activated audit cycles, the Assessment pass, and the `/sai-3-implement` fix segment; a segment SHALL start only when the previous one completed. The coordinator SHALL load only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, and `finding-state`, and SHALL load none of `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, `bounded-dispatch-retry`, or `composition`. Between its start and its close the run SHALL ask the user only the accessibility dev-server URL, an audit worker question that nothing answers and whose answer would change the report, and the escalation of an obstacle in the review or fix segment. The run SHALL have no human findings selection mode.

#### Scenario: A run with findings asks no selection question

- **WHEN** `/sai-deep-review {name}` runs and the review and an audit report hold fixable findings
- **THEN** the run asks no findings selection question and goes from the audits to the Assessment pass and the fix segment

#### Scenario: The coordinator loads no shared orchestration

- **WHEN** `sai/commands/deep-review/coordinator.md` is read
- **THEN** it fetches none of the shared orchestration files and none of `composition.md`, `findings-selection.md`, or a `command-bootstrap.md`

### Requirement: The accessibility URL is asked before the audit batch

When accessibility is activated, the run has `--runtime`, and the run has no `--url`, `/sai-deep-review` SHALL ask the user for the dev-server URL once, before any audit worker exists, in one question that also lets the user decline. A URL answer SHALL join the accessibility options; a decline SHALL hand the accessibility worker `--runtime` without a URL, and the runtime part of its report SHALL be marked unavailable.

#### Scenario: Runtime accessibility without a URL

- **WHEN** `/sai-deep-review {name} --runtime` activates accessibility without `--url`
- **THEN** the URL question is asked before the audit workers are created and no runtime question pauses the parallel audits afterwards

### Requirement: An unanswerable audit question pauses only its own audit

The coordinator SHALL answer an audit worker `question` itself when the change, its artifacts, or the repository answer it, and keep the answer as an assumption for the close. When nothing answers it and the answer would change the report, it SHALL put the question to the user through the native picker with options that each name a different way forward, and only that audit's cycle SHALL wait while the other cycles keep running. Several pending questions SHALL be asked one at a time in the fixed order security, performance, accessibility. A question whose answer would not change the report SHALL be answered with the coordinator's best reading and kept as an assumption.

#### Scenario: A report-changing question escalates

- **WHEN** the security worker asks a question that nothing in the change or repository answers and whose answer would change its report, while performance is also running
- **THEN** the question reaches the user through the native picker and only the security cycle waits for the answer

### Requirement: A failed audit does not close the run

An audit whose worker returns `failed`, or whose obstacle budget of 3 attempts is exhausted, SHALL NOT close the run and SHALL NOT escalate: the coordinator SHALL record it as `failed` with its summary or last obstacle, commit nothing for it, leave any earlier report of that audit as it was, and let the other audits finish. A failed audit's findings SHALL never enter the Assessment pass or the fix segment.

#### Scenario: One audit fails

- **WHEN** the performance audit fails while security and accessibility complete
- **THEN** the close shows performance as `failed` with its reason, security and accessibility as completed, and the Assessment pass reads no performance findings

### Requirement: An Assessment pass decides which findings the fix segment fixes

When the review segment completed, the change can start `/sai-3-implement`, and at least one report of the run holds a fixable finding, the coordinator SHALL run one Assessment pass itself over `review.md` and the reports of the audits completed in this run, in the order review, security, performance, accessibility. It SHALL judge each fixable finding that carries no ` (EXCLUDED: …)` mark, leave it to fix or append ` (EXCLUDED: <reason>)` with a concrete one-line reason to its heading line, change nothing else, never mark a Question, and apply no fixed selection rule, threshold, or severity cutoff. It SHALL commit each report in which it wrote a mark alone. It SHALL start the fix segment, following `sai/commands/implement/coordinator.md` with the reports of the run as its Composition reports, only when at least one fixable finding remains without a mark; it SHALL NOT dispatch `sai-review-fix-worker`.

#### Scenario: Some findings are excluded

- **WHEN** the Assessment pass excludes two of five fixable findings
- **THEN** the two carry ` (EXCLUDED: <reason>)` on their heading lines, their reports are committed alone, and the fix segment fixes only the other three

#### Scenario: Every finding is excluded

- **WHEN** the Assessment pass excludes every fixable finding
- **THEN** no fix segment starts and the close lists each excluded finding with its reason and the recovery instruction to remove the mark and run `/sai-3-implement {name}`

#### Scenario: Only Questions remain

- **WHEN** the reports of the run hold Questions and no fixable finding
- **THEN** no Assessment pass and no fix segment run, and the close says that Questions stay open for the user

### Requirement: A rerun regenerates the reports and only the fix segment resumes

A rerun of an interrupted `/sai-deep-review` SHALL go through the review segment again, regenerate `review.md` and the activated audit reports, and run the Assessment pass again with no memory of earlier marks. Only the fix segment SHALL resume, through the Resuming rule of `/sai-3-implement`.

#### Scenario: Rerun after an interrupted fix segment

- **WHEN** `/sai-deep-review {name}` runs again after a run stopped inside its fix segment
- **THEN** `review.md` and the activated audit reports are regenerated, the Assessment pass judges every finding again, and the fix segment resumes through `/sai-3-implement`'s own resume

### Requirement: Commits follow the segment order and stay local

`/sai-deep-review` SHALL commit `review.md` once through the review segment, then each verified audit report once and alone, with only its own path, then each report in which the Assessment pass wrote marks once, then once per fix step through the fix segment, then once for the inherent-risk ratings block that the fix segment stores in `review.md` when it fixed a finding, and SHALL add no other commit. While the audit workers run in parallel, the coordinator SHALL issue every `sai-state` call and every commit one at a time, in the fixed order security, performance, accessibility. A report the project ignores SHALL stay on disk uncommitted. Nothing SHALL be pushed, and only the fix segment SHALL change code.

#### Scenario: Two audits and two fix steps

- **WHEN** a run completes two audits, marks one report in the Assessment pass, and its fix segment completes two steps
- **THEN** the commits are one for `review.md`, one per audit report, one for the marked report, one per fix step, and one for the ratings block, each local

#### Scenario: Parallel audits commit one at a time

- **WHEN** the security and accessibility reports are verified while both workers ran in parallel
- **THEN** the coordinator commits the security report alone and then the accessibility report alone

### Requirement: The close reports every segment

After the last segment that ran, the coordinator SHALL re-read `review.md` and print its `Summary:` counts by category and its `## Recommended Audits` block, then, each only when it has entries, the per-audit status lines with their counts, report path, and commit state, the illegible-triage warnings, the unused-options lines, the recorded assumptions, the fixed findings, the excluded findings with their reasons and recovery instruction, the findings the fix segment left open, and the note that Questions stay open, and SHALL end with exactly `Deep review done.`. A review or fix segment that ends blocked, stopped, or with a failed precondition SHALL print its report and end the run without a closing line.

#### Scenario: Completed run closes with the deep-review line

- **WHEN** a run completes its review, audits, Assessment pass, and fix segment
- **THEN** the close lists the audits, fixed and excluded findings, and ends with exactly `Deep review done.`, with no `Review done.`, `{Audit} audit done.`, or `Implement done.` line
