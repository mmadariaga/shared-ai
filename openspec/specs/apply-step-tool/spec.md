# apply-step-tool Specification

## Purpose
Defines the stateless `apply-step.js` tool that performs the `/sai-4-apply` post-dispatch verification and the per-Step close (visibility report, checkbox marking, add and commit) in one call each, so the apply coordinator stops doing that mechanical work in prose.

## Requirements

### Requirement: apply-step.js verify runs the post-dispatch checks in one call

After every RED or GREEN dispatch or continuation return, the apply coordinator SHALL run one `apply-step.js verify` call with `--change`, `--step`, `--dispatch red|green|green-direct|green-exception`, the report's field 8 paths on stdin, and `--parent-was-absent` when `.tmp/` did not exist before the Step's first dispatch. The tool SHALL, in order: sweep exactly `.tmp/{change-name}/`; run the Step test command verbatim, expecting failure after a RED dispatch and success otherwise; after a non-RED dispatch also run the backticked command of each runnable Automated item verbatim, and after a RED dispatch instead check that each plan-named retired file is absent; sweep again; and compare `git status` with the files allowed for the dispatch kind and with field 8. It SHALL return one JSON object carrying `ok`, `commands`, `failures`, `unjudged`, `retirements`, `sweep`, `out_of_allowed`, `unreported`, and `only_in_subagent`. `ok` SHALL be true only when no command failed, no retired file remains, and no path is out of the allowed set, unreported, or claimed only by the subagent. Scratch paths and the plan's own `implementation.md` SHALL be excluded from the comparison. The `.tmp/` parent SHALL be removed only when `--parent-was-absent` was passed and it is empty after the sweep, and a sweep that removes paths SHALL report the line `> Scratch cleanup: removed <paths>` in `sweep.lines`.

#### Scenario: GREEN dispatch passes verification
- **WHEN** a GREEN dispatch returns, the Step test command and the runnable Automated commands exit as expected, and `git status` equals field 8 within the allowed files
- **THEN** `verify` returns `ok: true` with empty `failures`, `out_of_allowed`, `unreported`, and `only_in_subagent`

#### Scenario: RED dispatch expects the Step test command to fail
- **WHEN** a RED dispatch returns, the Step test command exits non-zero, and every plan-named retired file is absent
- **THEN** `verify` returns `ok: true` and does not count the failing Step test command as a failure

#### Scenario: Undeclared change fails verification
- **WHEN** `git status` shows a changed path that is absent from field 8
- **THEN** `verify` returns `ok: false` and lists that path in `unreported`

#### Scenario: Path outside the allowed files fails verification
- **WHEN** a RED dispatch changes a production file that is not in the RED allowed set
- **THEN** `verify` returns `ok: false` and lists that path in `out_of_allowed`

#### Scenario: Scratch is swept and printed
- **WHEN** a dispatch leaves files under `.tmp/{change-name}/`
- **THEN** `verify` removes that directory, lists `> Scratch cleanup: removed .tmp/{change-name}/` in `sweep.lines`, and excludes the swept paths from the comparison

### Requirement: Verify falls back and defers what it cannot judge

A plan without a `**Step test command:**` line SHALL make `verify` use the command of the Step's `Verify RED` checkbox and SHALL NOT fail. An Automated item with no backticked command, or with a free-text expected result, SHALL NOT be run: `verify` SHALL return it in `unjudged` with its reason for the coordinator to judge. RED failure classification (assertion versus setup, import, or compile) SHALL stay with the coordinator, judged from the `tail` of the Step test command.

#### Scenario: Plan has no Step test command line
- **WHEN** a Step's plan has no `**Step test command:**` line and its `Verify RED` checkbox names a command
- **THEN** `verify` runs that command as the Step test command and returns a normal result

#### Scenario: Automated item has a free-text expectation
- **WHEN** a runnable-looking Automated item carries a free-text expected result
- **THEN** `verify` does not run it and returns it in `unjudged` with reason `free-text-expectation`

### Requirement: Close runs only after a passing verify

The coordinator SHALL invoke `apply-step.js close` only after a passing `verify` and after judging every `unjudged` item and the RED failure class; the tool SHALL keep no such state. A failed `verify` (`ok: false`, a failed command, `out_of_allowed`, `unreported`, or a retired file still present) SHALL mark no checkbox and propose no commit, SHALL be classified `validation-failed` before any `continue_after_recovery`, and SHALL follow the bounded-recovery flow; the coordinator SHALL read project files only then, to write the diagnosis.

#### Scenario: Failed verify blocks the close
- **WHEN** `verify` returns `ok: false` for a Step
- **THEN** the coordinator marks no checkbox, makes no commit, and enters bounded recovery before any further action on that Step

### Requirement: apply-step.js close performs the Step close in one call

