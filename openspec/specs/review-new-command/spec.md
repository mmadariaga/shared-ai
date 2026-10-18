# review-new-command Specification

## Purpose
`/sai-4-review-new` is the review-only command of the `-new` family: it reviews a change's diff against its parent branch in a fresh worker and writes `review.md`, leaving every finding fix to `/sai-3-implement-new`.

## Requirements

### Requirement: Review-new is a review-only command

`/sai-4-review` SHALL review a change's diff and write `openspec/changes/{name}/review.md` without fixing any finding. It SHALL have no Direct Build close and SHALL dispatch no review-fix worker. The review worker SHALL write only `openspec/changes/{name}/review.md`, SHALL run no git command that changes the repository, SHALL create no commit, and SHALL run no `openspec` command. Open findings SHALL be left for `/sai-3-implement`, which stays their only fix owner.

#### Scenario: Findings are recorded, not fixed

- **WHEN** the review finds Critical, High, Medium, or Low findings in the diff
- **THEN** `/sai-4-review` records them in `review.md`, changes no production or test file, and its close names `/sai-3-implement` as the command that applies them.

### Requirement: Review-new runs outside the shared orchestration

The `/sai-4-review` coordinator SHALL load only the cross-cutting contracts that never stop a run (public chat, `remember`, `safe-operations`, the prerequisite check with its paths, and `tool-resolution`) plus `sai/policies/finding-state.md` and `sai/commands/review/options.md`. It SHALL NOT load `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, or `composition.md`, and SHALL have no progress plan, no panel, and no interactive change picker. The command wrappers on Claude Code and opencode SHALL fetch the harness fetch skill and `sai/commands/review/coordinator.md` directly, forwarding an `InvocationEnvelope` with `command_name: review`.

#### Scenario: Wrapper loads the coordinator directly

- **WHEN** a user invokes `/sai-4-review` on either harness
- **THEN** the wrapper fetches the fetch skill and `sai/commands/review/coordinator.md` and loads no boot adapter or shared orchestration contract.

### Requirement: Review-new arguments

`/sai-4-review` SHALL accept an optional change name and an optional `--parent-branch <branch>` option, and SHALL drop a `--fast-track` token without effect. An unknown `--` token, a second positional value, or an option without its value SHALL print `Cannot start /sai-4-review: unknown or malformed argument '{token}'. The parent branch is passed as --parent-branch <branch>.` and end the run without writing anything. Between change resolution and its close, the command SHALL ask the user nothing except the escalation of a report the worker cannot produce.

#### Scenario: Malformed argument

- **WHEN** a user invokes `/sai-4-review my-change --parent-branch`
- **THEN** the command prints the malformed-argument literal naming `--parent-branch` and ends the run with no file written.

### Requirement: Review-new change resolution without a picker

When the change name is empty, `/sai-4-review` SHALL take the only change directory under `openspec/changes/` (archive excluded) that holds a `proposal.md`. When there are zero or several such directories, it SHALL print `Cannot start /sai-4-review: name the change ({candidates, or none}).` and end the run without escalating and without writing anything. A named change without `openspec/changes/{name}/proposal.md` SHALL print `Cannot start /sai-4-review for {name}: missing proposal.md.` and end the run without writing anything.

#### Scenario: Several candidate changes

- **WHEN** `/sai-4-review` is invoked without a change name and two active change directories hold a `proposal.md`
- **THEN** the command prints the name-the-change literal listing both candidates and ends the run with no file written.

### Requirement: Fresh review worker guided by a step machine

The coordinator SHALL create `sai-4-review-worker` once per run, through a binding rendered from the review role's binding template, with a creation dispatch that carries only the ready prompt; the worker SHALL return `event: ready` with empty `changed_files`, and the task SHALL arrive in the next message to the same worker. The worker's steps SHALL be delivered by pointer from the `review-steps@1` linear step machine, registered in `sai-state/registry.js`, whose steps are the fileless `review-intake` followed by `establish-diff-scope`, `resolve-review-analysis`, and `close-review-outcome`, each at `sai/commands/review/steps/{step}.md`. When the `sai-state` store fails, the coordinator SHALL send the pointers from that static order. The worker MAY dispatch only `budget-explorer`, with a shared cap of eight dispatches per review.

#### Scenario: Store failure falls back to the static order

- **WHEN** the `sai-state` emit for `review-steps@1` fails after the worker returns `step-done` for `establish-diff-scope`
- **THEN** the coordinator sends `Active step: resolve-review-analysis` with the pointer to `sai/commands/review/steps/resolve-review-analysis.md` and the run continues.

### Requirement: Parent branch and empty diff

The worker SHALL take as parent branch the first candidate that `git rev-parse --verify` accepts among the `--parent-branch` value, the repository default branch from `refs/remotes/origin/HEAD`, `master`, and `main`, and SHALL return `failed` naming the candidates when none verifies. When `git diff --name-status {parent-branch}...HEAD` is empty, the run SHALL end with `No changes detected against {parent-branch}. Nothing to review.`, write no `review.md`, commit nothing, and close with `Review done.`.

#### Scenario: Empty diff

- **WHEN** the branch has no changes against its parent branch
- **THEN** `/sai-4-review` prints `No changes detected against {parent-branch}. Nothing to review.`, writes no `review.md`, and creates no commit.

### Requirement: Review passes, severities, and modes

The review SHALL apply eleven passes to every changed file: domain alignment, correctness, security triage, performance triage, accessibility triage, maintainability, testing, consistency with the codebase, domain language consistency, documentation and migrations, and resilience. Each finding SHALL be located at `file:line`, justified, within the recorded decisions, and assigned one severity among Critical, High, Medium, Low, and Question. The security, performance, and accessibility passes SHALL each flag whether their surface is touched and recommend `/sai-6-security`, `/sai-7-performance`, or `/sai-8-accessibility` on yes, without running any audit. A diff of at most 500 changed lines SHALL be reviewed directly; a larger diff SHALL be partitioned into at most eight groups inspected through `budget-explorer` subagents. Before saving, exactly one `budget-explorer` adversary SHALL challenge a non-empty draft to discard false positives and correct severities, and the worker SHALL keep its own findings when that dispatch fails.

#### Scenario: Large diff is delegated

- **WHEN** the diff against the parent branch exceeds 500 changed lines
- **THEN** the worker keeps the full diff out of its context and inspects at most eight file groups through `budget-explorer` subagents.

### Requirement: Pending findings of build-log.md are leads

When `openspec/changes/{name}/build-log.md` lists pending findings, the worker SHALL read them as leads, verify each against the current diff and the code on disk, and write into `review.md` only the ones that still hold, as ordinary findings under its own identifiers and severities.

#### Scenario: A pending finding no longer holds

- **WHEN** `build-log.md` lists a pending finding that the current code no longer exhibits
- **THEN** `review.md` does not contain that finding.

### Requirement: Single report format and full regeneration

The worker SHALL write `review.md` in the format of `sai/commands/review/review-report.template.md`, read in place as the single format source, with an identifier on every finding, the three `Surface touched` lines, a `## Recommended Audits` block, and a closing `Summary:` tally. A new review SHALL regenerate `review.md` completely, replacing earlier findings together with their ` (FIXED)` marks and the user's deletions, without reading the earlier report.

