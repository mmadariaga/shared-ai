# apply-step-tool Specification

## Purpose
Defines the stateless `apply-step.js` tool that performs the `/sai-4-apply` post-dispatch verification and the per-Step close (visibility report, checkbox marking, add and commit) in one call each, so the apply coordinator stops doing that mechanical work in prose.

## Requirements

### Requirement: apply-step.js verify runs the post-dispatch checks in one call

After every RED or GREEN dispatch or continuation return, the apply coordinator SHALL run one `apply-step.js verify` call with `--change`, `--step`, `--dispatch red|green|green-direct|green-exception`, the immutable `--baseline` reference, the retained `--checkpoint` reference, the report's field 8 paths on stdin, and `--parent-was-absent` when `.tmp/` did not exist before the Step's first dispatch. Explicit `--baseline-only` MAY replace the dispatch checkpoint for cumulative compatibility verification but SHALL NOT omit the baseline.

The tool SHALL validate retained records before proceeding. It SHALL, in order: sweep exactly `.tmp/{change-name}/`; run the Step test command verbatim, expecting failure after a RED dispatch and success otherwise; after a non-RED dispatch also run the backticked command of each runnable Automated item verbatim, and after a RED dispatch instead check that each plan-named retired file is absent; sweep again; resolve generated declarations; and compare observed execution changes with the files allowed for the dispatch kind and with field 8. Command deduplication SHALL distinguish different expected outcomes.

Per-dispatch changes SHALL be measured against the retained dispatch checkpoint. Cumulative compatibility verification SHALL use the immutable baseline and retained settled state. Unchanged initial unrelated work SHALL remain visible but SHALL NOT become executed scope. Current-Step comparisons SHALL distinguish earlier RED writes from GREEN writes and unchanged previously closed owned work from current changes.

The tool SHALL return one JSON object carrying `ok`, `commands`, `failures`, `unjudged`, `retirements`, `sweep`, `out_of_allowed`, `unreported`, and `only_in_subagent`, plus `unrelated`, `preservation_errors`, and `generated_errors`. `ok` SHALL be true only when no command failed, no retired file remains, no path is out of the allowed set, unreported, or claimed only by the subagent, and no preservation, planning, plan-write, or applicable generated discrepancy remains.

Active-change scratch paths and the plan's own `implementation.md` SHALL be excluded from ordinary path comparisons, but worker plan edits SHALL remain preservation errors. Other changes' scratch SHALL receive no active-change scratch exemption. The `.tmp/` parent SHALL be removed only when `--parent-was-absent` was passed and it is empty after the sweep, and a sweep that removes paths SHALL report the line `> Scratch cleanup: removed <paths>` in `sweep.lines`.

#### Scenario: GREEN dispatch passes verification
- **WHEN** a GREEN dispatch returns, its commands exit as expected, current dispatch changes equal field 8 within allowed files, and retained-state and generated checks pass
- **THEN** `verify` returns `ok: true` with empty `failures`, `out_of_allowed`, `unreported`, and `only_in_subagent`

#### Scenario: RED dispatch expects the Step test command to fail
- **WHEN** a RED dispatch returns, the Step test command exits non-zero, every plan-named retired file is absent, and its other applicable checks pass
- **THEN** `verify` returns `ok: true` and does not count the failing Step test command as a failure

#### Scenario: Undeclared change fails verification
- **WHEN** execution produces a changed path absent from field 8
- **THEN** `verify` returns `ok: false` and lists that path in `unreported`

#### Scenario: Path outside the allowed files fails verification
- **WHEN** a RED dispatch changes a production file that is not in the RED allowed set
- **THEN** `verify` returns `ok: false` and lists that path in `out_of_allowed`

#### Scenario: Scratch is swept and printed
- **WHEN** a dispatch leaves files under `.tmp/{change-name}/`
- **THEN** `verify` removes that directory, lists `> Scratch cleanup: removed .tmp/{change-name}/` in `sweep.lines`, and excludes the swept paths from the comparison

#### Scenario: Preserved unrelated work does not block verification
- **WHEN** unrelated staged and unstaged work equals its initial state and all current dispatch changes match allowed paths and field 8
- **THEN** verify reports the unrelated paths and returns `ok: true` if its other checks pass

#### Scenario: GREEN modifies a RED-owned test
- **WHEN** GREEN changes a test file relative to its retained dispatch checkpoint
- **THEN** verification reports the forbidden change even if RED previously created or changed that file