`apply-step.js close` SHALL take `--change`, `--step`, `--guard-base <sha|n/a>`, optionally `--dry-run` or `--mark-only` (mutually exclusive), and on stdin the add-list, a `---` line, then the commit message. It SHALL run the no-commit guard `verify` against `--guard-base`, build the visibility report with its pinned status letter, mark the Step's Automated checkboxes `[x]` in `implementation.md` on disk, then run `git add` for exactly the add-list paths that exist in the working tree (a declared removal stages the deletion) and `git commit` with the message. It SHALL return one JSON object carrying `status_letter`, `report_text`, `guard`, `committed`, `sha`, `subject`, `reason`, `marked`, and `error`, and the coordinator SHALL print `report_text` verbatim. Functional checkboxes SHALL never be marked by `close`, and the tool SHALL never add a path outside the add-list. The marks SHALL be written to disk before the commit.

#### Scenario: Close marks the Step and commits only the add-list
- **WHEN** `close` runs with add-list `{src/feature.js}` while `src/unrelated.js` is also modified
- **THEN** the Step's Automated checkboxes are `[x]` on disk, the commit contains only `src/feature.js`, and the result carries `committed: true`, the `sha`, and the `subject`

#### Scenario: Close mark-only marks a declined Step
- **WHEN** `close --mark-only` runs
- **THEN** it marks the Step's Automated checkboxes `[x]` on disk, runs no guard, report, message check, `git add`, or `git commit`, and returns `reason: mark-only` with `marked`

#### Scenario: Close dry-run only reports
- **WHEN** `close --dry-run` runs
- **THEN** it runs only the guard and the report, marks no checkbox, makes no commit, and returns `reason: dry-run` with `report_text`

### Requirement: Close call order follows session authorization

Under an active `session_commit_authorized` (including `/sai-build`) the coordinator SHALL make one `close` call per Step. Without it, the coordinator SHALL run `close --dry-run`, print `report_text`, ask the commit-gate authorization question, and only on authorization run `close`. On a `no` answer there SHALL be no commit: the coordinator SHALL run `close --mark-only`, so the verified Step's Automated checkboxes are `[x]` on disk and neither the resumed run nor the terminal sweep re-runs it, and SHALL print the existing "Commit not authorized" literal.

#### Scenario: Session authorization skips the dry run
- **WHEN** `session_commit_authorized` is active at a Step's commit gate
- **THEN** the coordinator makes a single `close` call and no `--dry-run` call

#### Scenario: Authorization declined
- **WHEN** the user answers `no` to the commit question after a `close --dry-run`
- **THEN** the coordinator makes one `close --mark-only` call and no committing `close` call, no commit is created, the Step's Automated checkboxes are `[x]` on disk, and the coordinator prints the "Commit not authorized" text

### Requirement: Close refusals and failures are reported without retry

`close` SHALL return a closed `reason` for each non-commit outcome. A guard `verify` violation SHALL be reported as `guard-violation` with no report, no mark, and no commit; the coordinator, not the tool, SHALL run the guard remediation and call `close` again. A message that fails the commit-rules lint SHALL return `invalid-message` before any mark or add. An empty add-list SHALL return `empty-add-list` and an add-list with nothing to stage SHALL return `nothing-to-stage`, with no commit. A failing `git add` or `git commit` (including a failing commit hook) SHALL return `git-add-failed` or `commit-failed` with the `error` tail, SHALL revert the checkbox marks it wrote, SHALL never use `--no-verify`, and SHALL never retry; the coordinator decides what to do. A declared path with no change SHALL show `+0 -0`, and a rename SHALL take a single report line.

#### Scenario: Guard violation is only reported
- **WHEN** HEAD moved since `--guard-base` during the Step's window
- **THEN** `close` returns `reason: guard-violation`, marks nothing, commits nothing, and leaves the reset to the coordinator

#### Scenario: Commit hook fails
- **WHEN** a commit hook rejects the commit
- **THEN** `close` returns `reason: commit-failed` with the error tail, restores the checkbox state it wrote, does not use `--no-verify`, and does not retry

#### Scenario: Empty add-list
- **WHEN** `close` runs with an empty add-list
- **THEN** it makes no commit and returns `reason: empty-add-list`

### Requirement: The tool is stateless and the coordinator keeps the state machine

`apply-step.js` SHALL read only git, the filesystem, and the change's `implementation.md` and `tasks.md`; it SHALL NOT read or write `sai-state`. The coordinator SHALL keep the `complete-step` emit, every `recovery-ledger@1` event, the guard remediation reset, and commit message authoring per `commit-rules`. Because `close` writes the checkbox marks before the commit, a failed `complete-step` emit after the commit SHALL recover by reseeding `apply-standalone@1` from the on-disk checkboxes.

#### Scenario: Emit fails after the commit
- **WHEN** the `complete-step` emit fails after `close` committed the Step
- **THEN** a restart reseeds `apply-standalone@1` from the on-disk checkboxes, which `close` already marked, and no Step state is lost

### Requirement: The tool resolves identically on both harnesses

The coordinator SHALL locate `apply-step.js` through `sai/policies/tool-resolution.md` and run it with a byte-identical invocation on Claude Code and opencode. The tool SHALL install through the `sai-tools` projection. A missing tool SHALL stop the Step, with no prose fallback.

#### Scenario: Tool is missing
- **WHEN** the coordinator cannot resolve `apply-step.js`
- **THEN** it stops the Step and does not reproduce the verification or the close in prose
