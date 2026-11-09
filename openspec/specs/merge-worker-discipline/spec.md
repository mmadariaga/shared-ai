# merge-worker-discipline Specification

## Purpose
Defines the merge worker's closed read list, its summary language before and after the working-language hand-off, and its reuse of settled read-only checks.

## Requirements

### Requirement: Settled read-only checks are not repeated in the same stretch

The merge worker SHALL NOT repeat a read-only check with a definitive answer while its dependencies remain valid, including across stretches. It SHALL use retained mechanical receipts instead of deriving their facts again and SHALL verify receipt validity before reuse. Writes, Git operations, new conflicts, and other state changes SHALL invalidate only receipts whose dependencies changed. Unverifiable or stale evidence SHALL be recollected; immutable captured provenance SHALL remain historical evidence after launch rather than being replaced with current SHAs. Retained semantic analysis SHALL be updated only for new context or changed evidence.

#### Scenario: Definitive single-file result is reused

- **WHEN** a read-only check such as a no-collision determination has a definitive answer earlier in the same stretch
- **THEN** the worker reuses that answer without re-reading, re-scanning, or re-deliberating it

#### Scenario: Valid receipt survives a continuation

- **WHEN** a later stretch needs a fact and its recorded dependencies still match
- **THEN** the worker reuses the retained result without repeating collection or settled semantic deliberation

#### Scenario: Unrelated changes do not invalidate settled metadata

- **WHEN** a repository change leaves the dependencies of a suite-detection receipt unchanged
- **THEN** the receipt remains reusable and only affected facts are recollected

#### Scenario: Stale evidence is not reused

- **WHEN** receipt validity cannot be verified or a recorded dependency changed
- **THEN** the worker recollects the affected fact rather than assuming its earlier result remains true

### Requirement: One standalone merge worker serves the run

The merge worker SHALL keep the name `sai-merge-worker` and its worker-matrix key, and `merge` SHALL be listed in `STANDALONE_PHASES` of `bin/worker-matrix.js` so that its binding renders from the standalone worker template on both harnesses. One worker SHALL serve every conflict stop, test correction, and renumbering plan of a run. Its first dispatch SHALL carry no task and SHALL be answered with exactly `event: ready` and empty `changed_files`; the task SHALL arrive in the next message. The worker contract SHALL load only `remember`, `tool-resolution` (for `merge.js` and `transfer.js`), and `worker-report-transport`, and the worker SHALL dispatch no subagent.

#### Scenario: Ready before the task

- **WHEN** the coordinator creates the merge worker
- **THEN** the worker returns the ready payload and receives its first brief in the next message to the same worker

### Requirement: Merge worker steps arrive by pointer

The first message to a merge worker, and the first message to a replacement, SHALL open with the line `--report-dir <path>`, which the worker SHALL strip and keep for every later message; no later message SHALL carry it. Each message SHALL then open with `Active step: <id> — follow <path>` naming one of `sai/commands/merge/steps/strategy.md`, `apply.md`, `test-correction.md`, or `renumbering-plan.md`, followed by a complete brief: the method, the provenance file, the stop number, the snapshot record and its hash, and the run directory. The worker SHALL fetch the named step file once per session, read the shared definitions in `steps/common.md` once, do the step, and save the report it names. A message without a pointer line SHALL leave the active step unchanged as a fix round or an answer.

#### Scenario: Fix round keeps the active step

- **WHEN** the worker receives a message with findings and no pointer line
- **THEN** it corrects exactly the listed items within the current step

#### Scenario: The report directory arrives once

- **WHEN** the coordinator sends the first brief to a new or replacement merge worker
- **THEN** the message opens with `--report-dir <path>` before the pointer line, and later messages carry only the pointer line and brief

### Requirement: Merge worker reports are run-directory files

The merge worker SHALL save each report as `sai/policies/worker-report-transport.md` says: it SHALL write the report to a unique draft file in the run directory, save it with `transfer.js put --dir <report-dir> --path <report name> --input-file <draft>` under a unique name of its choosing, and return only the `{path, sha256}` that `put` prints as its final message, with the `warming: true|false` line of `@sai/policies/cache-warming.md` beside it when a warming line reached it, and with no raw output, file contents, or logs. Every report SHALL follow the closed schema of the transport policy: `status` `completed`, `failed`, or `cancelled`, with `summary`, `changed_files`, and the role fields its step file names. A report SHALL carry no time field and no `warming` field. When something stops the worker, it SHALL return a `failed` report naming the blocker and the affected path in `summary`, and SHALL ask the user nothing. A report with `status` `done`, `blocked`, or `escalate`, and a message that carries its result inline, SHALL be an invalid report.

#### Scenario: Final message is only the path

- **WHEN** the worker finishes a step
- **THEN** its final message is the `{path, sha256}` reference of the saved report, plus its warming line when one reached it, and the coordinator validates that reference with `--command merge` before it reads any field

#### Scenario: A blocker is a failed report

- **WHEN** the bundle or snapshot of a stop cannot be read
- **THEN** the worker saves a `failed` report with the blocker and the affected path in `summary`, and a report that uses `blocked` instead is invalid

### Requirement: Merge worker decides by commit intent

The merge worker SHALL resolve every conflict by commit intent, judged from each side's commits, and SHALL keep declared rules (governing specs, ADRs, and DDRs), facts, and labelled inferences apart, with declared rules outranking inferred objectives. It SHALL map git stages to branches by method (for `merge`, stage 2 is the current branch and stage 3 the selected branch; for `rebase` and `rebase-squash`, stage 2 is the selected branch and stage 3 the current branch's replayed commit) and SHALL describe each choice by branch and behavior. When commit intent cannot decide between two sides, the strategy report SHALL be `completed` with a non-empty `escalations` list giving what each side does, what each choice gives up, and a recommendation, and SHALL NOT pick; the `escalations` list, not the status, SHALL tell the coordinator to escalate.

#### Scenario: Incompatible sides are escalated

- **WHEN** both sides change the same behavior incompatibly and no rule or evidence prefers one
- **THEN** the strategy report has `status: completed` and lists that conflict in a non-empty `escalations` list instead of choosing a side

### Requirement: Merge worker writes only through the merge tool

The merge worker SHALL change an affected file only by handing resolved text to `merge.js write`, SHALL report every path the tool placed in `changed_files`, and SHALL create no other file than its report drafts and payload files in the run directory and its saved reports in the report directory, all outside the repository. It SHALL run only read-only git commands (`status`, `rev-parse`, `branch`, `diff`, `show`, `log`, `ls-files`, `merge-base`, `cat-file`), SHALL never rename a file, and SHALL leave the launch, checkouts, renames, staging, rebase continuation, commits, and every test run to the coordinator. A test correction SHALL be proposed as byte ranges the coordinator captures with `merge.js correction` before any write, and the renumbering plan SHALL be read-only.

#### Scenario: Test correction waits for captured ranges

- **WHEN** the worker completes a test-correction step
- **THEN** it has written nothing to the repository and its report lists the proposed byte ranges with each file's current hash

### Requirement: Replacement merge worker starts from a hand-over file

A replacement merge worker SHALL return the ready payload, then read the hand-over file the coordinator wrote in the run directory before anything else. The hand-over file SHALL hold the method, branch, provenance, current stop with its record and hash, the reports and decisions so far, the files already written, and the symptom, and the files it names SHALL be the replacement's only history. The old worker's history SHALL never be forwarded.

#### Scenario: Replacement resumes from the hand-over

- **WHEN** a worker is replaced during a conflict stop
- **THEN** the new worker reads `handover-{k}.md` and continues from the files it names