#### Scenario: New out-of-scope change is preserved and rejected
- **WHEN** execution adds, modifies, deletes, or renames an undeclared path
- **THEN** verification fails without deleting, moving, or discarding the work found

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

One failed `verify` SHALL be a plan finding instead, with no recovery attempt spent: every command passes and the only finding is production files the worker reported that neither `implementation.md` nor `tasks.md` names. The coordinator SHALL then follow `sai/commands/apply/steps/plan-amendment.md`. It SHALL still mark no checkbox and propose no commit until a repeated `verify` passes.

#### Scenario: Failed verify blocks the close
- **WHEN** `verify` returns `ok: false` for a Step
- **THEN** the coordinator marks no checkbox, makes no commit, and enters bounded recovery before any further action on that Step

#### Scenario: Omitted production file is a plan finding
- **WHEN** `verify` returns `ok: false` only because a reported production file is named by neither `implementation.md` nor `tasks.md`
- **THEN** the coordinator spends no recovery attempt and follows the plan-amendment branch

### Requirement: apply-step.js close performs the Step close in one call

`apply-step.js close` SHALL take `--change`, `--step`, immutable `--baseline`, explicit `--guard-base <sha|n/a>`, optionally `--dry-run` or `--mark-only` (mutually exclusive), and on ordinary or dry-run stdin the add-list, a `---` line, then the commit message. Mark-only SHALL take empty stdin. Explicit `n/a` SHALL mean an inactive guard; omission SHALL be an error.

Every mode SHALL validate baseline and guard state and compare the plan with retained coordinator state before marking. Ordinary close SHALL build the visibility report with its pinned status letter, validate the authored message, reject unsafe add-list paths and scope or preservation discrepancies, mark the Step's Automated checkboxes `[x]` in `implementation.md` on disk, then run `git add` for exactly the literal add-list paths that exist in the working tree (a declared removal stages the deletion) and path-limited `git commit --only` with the message. Initial dirty paths and planning inputs SHALL not become Step-owned commit paths. Unrelated staged entries SHALL match their initial state and remain outside the commit.

A registered plan amendment is the one exception: a `tasks.md`, `interfaces.md`, `proposal.md`, or `design.md` of the active change that the coordinator registered through a plan-checkpoint receipt, or declared at the baseline as a run-start amendment, SHALL be staged and committed with the Step, SHALL appear in the report's `Will be committed` block, and SHALL be excluded from the file comparison, so the add-list stays the worker's reported set.

Ordinary close SHALL return one JSON object carrying `status_letter`, `report_text`, `guard`, `committed`, `sha`, `subject`, `reason`, `marked`, and `error` as applicable, and the coordinator SHALL print `report_text` verbatim. Successful committing close SHALL also return an immutable settled receipt and indicate that the guard window closed. Functional checkboxes SHALL never be marked by `close`, and the tool SHALL never add a path outside the add-list and the registered plan amendments. The marks SHALL be written to disk before the commit.

Dry-run SHALL check retained baseline, guard, and plan state and return the report without marking or committing. Mark-only SHALL additionally check scope, preservation, and generated declarations before marking Automated checkboxes, SHALL run no Git mutation, and SHALL return its settled receipt. Missing, corrupt, or mismatched retained state SHALL block continuation.

#### Scenario: Close marks the Step and commits only the add-list
- **WHEN** verified `close` runs with authorized add-list `{src/feature.js}` while unrelated `src/unrelated.js` is also modified but unchanged from the baseline
- **THEN** the Step's Automated checkboxes are `[x]` on disk, the commit contains only `src/feature.js`, and the result carries `committed: true`, the `sha`, and the `subject`

#### Scenario: Close mark-only marks a declined Step
- **WHEN** `close --mark-only` runs with valid retained state and a passing guard, scope, preservation, and generated check
- **THEN** it marks Automated checkboxes `[x]`, runs no report, message check, `git add`, or `git commit`, and returns `reason: mark-only`, `marked`, and the settled receipt

#### Scenario: Close dry-run only reports
- **WHEN** `close --dry-run` runs with valid baseline, guard, and retained plan state
- **THEN** it returns the visibility report with `reason: dry-run`, marks no checkbox, and makes no commit

#### Scenario: Step commit preserves unrelated staging
- **WHEN** a verified Step closes with an exact owned add-list while unrelated staged and unstaged content remains unchanged from the baseline
- **THEN** the commit contains only owned add-list paths and the unrelated content and index entries remain intact