#### Scenario: Rerun replaces the report

- **WHEN** `/sai-4-review` runs on a change whose `review.md` holds findings marked ` (FIXED)`
- **THEN** the new `review.md` contains only the findings of the new review and none of the earlier marks.

### Requirement: Coordinator verification and bounded obstacle handling

The coordinator SHALL verify the returned `review.md` itself, in place of the worker-report validator: the file exists and is non-empty, every finding heading carries an identifier whose letter matches its severity heading, the three `Surface touched` lines are present, the `Summary:` tally matches the findings under each severity heading, and the worker's `counts` agree with the tally. An invalid report, a worker that returns no ready, or a silent or drifting worker SHALL be an obstacle with a budget of 3 attempts, each with a different approach (a corrected instruction, a new worker with a hand-over note, or a mechanical repair that adds, removes, or rewrites no finding). An exhausted budget SHALL escalate at once through the native picker with coordinator-written options that include stopping the run; a stop or an unanswered question SHALL end the run without a closing line and without a commit.

#### Scenario: Tally mismatch is repaired

- **WHEN** the worker returns a `review.md` whose `Summary:` tally miscounts its findings
- **THEN** the coordinator treats it as an obstacle and corrects it within at most 3 attempts before committing anything.

### Requirement: Review report commit

After a successful verification, the coordinator SHALL check `openspec/changes/{name}/review.md` with `git check-ignore -q`. When the path is not ignored, it SHALL stage that path alone and create one local commit limited to it, with a Conventional Commits subject of at most 50 characters and no `Co-Authored-By` or other AI-attribution line, so that no path already staged or modified before the run enters the commit. When the path is ignored, `review.md` SHALL stay on disk uncommitted. The coordinator SHALL never force-add and SHALL never push. Invoking the command SHALL authorize this one local commit and nothing else.

#### Scenario: Ignored report stays on disk

- **WHEN** the project's ignore rules ignore `openspec/changes/{name}/review.md`
- **THEN** the report stays on disk, no commit is created, and nothing is force-added or pushed.

### Requirement: Review-new close

On a completed review, the coordinator SHALL print the worker's summary (severity counts, the top three Critical findings when present, the report path, and the parent-branch statement), the `## Recommended Audits` block verbatim, and whether `review.md` was committed or left uncommitted because it is ignored, then end with exactly `Review done.`. A `failed` worker result SHALL print its summary and end with no closing line and no commit. The coordinator SHALL close its `sai-state` session before ending in any outcome.

#### Scenario: Completed review closes

- **WHEN** the worker returns `completed` and the report passes verification
- **THEN** the coordinator prints the counts, the recommended audits, and the commit state, and ends with `Review done.`.

### Requirement: Review-new installation

The `/sai-4-review` command SHALL be installed on Claude Code and opencode from `commands/claude/sai-4-review.md` and `commands/opencode/sai-4-review.md`, with the `review-command` capability profile in `sai/install-manifest.json`. The worker `sai-4-review-worker` SHALL be registered as the `review` phase role in `bin/worker-matrix.js` and `sai/install-manifest.json`, with contract `sai/commands/review/worker.md`, binding stem `review`, the `worker-research` capability profile, and one managed agent per harness. The model-customization menu SHALL list the command and its worker.

#### Scenario: Install renders the worker on both harnesses

- **WHEN** the installer runs for Claude Code and for opencode
- **THEN** each harness receives the `sai-4-review` command wrapper and a `sai-4-review-worker` agent, and the worker roster validates.