#### Scenario: Declined commit still checks the guard
- **WHEN** mark-only receives a guard reference showing unauthorized HEAD movement
- **THEN** it returns a guard violation before marking any checkbox

#### Scenario: Commit isolation cannot be established
- **WHEN** ordinary close detects unsafe paths, changed unrelated staging, or a scope discrepancy
- **THEN** it refuses the commit before marking or staging those paths

#### Scenario: Registered amendment commits with the Step
- **WHEN** a Step changed `src/extra.js` that its `Files Affected` omitted, the coordinator amended `tasks.md`, and `close` receives the plan-checkpoint receipt that registers it
- **THEN** the result carries `committed: true` with status letter `OK`, and the commit contains `src/extra.js` and the amended `tasks.md` but not `implementation.md`

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

`apply-step.js` SHALL read Git, the filesystem, the change's `implementation.md` and `tasks.md`, and coordinator-owned immutable temporary records; it SHALL NOT read or write `sai-state`. Its temporary records SHALL preserve execution evidence without taking ownership of progress or recovery routing.

The coordinator SHALL keep the `complete-step` emit, every `recovery-ledger@1` event, the guard remediation reset, authorization and receipt references, and commit message authoring per `commit-rules`. Because `close` writes the checkbox marks before the commit, a failed `complete-step` emit after the commit SHALL recover by reseeding `apply-standalone@1` from the on-disk checkboxes. This recovery SHALL retain the original run baseline rather than recapture initial state.

#### Scenario: Emit fails after the commit
- **WHEN** the `complete-step` emit fails after `close` committed the Step
- **THEN** a restart reseeds `apply-standalone@1` from the on-disk checkboxes, which `close` already marked, and no Step state is lost

### Requirement: The tool resolves identically on both harnesses

The coordinator SHALL locate `apply-step.js` through `sai/policies/tool-resolution.md` and run it with a byte-identical invocation on Claude Code and opencode. The tool SHALL install through the `sai-tools` projection. A missing tool SHALL stop the Step, with no prose fallback.

#### Scenario: Tool is missing
- **WHEN** the coordinator cannot resolve `apply-step.js`
- **THEN** it stops the Step and does not reproduce the verification or the close in prose

### Requirement: Executable-plan preflight uses Apply interpretation functions

`apply-step.js preflight` SHALL read the selected change's plan and tasks using the same interpretation functions used by verify and close. It SHALL execute no tests and write no files. It SHALL report `ok`, recognized Steps, and errors containing Step, file, line, and reason.

The check SHALL reject missing recognized Step headings, malformed Step headings, duplicate or invalid Step numbers, missing recognized Automated checklists or STOP & COMMIT markers, incomplete recognized RED/GREEN contracts, unsupported required instruction paths, incomplete command checks, conflicting expectations for the same command, incompatible RED/GREEN checklist commands, terminal full-suite commands in Step checklists, malformed affected-file declarations, and missing or incompatible existing-test carry-through. Semantic coverage SHALL remain explicitly agent-reviewed rather than guaranteed by preflight.

The check SHALL also reject, with file `tasks.md` and a reason starting `Files Affected omits a path the plan names`, every path that `implementation.md` names in a Step's RED or GREEN instructions and that the Step's `**Files Affected**` does not declare. A retired test file SHALL NOT count as a named work path, and a declared generated family SHALL cover its members.

The malformed Step heading check SHALL ignore every line under `## Appendix: Plan vs Final Implementation` up to the next second-level heading. A malformed Step heading anywhere else SHALL still be an error.

#### Scenario: Invalid plan stops before execution
- **WHEN** the plan has a required instruction that Apply cannot interpret
- **THEN** preflight returns `ok: false` with a located reason and executes no test or file mutation

#### Scenario: Existing-test adaptation is absent from RED
- **WHEN** tasks declare an existing test with a failure mode but its RED update declaration is absent or incompatible
- **THEN** preflight fails with the Step and tasks location

#### Scenario: Plan names a path the file list omits
- **WHEN** a Step's GREEN instructions in `implementation.md` name `src/extra.js` and that Step's `**Files Affected**` does not declare it
- **THEN** preflight returns one error for that Step with file `tasks.md`, a positive line, and a reason naming `src/extra.js`

#### Scenario: Appendix entries from an earlier run
- **WHEN** `implementation.md` carries `### Step 1 — Extra file` under `## Appendix: Plan vs Final Implementation`
- **THEN** preflight reports no `unrecognized Step heading` error for that line

#### Scenario: Stray Step heading outside the appendix
- **WHEN** `implementation.md` carries `### Step 9 — stray` under another second-level section
- **THEN** preflight reports an `unrecognized Step heading` error

### Requirement: Immutable execution records retain initial ownership evidence

The baseline subcommand SHALL require a stable coordinator-supplied run identity and capture initial file content fingerprints, Git status, index entries, and HEAD in an immutable temporary record outside the repository and swept scratch directory. Planning input paths SHALL be exact authorized artifact paths of the active change. Pre-existing per-change scratch SHALL block capture.

The capture registry SHALL refuse another capture for the same run identity, including after record loss. Record references SHALL include integrity evidence. Loading SHALL reject missing, corrupt, wrong-kind, wrong-project, wrong-change, or mismatched run records rather than capturing a replacement initial state.

#### Scenario: Retry cannot hide earlier modifications
- **WHEN** a run attempts baseline capture again using its retained run identity
- **THEN** capture is refused and continuation requires the original retained reference

#### Scenario: Initial record is unavailable
- **WHEN** verification or close receives a missing or corrupt baseline reference
- **THEN** the operation stops without recapturing initial state

### Requirement: Dispatch checks protect initially dirty Step paths

Before a worker can write, dispatch-check SHALL compare the dispatch's allowed exact paths and bounded generated families against initially dirty paths in the baseline. A conflict SHALL return `ok: false`, exact conflicts, and no checkpoint. A successful check SHALL return an immutable checkpoint tied to the baseline, run, Step, and dispatch kind.

#### Scenario: Authorized path contains pre-existing work
- **WHEN** an allowed Step file has unresolved modifications in the initial baseline
- **THEN** dispatch-check rejects the dispatch before worker writes

### Requirement: Settled and plan receipts distinguish authorized bookkeeping

Close SHALL return immutable settled state after successful committing close or declined-commit marking. Later operations SHALL use that receipt to exclude unchanged previously closed owned work from the current Step's changes without changing the initial baseline.

Cumulative verification and close SHALL reject plan changes relative to the initial or settled coordinator state before executing commands or marking checkboxes. The coordinator-only checkpoint-plan subcommand SHALL record already-authorized plan bookkeeping; close MAY receive that exact receipt. Missing, corrupt, or mismatched receipts SHALL block continuation.

The same receipt SHALL be the only way an edit of the active change's `tasks.md`, `interfaces.md`, `proposal.md`, or `design.md` becomes acceptable. `checkpoint-plan` SHALL accept the retained `--settled` reference and SHALL return, beside the receipt, a `registers` list naming exactly those artifacts whose content differs from the settled or initial state. `verify` and `close` SHALL accept the receipt as `--plan-checkpoint`. An edit of one of those artifacts that no receipt, settled receipt, or baseline declaration carries SHALL be an error: `verify` SHALL report it under `preservation_errors` and `close` SHALL refuse with `scope-blocked`, including when the Step's own `**Files Affected**` declares the artifact. An amendment committed with a Step SHALL stay accepted for later Steps through the settled receipt.

#### Scenario: Declined Step remains outside the next commit
- **WHEN** a previously declined Step's owned files remain unchanged and a later Step uses the settled receipt
- **THEN** those earlier files remain visible but do not become the later Step's execution changes or commit content

#### Scenario: Worker changes the retained plan
- **WHEN** cumulative verification or close observes an unapproved change to implementation.md
- **THEN** it stops before command execution or checkbox marking

#### Scenario: Receipt names the artifacts it registers
- **WHEN** the coordinator edited only `tasks.md` and runs `checkpoint-plan`
- **THEN** the result carries `registers` equal to the single path of that `tasks.md`

#### Scenario: Unregistered edit of a planning artifact
- **WHEN** `tasks.md` differs from the retained state and `close` receives no receipt that registers it
- **THEN** `close` returns `reason: scope-blocked` with an error naming `tasks.md`

#### Scenario: Edit after the receipt
- **WHEN** `tasks.md` changes again after the receipt was captured and `verify` runs with that receipt
- **THEN** `verify` returns `ok: false` and lists `tasks.md` under `preservation_errors`

### Requirement: Generated declarations resolve to bounded exact paths

Apply SHALL resolve each declared generated family within its exact directory to regular files matching its literal basename prefix and suffix. GREEN verification and close SHALL reject missing or extra files, overlapping declarations, ambiguous exact paths, and declaration errors. RED MAY defer generated-count discrepancies while the outputs have not yet been implemented. Commits SHALL use resolved exact paths, not wildcard pathspecs.

#### Scenario: Generated count differs
- **WHEN** a declaration expects two matching generated files but GREEN or close finds one or three
- **THEN** the generated discrepancy blocks completion or close

### Requirement: State capture excludes ignored paths unless the plan declares them

Every state capture of `apply-step.js` (the baseline, each dispatch checkpoint, each settled receipt, and the current state compared by `dispatch-check`, `verify`, `close`, and `restore-unrelated-index`) SHALL fingerprint tracked files plus untracked files that git's standard exclusion rules do not ignore. An ignored path is an untracked file skipped by `.gitignore`, `.git/info/exclude`, or the user's global excludes file; a tracked file SHALL never be treated as ignored, even when it matches an ignore pattern.

An ignored path SHALL be outside the capture, so creating, changing, or deleting it SHALL NOT produce an `out_of_allowed`, `unreported`, or `only_in_subagent` entry. Ignore status SHALL be evaluated at every capture, so a path whose visibility changes between two captures SHALL appear as a change. A tracked exclusion file such as `.gitignore` SHALL remain captured like any other tracked file.

Every capture SHALL additionally include the exact paths that any Step of the change's `tasks.md` declares in `**Files Affected**`, together with the resolved files of declared generated families, whether or not git ignores them. A generated family that cannot be resolved SHALL NOT stop the capture; the capture SHALL keep that Step's exact declared paths. The verdict shape SHALL stay unchanged, with no field, option, or mode that restores the capture of ignored paths.

#### Scenario: Ignored file created after the checkpoint
- **WHEN** an ignored file is created after a RED dispatch checkpoint and the dispatch's declared files are the only other changes
- **THEN** `verify` returns `ok: true` and does not list the ignored file in `out_of_allowed`

#### Scenario: Step command regenerates ignored outputs
- **WHEN** the Step test command creates, changes, and deletes files under an ignored directory during `verify`
- **THEN** `verify` returns `ok: true` with an empty `out_of_allowed`

#### Scenario: Tracked file matching an ignore pattern
- **WHEN** a tracked file that matches an ignore pattern is changed outside the dispatch's allowed files
- **THEN** `verify` returns `ok: false` and lists that file in `out_of_allowed`

#### Scenario: Untracked visible file outside the Step scope
- **WHEN** an untracked file that git does not ignore is created outside the dispatch's allowed files
- **THEN** `verify` returns `ok: false` and lists that file in `out_of_allowed`

#### Scenario: Exclusion file edited outside the Step scope
- **WHEN** `.gitignore` is changed outside the dispatch's allowed files
- **THEN** `verify` returns `ok: false` and lists `.gitignore` in `out_of_allowed`

#### Scenario: File becomes ignored between captures
- **WHEN** a file captured as visible at the checkpoint is ignored by a machine-local exclusion before `verify`
- **THEN** `verify` returns `ok: false` and lists that file in `out_of_allowed`

#### Scenario: Declared ignored path is written and reported
- **WHEN** a worker writes a file that the plan declares in `**Files Affected**`, git ignores that file, and the report's field 8 names it
- **THEN** `verify` returns `ok: true` with an empty `only_in_subagent`

#### Scenario: Declared ignored path is written but not reported
- **WHEN** a worker writes a plan-declared ignored file and the report's field 8 omits it
- **THEN** `verify` returns `ok: false` and lists that file in `unreported`

### Requirement: Baseline declares run-start plan amendments

The baseline subcommand SHALL accept stdin lines of the form `amended: <path>` beside the planning input paths. Each such path SHALL be one of the active change's `tasks.md`, `interfaces.md`, `proposal.md`, or `design.md`; any other path SHALL be rejected as an error with no capture result. A declared path SHALL be recorded as a planning input and as a run-start amendment, and the first Step that closes while the artifact is still uncommitted SHALL commit it.

#### Scenario: Run-start amendment commits with the first closing Step
- **WHEN** the baseline is captured with `amended: openspec/changes/demo/tasks.md` and Step 1 then closes
- **THEN** the Step 1 commit contains `openspec/changes/demo/tasks.md`

#### Scenario: Amended line names a non-amendable artifact
- **WHEN** the baseline stdin carries `amended: openspec/changes/demo/implementation.md`
- **THEN** the subcommand exits with an error
