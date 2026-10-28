# sai-merge-command Specification

## Purpose

Defines the `/sai-merge` routed command: pre-merge environment guards, the method and recency-ordered branch selection, the coordinator-only git mutation surface with a worker limited to resolution content writes, the method-aware side mapping, contextual conflict analysis inside one confirmed global strategy, the fast-track-gated runtime resolution scope, the bounded three-round verification loop, the incremental ADR/DDR collision pass, and explicit finalization authorization.

## Requirements

### Requirement: Every merge stops before its commit

The coordinator SHALL launch the `merge` method with `git merge --no-ff --no-commit <source_ref>` where `source_ref` is the full `ref` of a picked preflight candidate, `refs/heads/<name>` for an unprefixed free-text or argument entry, and `refs/remotes/origin/<name>` for an `origin/<name>` entry. Clean and conflicted merges SHALL stop before committing so the existing collision, review, verification, and staging checks applicable to the route precede automatic local finalization under command-local authorization. A fast-forward SHALL never occur.

#### Scenario: Clean merge waits for authorization

- **WHEN** a merge completes without conflicts
- **THEN** the merge remains in progress with its result staged, the collision pass runs, and the coordinator commits automatically under invocation authorization without asking a finalization question

#### Scenario: Free-text source launches via exact ref

- **WHEN** a validated free-text entry resolves to its exact `source_ref`
- **THEN** the merge launches with that ref and stops before commit for the applicable checks and automatic coordinator finalization

### Requirement: Method-aware side mapping

The worker SHALL map git stages to branches by method: for `merge`, stage 2 (`--ours`) is the current branch and stage 3 (`--theirs`) the selected branch; for `rebase`, stage 2 is the selected branch and stage 3 the current branch's replayed commit. Decision values `ours` / `theirs` and payload sources `git-ours` / `git-theirs` SHALL always denote the git stage, and alternatives SHALL be described to the human by branch and behavior.

#### Scenario: Rebase keeps the user's chosen branch

- **WHEN** during a rebase the confirmed strategy keeps the current branch's version of a file
- **THEN** the payload records `git-theirs` for that file and `git checkout --theirs` materializes the current branch's version

### Requirement: Region-scoped alternatives

When every region of a file resolves to the same stage, the alternative SHALL come from git unchanged (`git-ours` or `git-theirs`) only when the captured stage-checkout check establishes that this preserves Git-combined content outside the regions. Otherwise the file SHALL be `authored` with region splices preserving the captured working content, even when every region selects the same side. When regions resolve to different stages or need new text, the file SHALL be `authored`, with a region-scoped combination that keeps one owner per responsibility and one source per fact and is never built by concatenating fragments. A file the conflict bundle marks `whole-side-only` — a conflict without markers, such as a binary file, a deletion on one side, or a rename, or a file whose encoding the tool cannot determine — SHALL resolve to a git side or be escalated. Any changed representation SHALL appear in the complete strategy before application.

#### Scenario: Mixed-side file is authored

- **WHEN** a file's regions resolve to different stages
- **THEN** the git shortcut is not used and the worker authors each region's replacement text

#### Scenario: Same-side resolution preserves automatic combinations

- **WHEN** all conflict regions choose one stage but whole-stage checkout would discard Git-combined content outside those regions
- **THEN** the strategy uses authored region splices with the same intended decisions and preserves the captured outside-region content

#### Scenario: Safe whole-stage alternative remains available

- **WHEN** the captured stage-checkout check establishes that a same-stage alternative preserves the combined content
- **THEN** the strategy may use the unchanged Git-sourced alternative for coordinator materialization

### Requirement: Runtime resolution scope gate

Resolution scope SHALL always include every affected conflicted file in every mode. The worker and coordinator SHALL NOT offer partial-scope choices, derive eligible scope options, ask a scope-selection question, or defer files because of a selected scope.

#### Scenario: Absent conflict categories are omitted

- **WHEN** a conflicted integration contains only code conflicts
- **THEN** every affected code file is included in resolution without a scope question or artifacts-only choice

#### Scenario: Mixed categories use full scope

- **WHEN** the affected conflict set includes specs, ADR/DDR records, and code
- **THEN** the strategy and complete resolution payload cover every affected file without partial-scope options or deferred-scope entries

### Requirement: Incremental ADR/DDR collision pass

The system SHALL run the ADR/DDR collision pass on the final integration state using only source-introduced records that survive in it. The coordinator SHALL capture `target_sha`, `source_sha`, `merge_base`, and the added-only source record inventory before the launch and forward them unchanged. The source inventory SHALL include bare and alphabetically suffixed ADR/DDR record filenames while excluding indexes, renames, and copies. Candidate keys SHALL be `(family, numeric prefix)`, compared only against final-state bare and suffixed records; references SHALL be repaired only for affected family-aware identifiers. A mechanically verified empty introduced-record inventory SHALL yield `not-applicable` without grouping or reference searches. Uncertain survival, renames, or references SHALL return to worker judgment rather than an approximate non-applicability or repair decision.

#### Scenario: Numeric collision repaired

- **WHEN** two `0010-*.md` records coexist in the final state and the key is in the source frontier
- **THEN** the older becomes `0010a-…md`, the newer `0010b-…md` by introduction date, and links, relationship tokens, index metadata, and OpenSpec mentions follow the suffixed identifiers

#### Scenario: Empty frontier skips the pass

- **WHEN** no source-introduced record survives, or neither ADR nor DDR directory exists
- **THEN** the applicability is `not-applicable` and no collision work is rendered

#### Scenario: Unrelated historical collisions remain untouched

- **WHEN** a final-state collision key is absent from the source frontier
- **THEN** the worker does not inspect, rename, or search references for that group

#### Scenario: Orphan reference is reported, never invented

- **WHEN** an affected reference matches no file after renaming
- **THEN** it is reported as an orphan and left unmodified

#### Scenario: Suffixed introductions remain applicable

- **WHEN** the source introduces `docs/adr/0011a-new.md` or `docs/ddr/0011aa-new.md`
- **THEN** that record remains in the source frontier and is compared against final-state records of the same family and numeric prefix

#### Scenario: Uncertain survival requires judgment

- **WHEN** an introduced record is missing at its captured path in the final state
- **THEN** the mechanical result requests survival-or-rename reconciliation and the worker establishes its disposition without assuming no collision work exists

### Requirement: Informative merge finalization message
The system SHALL compose the merge finalization commit with the subject as today within 50 characters followed by a body listing every contained commit in `merge_base..source_sha`, enumerated with `git log --reverse --format=%s` in chronological order, one `- <first line>` body line per commit, literal with no reformat, translation, or hash, all commits with no truncation, with a blank line between subject and list and each bullet kept on one line even past 72 characters with no rewrap or trim.

#### Scenario: Multiple contained commits listed
- **WHEN** the merge range contains more than one commit
- **THEN** the body lists every first line as its own bullet in chronological order with no truncation

#### Scenario: Empty range yields subject alone
- **WHEN** the merge range contains no new commit
- **THEN** the commit carries the subject alone with no list

#### Scenario: Single commit still yields one bullet
- **WHEN** the merge range contains exactly one commit
- **THEN** the body carries one bullet and the line is never folded into the subject

#### Scenario: Resolution changes no bullets
- **WHEN** conflict resolution completes before finalization
- **THEN** the list still reflects only the contained commits

### Requirement: Informative squash creation message
The system SHALL compose the `rebase-squash` squash commit with the same informative format, listing every squashed commit in `merge_base..HEAD` with the identical subject, enumeration, literal, ordering, no-truncation, blank-line, and one-line bullet rules, while plain rebase and a finished rebase with nothing staged SHALL carry no list.

#### Scenario: Squash lists current-branch uniques
- **WHEN** `rebase-squash` unifies the current-branch uniques before rebasing
- **THEN** the squash commit body lists every unique first line in chronological order

#### Scenario: Plain rebase carries no list
- **WHEN** the method is plain rebase or a finished rebase has nothing staged
- **THEN** no inventory list applies

### Requirement: Deterministic merge mechanical evidence

The merge workflow SHALL obtain mechanical preflight, provenance, conflict, suite, verification, collision, and closing status facts through `sai/tools/merge.js`, and the coordinator SHALL collect them. Fact receipts SHALL identify their version, action, outcome, dependencies, captured state, and data. Results SHALL distinguish successful collection, failed assertions, and explicit non-applicability. Mechanical evidence SHALL NOT select semantic intentions, authorize mutations, replace independent review, or alter existing gates and correction budgets.

#### Scenario: Preflight facts are collected together

- **WHEN** the coordinator enters the preflight stage
- **THEN** one engine call returns dirty paths, merge and rebase guards, the current branch, and the authoritative candidates not merged into `HEAD` (local branches, the current branch's upstream, and each remote's default branch, each with name and full `ref`) sorted by full committer timestamp descending and exact branch name ascending

#### Scenario: Captured launch provenance remains historical

- **WHEN** the coordinator validates the selected exact source ref and prepares to launch integration
- **THEN** it captures and validates provenance before launch or squash, recollects stale launch facts, and forwards the original captured SHAs and receipt unchanged after launch

#### Scenario: Mechanical evidence does not authorize a resolution

- **WHEN** an engine result establishes a repository fact
- **THEN** semantic decisions remain worker responsibilities and approval, lifecycle validation, independent review, unrelated-change protection, HEAD checks, and Git mutations remain coordinator responsibilities

#### Scenario: Collection errors remain failures

- **WHEN** mechanical evidence is missing, malformed, incomplete, or cannot be collected
- **THEN** the workflow reports the failure rather than inferring success or treating non-applicability as a passed test

### Requirement: Protected merge snapshots and external records

The coordinator SHALL capture the actual conflicted working file before resolution writes, including Git-combined content, ordered marker byte ranges, file modes, stage blob identifiers, and unrelated-content inventory. Snapshot and receipt records SHALL use unique external paths outside the target repository, SHALL NOT overwrite existing records, and SHALL remain available by exact reference and checksum through continuation, replacement, and closure. These records and validation inputs SHALL NOT enter the repository changed-files union or staging set. An authorized correction with new boundaries SHALL receive a separate snapshot of the exact current preimage and explicitly authorized ordered disjoint byte ranges; capturing a correction SHALL NOT broaden scope or replace the original protection evidence.

#### Scenario: Snapshot captures automatic combinations

- **WHEN** Git combines non-conflicting content from both branches around conflict regions
- **THEN** the pre-write snapshot retains that combined working content as the reference for resolution checks

#### Scenario: External evidence cannot silently change

- **WHEN** a referenced snapshot is missing or its bytes do not match the retained checksum
- **THEN** the workflow stops before writing, staging, or finalizing instead of overwriting or reconstructing the record

#### Scenario: Validation inputs stay outside the repository

- **WHEN** the coordinator stores the original worker result and confirmed semantic decisions for resolution checking
- **THEN** it uses unique external files, retains their exact references and hashes, and excludes them from unrelated-content changes and staging candidates

#### Scenario: Verification correction has explicit boundaries

- **WHEN** an authorized fix requires different replacement ranges after staging
- **THEN** the coordinator independently confirms boundaries within the affected path set, captures the exact preimage and ranges, and validates and reviews the correction before re-staging

#### Scenario: Incorrect writes do not redefine protection

- **WHEN** review rejects an initial resolution write
- **THEN** correction retains the original protected snapshot rather than capturing the incorrect write as a new unrestricted baseline

### Requirement: Reproducible merge efficiency evidence

The mechanical comparison SHALL compare equivalent preflight facts against the same unchanged fixture, report model-facing collection calls separately from internal subprocesses, and identify the retained instruction-volume baseline by exact revision, source path, checksum, and byte count. Measurement documentation SHALL distinguish observed mechanical and instruction-volume results from unmeasured full-runtime latency and SHALL provide a paired runtime protocol for Claude Code and opencode that keeps models and configuration constant, separates automatic time from human waiting and test time, and checks correct resolution and preserved guarantees. No sub-five-minute threshold or attribution of all time outside tools to the model SHALL be inferred from the mechanical comparison.

#### Scenario: Committing does not move the measurement baseline

- **WHEN** the comparison runs after committing the implementation or in a shallow checkout
- **THEN** its before-side instruction volume comes from the retained revision-identified fixture rather than moving HEAD or unavailable historical objects

#### Scenario: Boundary reductions do not imply latency gains

- **WHEN** fewer collection calls or smaller initial instruction disclosure are measured
- **THEN** the report limits its conclusion to those observed metrics and identifies full-runtime latency as unmeasured until equivalent paired traces exist

#### Scenario: Runtime comparison preserves configuration

- **WHEN** a full-runtime comparison follows the documented protocol
- **THEN** paired cases retain equivalent repository and model configuration, record human waiting and tool and test intervals separately, and verify correct resolution and preserved guarantees on both harnesses

### Requirement: Provenance capture validates the exact source ref

The merge tool's `provenance` action SHALL check the source ref's format, its existence, and its commit before capturing the merge provenance, in one call. The accepted format SHALL be a full branch ref, `refs/heads/<name>` or `refs/remotes/<remote>/<name>` under any remote. A ref that fails any check SHALL produce no provenance receipt.

#### Scenario: Missing ref produces no receipt

- **WHEN** `provenance` receives a well-formed ref that does not exist
- **THEN** the call fails and the coordinator closes the run with the branch-failure text without launching

#### Scenario: Remote default branch is accepted

- **WHEN** `provenance` receives an existing `refs/remotes/origin/main` for a merge
- **THEN** the call captures the provenance without a format error

### Requirement: Role-split efficiency comparison

The merge efficiency documentation SHALL compare the same scenario before and after the role split in model turns, tool calls, and tokens per run, and SHALL treat minutes as context only. It SHALL label the after column as derived from the contract and SHALL mark every figure without an observed after-run as unmeasured.

#### Scenario: Contract-derived figures are not presented as observed

- **WHEN** the comparison reports the after-side worker stretches and merge-tool calls with no traced after-run
- **THEN** it identifies them as contract-derived and reports the after-side token counts as unmeasured

### Requirement: Test command resolution order

The merge coordinator SHALL fix the test command once in preflight, before the integration launches, from the first source that names an explicit command, in this order: `AGENTS.md` at the project root, `README.md` at the project root, then the merge tool's marker list. An explicit command SHALL be a test invocation written literally in the document, copied exactly; a command that would have to be inferred SHALL NOT count. A document that names several test commands, none clearly the general one, SHALL count as naming none. When neither document names an explicit command, the coordinator SHALL capture the marker list's outcome in preflight with `suite --record` and SHALL retain the returned record reference and hash as the fixed value.

#### Scenario: Command documented in AGENTS.md is chosen

- **WHEN** `AGENTS.md` at the project root names one explicit test command
- **THEN** the coordinator fixes that command exactly as written and consults neither `README.md` nor the marker list

#### Scenario: README decides when AGENTS.md names none

- **WHEN** `AGENTS.md` names no explicit test command and `README.md` at the project root names one
- **THEN** the coordinator fixes the `README.md` command exactly as written

#### Scenario: Several documented commands count as none

- **WHEN** a document names several test commands and none is clearly the general one
- **THEN** that document counts as naming none and the next source in the order decides

#### Scenario: Marker list outcome is captured in preflight

- **WHEN** neither `AGENTS.md` nor `README.md` names an explicit test command
- **THEN** the coordinator records the marker list's outcome with `suite --record` before the launch and keeps the record reference and hash

### Requirement: Verification runs the fixed test command

The merge tool's `verify` action SHALL accept `--command <line>` for a documented command, or `--suite <record> --suite-hash <sha256>` for a suite record captured before the launch, and the coordinator SHALL pass one of the two on every verification call, including the baseline and the comparison against it, so that no run of the suite detects the command again. A documented command SHALL run instead of the marker list and its receipt SHALL carry `command_source: documented`; a marker-list command SHALL carry `command_source: list`. A captured suite record SHALL decide the command, or the absence of one, whatever marker files the integration later adds or removes. The tool MUST refuse with a usage or collection error a `--suite` without a matching `--suite-hash`, a record whose bytes do not match the hash, a record that is not a suite receipt, and `--command` together with `--suite`.

#### Scenario: Documented command runs instead of the detected suite

- **WHEN** `verify` receives `--command` in a repository whose marker list would select a different command
- **THEN** the documented command runs and the receipt reports it with `command_source: documented`

#### Scenario: Marker added after preflight starts no test

- **WHEN** the suite record captured in preflight holds no command and a marker file appears before verification
- **THEN** `verify --suite` with that record returns `unavailable` with `unavailable_reason: no-suite` and runs nothing

#### Scenario: Marker changed after preflight keeps the fixed command

- **WHEN** the suite record captured in preflight holds one command and a later marker file would select another
- **THEN** `verify --suite` with that record runs the captured command with `command_source: list`

#### Scenario: Changed suite record is refused

- **WHEN** `verify --suite` is called without `--suite-hash` or with a hash that does not match the record
- **THEN** the call exits 2 and runs no test

#### Scenario: Two command sources are refused

- **WHEN** `verify` receives both `--command` and `--suite`
- **THEN** the call exits 2 and runs no test

### Requirement: .NET marker detection

The merge tool's marker list SHALL recognize .NET projects: every `*.sln` file at the project root or one level below it, outside dot-directories, and, only when no such solution exists, every `*.csproj` file at the project root. Exactly one candidate SHALL resolve to `dotnet test <candidate>`. The previously listed markers SHALL keep precedence over the .NET markers. Several candidates SHALL yield no command, SHALL be reported as ambiguous with the candidate list, and SHALL make verification `unavailable` with `unavailable_reason: ambiguous-suite`.

#### Scenario: Single solution resolves to dotnet test

- **WHEN** the only marker is one `*.sln` file at the root or one level below it
- **THEN** the detected command is `dotnet test` with that solution's path

#### Scenario: Root project resolves when no solution exists

- **WHEN** no solution marker exists and exactly one `*.csproj` file is at the root
- **THEN** the detected command is `dotnet test` with that project file

#### Scenario: Solution two levels below is not a marker

- **WHEN** the only `*.sln` file is two directory levels below the root
- **THEN** it is not treated as a marker

#### Scenario: Several candidates are unavailable

- **WHEN** several solution candidates exist, or no solution exists and several root `*.csproj` files exist
- **THEN** no command is selected and verification returns `unavailable` with `unavailable_reason: ambiguous-suite` and the candidates in `detail`

#### Scenario: Existing markers keep precedence

- **WHEN** a previously listed marker such as `Cargo.toml` exists beside .NET markers
- **THEN** the previously listed marker's command is selected

### Requirement: Not-runnable test command outcome

When the fixed test command fails to start, the merge tool SHALL return `verification_result: unavailable` with `unavailable_reason: not-runnable` and the reason in `detail`, as a non-applicable outcome rather than a failed test run. A not-runnable result SHALL NOT use a verification round and SHALL NOT start a test correction, and the run SHALL continue. A command that started and exited non-zero SHALL remain `failed`. Every `unavailable` result SHALL carry `unavailable_reason` as one of `no-suite`, `ambiguous-suite`, or `not-runnable`. The coordinator SHALL print the not-runnable notice with the command and the reason, stating that no test ran and that it is neither a gate nor a test failure, and the final summary SHALL report the verification status as `unavailable (command not runnable: <reason>)`.

#### Scenario: Unknown command is not runnable

- **WHEN** the fixed test command names a tool that is not installed or a command that is unknown
- **THEN** `verify` exits 0 with `verification_result: unavailable`, `unavailable_reason: not-runnable`, and a non-empty `detail`

#### Scenario: Started command that fails stays a test failure

- **WHEN** the fixed test command starts and exits with a non-zero code
- **THEN** the result is `failed` and the round counts against the three-round budget

#### Scenario: Not-runnable result uses no round

- **WHEN** verification returns `unavailable` with `unavailable_reason: not-runnable`
- **THEN** the coordinator prints the not-runnable notice, records `verification_result: unavailable`, starts no test correction, and continues without a question

### Requirement: Merge runs unattended from its arguments

`/sai-merge` SHALL run as one goal-driven coordinator, `sai/commands/merge/coordinator.md`, whose invocation is `/sai-merge [<branch>] [--rebase|--squash]`. It SHALL ask only at the start (the branch when no branch argument is given, the method when no method option is given, and autostash when a rebase or squash needs it) and on escalation, and SHALL run unattended otherwise. Without a method option the method SHALL be asked at the start, with a merge when no native picker is available; `--rebase` SHALL replay the current branch onto the named branch, and `--squash` SHALL first turn the current branch's own commits since the merge base into one local commit and then rebase it; `--squash` SHALL win when both options are given. `--fast-track` SHALL be accepted and ignored with no banner. A second branch or any other option SHALL end the run with `Cannot start /sai-merge: {the cause}. Usage: /sai-merge [<branch>] [--rebase|--squash]` before anything is written. The run SHALL ask no working-language or strategy question, its only start questions SHALL be the branch, method, and autostash questions, and its closing report SHALL use the language of the chat. The coordinator's Goal, `docs/commands/sai-merge.md`, the `/sai-merge` row of `docs/on-demand-commands.md`, the Claude Code and opencode `sai-merge.md` wrapper descriptions, and the merge section of `AGENTS.md` SHALL state this same rule and SHALL NOT describe the command as running with no human in the loop.

#### Scenario: Both method options select the squash

- **WHEN** `/sai-merge feature --rebase --squash` is invoked
- **THEN** the run squashes the current branch's own commits into one local commit and rebases it onto `feature`

#### Scenario: Fast-track is ignored

- **WHEN** `/sai-merge feature --fast-track` is invoked
- **THEN** the run behaves exactly as without the token and prints no fast-track banner

#### Scenario: Unknown option ends the run before any write

- **WHEN** the arguments carry an option other than `--rebase`, `--squash`, or `--fast-track`
- **THEN** the run prints the usage line with the cause and writes nothing

#### Scenario: Every description states when the command asks

- **WHEN** the coordinator's Goal, the command documentation, the on-demand command table, either harness's wrapper description, or the merge section of `AGENTS.md` is read
- **THEN** it says the command asks only at the start (branch, method, autostash) and on escalation, and none of them claims no human in the loop

### Requirement: Merge start guards

Before the launch, the coordinator SHALL run `merge.js preflight` and SHALL resume an in-progress merge or rebase only when the invocation names the same branch and the run store holds a `running` or `escalated` `merge-run@1` run under `merge-{branch}`; any other in-progress operation SHALL be left untouched and the run SHALL end with the reason and, when a recorded run owns it, that run's branch. Without a branch argument, the coordinator SHALL ask which branch to integrate through the native picker with the newest preflight candidates up to the picker capacity, each picked candidate naming its full `ref`, and the picker's free text, or in plain text when there are none, mapping an `origin/<rest>` answer to `refs/remotes/origin/<rest>` and any other name to `refs/heads/<name>` and fetching nothing. Staged content before the launch SHALL end the run naming those paths. Unstaged changes SHALL NOT stop a merge, and for a rebase or squash the refusal on tracked unstaged changes SHALL apply only when the autostash question was declined or no native picker exists, before the first mutation. A provenance failure, such as a branch that does not exist, SHALL end the run with the cause and nothing launched, and a branch whose head is already an ancestor of `HEAD` SHALL close the run with no changes.

#### Scenario: Foreign operation is never touched

- **WHEN** a merge or rebase is in progress that no recorded `/sai-merge` run of the named branch owns
- **THEN** the run explains why it stops, names the branch of the recorded run when one owns it, and changes nothing

#### Scenario: Staged content stops the run

- **WHEN** the preflight reports a staged path before the launch
- **THEN** the run ends naming the staged paths and launches nothing

#### Scenario: Already integrated branch closes with no changes

- **WHEN** the named branch's head is already an ancestor of `HEAD`
- **THEN** the run closes with no changes and says so

### Requirement: Suite baseline before the launch

The coordinator SHALL fix the test command once before anything runs and SHALL take the baseline with `merge.js verify --baseline --record <run directory>/baseline.json` at `HEAD` before the launch, using that fixed command. The baseline mode SHALL run the suite once and store its result with the failing tests named when the output allows it. With no detectable suite or several ambiguous ones, the baseline and the later verification SHALL be marked unavailable, the run SHALL continue, and the closing report SHALL say so.

#### Scenario: Baseline is taken once before the launch

- **WHEN** a run with a fixed test command reaches its launch
- **THEN** the suite has run exactly once at the pre-launch `HEAD` and its record is kept in the run directory

#### Scenario: No suite leaves verification unavailable

- **WHEN** no test command can be fixed
- **THEN** the run continues and the closing report states that the baseline and verification were unavailable and why

### Requirement: Final-tree verification against the baseline

The suite SHALL run once on the final tree, after the resolution is staged for a merge and after the last stop for a rebase, never per stop, through `merge.js verify --baseline-record <file> --baseline-hash <sha256>`. The tool SHALL refuse a baseline record whose bytes do not match the hash or that is not a baseline. A failing test that is not in the baseline SHALL be rerun once with the whole suite and SHALL count as a new failure only when it fails on both runs; the comparison status SHALL be `clean`, `preexisting`, `flaky`, `not-comparable`, `new`, or `unavailable`, and `verification_result` SHALL be `failed` only for a new failure. When the suite names no individual test and the baseline already failed, the result SHALL be not comparable. Failing tests SHALL be named from the output formats of common runners, and a runner's summary header ending with a colon SHALL NOT count as a test name. Only a new failure SHALL block: it SHALL be the obstacle `new-failure`, corrected through the worker's test-correction and apply steps; on a merge the correction SHALL join the merge commit, and on a rebase it SHALL be one additional local commit on top of the rebased branch.

#### Scenario: Failure that passes on the rerun is flaky

- **WHEN** a test that passed in the baseline fails after the integration and passes on the rerun
- **THEN** it is reported as flaky and does not block finalization

#### Scenario: Pre-existing failure does not block

- **WHEN** a test that already failed in the baseline fails on the final tree
- **THEN** it is reported as pre-existing, is not rerun for confirmation, and does not block

#### Scenario: Confirmed new failure blocks

- **WHEN** a test that passed in the baseline fails on two consecutive runs after the integration
- **THEN** `comparison.status` is `new`, `verification_result` is `failed`, and the coordinator works the `new-failure` obstacle before finalizing

#### Scenario: Summary header is not a test

- **WHEN** a `node --test` run prints a `failing tests:` summary header followed by the failing test names
- **THEN** the named failing tests are the real tests only and the header is not counted

### Requirement: Conflict stop cycle

Each conflict stop SHALL be closed only when its conflicts are resolved by commit intent, checked, reviewed, and staged. The coordinator SHALL capture the stop with `merge.js conflicts --record` before any worker write, have the worker report a strategy covering every affected file, write the accepted decisions to a confirmed-decisions file, have the worker apply them, and check the apply report with `merge.js resolution --phase authored`, returning a rejection to the worker as a corrected instruction. For each whole-side file the coordinator SHALL run `git checkout --ours` or `--theirs` and check with `--phase materialized`. It SHALL review the resolution as a separate session for at most three fix rounds under `incremental-review.md`, using `review-delta.js` snapshots and reading both sides from `merge.js bundle`, against fidelity to both sides' intent, changes outside the conflict regions, and leftover markers. Findings still open after round three SHALL be written to `findings.md`, listed in the closing report, and SHALL NOT stop the run. The stop SHALL then be staged with `git add` of the resolved paths and SHALL NOT run `git diff --cached --check`, because `write` and `resolution` already reject conflict markers and whitespace that either side carried passes unchanged. A rebase SHALL continue with `GIT_EDITOR=true git rebase --continue`, starting a new stop with the same worker when another conflict appears. A clean launch SHALL create no worker and SHALL go straight to verification and the collision check.

#### Scenario: Clean launch needs no worker

- **WHEN** the launch leaves no unmerged path
- **THEN** no worker is created and the run proceeds to final-tree verification and the ADR/DDR collision check

#### Scenario: Findings open after round three are pending

- **WHEN** review findings on a stop's resolution remain open after the third fix round
- **THEN** they are recorded as pending in `findings.md`, appear in the closing report, and the run continues

#### Scenario: Later rebase stop reuses the worker

- **WHEN** `git rebase --continue` stops at another conflicted commit
- **THEN** the coordinator starts a new stop with the same worker and its own obstacle budgets

#### Scenario: Inherited whitespace does not block staging

- **WHEN** a rebase stop's resolved file keeps trailing whitespace that the replayed commit already carried
- **THEN** the coordinator stages the resolved paths with `git add` and continues the rebase without a whitespace check

### Requirement: Escalation when commit intent cannot decide

When the worker's strategy report lists an escalation because commit intent cannot decide between two sides, the coordinator SHALL decide nothing by itself and SHALL escalate at once, without spending an attempt, through the native picker with options it writes: at least resolving for the current branch's behavior, resolving for the selected branch's behavior, leaving the operation in progress without finalizing, and aborting it with `git merge --abort` or `git rebase --abort`. The run SHALL abort only when the user chose that option. A chosen resolution SHALL be sent back to the worker's strategy step as the decision for those conflicts. A whole-side-only conflict that commit intent cannot decide SHALL follow the same escalation.

#### Scenario: Abort happens only on explicit choice

- **WHEN** an escalation is answered with the option that leaves the operation in progress
- **THEN** the merge or rebase stays in progress, nothing is aborted, and the run closes with its report

### Requirement: Merge obstacles and escalation

An obstacle SHALL be anything that prevents closing a stop or the run, including a rejected or unreviewable resolution, a new failure, an unreadable report, a silent or drifting worker, a git refusal, or a tool error. Each named obstacle SHALL have a budget of three attempts, each a different approach, and the coordinator SHALL emit `attempt` before each one and escalate at once when the budget is exhausted. Escalation SHALL state what happened, what is done, and what was tried, and SHALL ask through the native picker with options the coordinator writes, including one that accepts the new failure and finalizes when the obstacle is `new-failure`, one that leaves everything as it is, and, while a merge or rebase is in progress, one that aborts it. A dismissed question SHALL close the run `escalated` with the operation left in progress.

#### Scenario: Exhausted budget escalates

- **WHEN** the third attempt on an obstacle fails
- **THEN** the coordinator escalates through the native picker instead of making a fourth attempt

### Requirement: Command-local authority of a merge run

Invoking `/sai-merge` SHALL authorize exactly these local operations: the launch (including the squash and, when the user accepted it, `git rebase --autostash`), `git checkout --ours` or `--theirs` for a whole-side choice, staging, the ADR/DDR repair edits and `git mv`, the merge commit, the squash commit, each `git rebase --continue`, the correction commit of the final tree, and the repair commit. The run SHALL never push, amend, force, bypass a hook, drop or pop a stash, change `git config`, or abort an operation unless the user chose it, SHALL leave unrelated working-tree changes as they are, and SHALL stop if unrelated staged content would enter a commit. Each commit message SHALL be sent with `git commit -F <file>`, the file in the run directory. A finished rebase with nothing staged SHALL create no extra commit.

#### Scenario: Nothing is pushed

- **WHEN** a run finalizes a merge or rebase
- **THEN** every commit and `rebase --continue` stays local and no push is run

### Requirement: Merge closing report

The run SHALL close when the integration is finalized, when the branch was already integrated, when the user chose to leave the operation in progress or abort it, or when an escalation was dismissed. The closing report, in the chat language, SHALL state the method, target and source branches, the operation with the resulting `HEAD` and the subject of each commit the run made, the conflicts resolved per stop with how each file was decided, the verification against the baseline naming every `new`, `flaky`, `preexisting`, and `not-comparable` test or that it was unavailable and why, the pending findings, the collision repairs and reported escalations, the assumptions, and the escalations with their answers. For every run that changed the branch, it SHALL name the `HEAD` recorded before the launch and the command `git reset --hard <sha>` that restores it, and when the provenance's `upstream.force_push_needed` is true it SHALL say that the next push needs a force push. When autostash could not reapply the changes, it SHALL name the stash entry that stays and the command `git stash pop` that restores it. A run that did not complete SHALL add the blocker, the options offered, and the answer. A run that finalized the integration SHALL end with exactly `Merge done.`, and every other run SHALL end with its report and no closing line.

#### Scenario: Restore command for a changed branch

- **WHEN** a run created a merge commit on the current branch
- **THEN** the closing report names the pre-launch `HEAD` and `git reset --hard <that sha>`

#### Scenario: Force-push notice after rewriting published commits

- **WHEN** a rebase rewrote commits the current branch's upstream already holds
- **THEN** the closing report says that the next push needs a force push

#### Scenario: Kept stash is named with its restore command

- **WHEN** the stash reference after the rebase differs from the one recorded before the launch
- **THEN** the closing report names the stash entry that stays and `git stash pop`

### Requirement: Merge coordinator loads only its own contracts

Both `/sai-merge` wrappers SHALL load the harness fetch skill and `sai/commands/merge/coordinator.md` directly, with no boot adapter and no command bootstrap. The coordinator SHALL load only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, `obstacle-escalation`, and `incremental-review`, SHALL load no budget binding, and SHALL load none of `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, or `no-commit-guard`. The only subagent of a run SHALL be the merge worker; lookups that shared policies delegate to a `budget-explorer` SHALL be done by the coordinator itself.

#### Scenario: Wrapper reaches the coordinator directly

- **WHEN** either harness's `sai-merge.md` wrapper is read
- **THEN** it fetches the harness fetch skill and `sai/commands/merge/coordinator.md` and names no boot adapter or `command-bootstrap.md`

### Requirement: Provenance records upstream rewrite facts

The merge tool's `provenance` action SHALL also record the current branch's upstream facts: the upstream ref or none, the number of commits a rebase or squash rewrites, how many of them the upstream already holds, and `force_push_needed`, true only when that shared count is positive. A merge SHALL rewrite no commits, and a branch without an upstream SHALL need no force push.

#### Scenario: Rebase of published commits needs a force push

- **WHEN** provenance is captured for a rebase whose rewritten commits include commits the upstream already holds
- **THEN** `upstream.shared_with_upstream` is positive and `upstream.force_push_needed` is true

#### Scenario: No upstream needs no force push

- **WHEN** the current branch has no upstream
- **THEN** `upstream.ref` is null and `upstream.force_push_needed` is false

### Requirement: Merge tool has no stage entry points

`sai/tools/merge.js` SHALL offer only its fact and write actions (`preflight`, `provenance`, `conflicts`, `correction`, `bundle`, `write`, `valid`, `resolution`, `suite`, `verify`, `collision`, and `status`) and SHALL NOT offer `enter --stage`, `instructions --stage`, or `--reconstruct`. Worker instructions SHALL travel by pointer to the step files under `sai/commands/merge/steps/`, and replacement state SHALL travel by hand-over file.

#### Scenario: Retired entry point is unknown

- **WHEN** the merge tool's usage text is printed
- **THEN** it lists neither `enter` nor `instructions`

### Requirement: Harness-parity goal-driven merge

Claude Code and opencode SHALL run `/sai-merge` from the same coordinator, worker contract, step files, and `merge.js` engine, with the same arguments, authority, escalation options, and closing report; only the native picker, the standalone worker binding, and the continuation mechanics of each harness SHALL differ.

#### Scenario: Both harnesses render the same standalone binding

- **WHEN** the worker matrix materializes the merge worker binding for Claude Code and opencode
- **THEN** both render from their harness's standalone worker template and fetch the same `sai/commands/merge/worker.md`

### Requirement: Start questions precede the baseline

When the invocation leaves the branch or the method open, the coordinator SHALL ask what is open in one native picker call before it fixes the test command and takes the baseline: the branch when no branch argument is given, and the method (merge, rebase, or squash) when neither `--rebase` nor `--squash` is given. When the native picker is unavailable, the method SHALL be a merge and the run SHALL go on. Cancelling either question SHALL end the run with nothing launched and nothing written. A run that resumes an interrupted integration SHALL take the method from the `merge-run@1` store and SHALL ask nothing.

#### Scenario: Method is asked with the branch before the baseline

- **WHEN** `/sai-merge` is invoked with no arguments on a harness with a native picker
- **THEN** the branch and method questions are asked in one picker call before the test command is fixed and before the baseline suite run

#### Scenario: No picker falls back to a merge

- **WHEN** the arguments carry no method option and the native picker is unavailable
- **THEN** the method is a merge and the run continues without asking

#### Scenario: Cancelled question launches nothing

- **WHEN** the user cancels the method or branch question
- **THEN** the run ends before the baseline with nothing launched and nothing written

#### Scenario: Resumed run asks no method

- **WHEN** the invocation resumes an interrupted run of the same branch
- **THEN** the method comes from the store and no question is asked

### Requirement: Autostash question for a rebase or squash

For a rebase or squash only, as soon as the method is known and before the run state is opened, the provenance is captured, the test command is fixed, and the baseline is taken, when the preflight reports a tracked file with unstaged modifications and `git config rebase.autoStash` is not true, the coordinator SHALL ask through the native picker whether to launch with `--autostash`. Untracked files SHALL NOT trigger the question, and a merge SHALL keep its existing behavior. On yes, the coordinator SHALL record the stash reference before the launch in the run directory and SHALL pass `--autostash` on the `git rebase` command line; the squash commit SHALL never take unstaged changes. On no, or when no native picker exists, the run SHALL end with the cause before the first mutation, having run no suite and launched nothing. The coordinator SHALL never change `git config`. When git cannot reapply the stashed changes at the end of the rebase, the stash entry SHALL stay in place. A resumed run SHALL NOT ask the question.

#### Scenario: Tracked unstaged changes on a rebase ask for autostash

- **WHEN** the method is rebase and a tracked file carries unstaged modifications
- **THEN** the coordinator asks whether to launch with `--autostash` once the method is known, before the provenance, the baseline, and any mutation

#### Scenario: Untracked files never ask

- **WHEN** the method is rebase and the only working-tree changes are untracked files
- **THEN** no autostash question is asked

#### Scenario: Declined autostash ends the run unchanged

- **WHEN** the user declines the autostash question, or no native picker exists
- **THEN** the run ends with the cause before the first mutation, no suite has run, nothing is launched, and `git config` is unchanged

#### Scenario: Unreapplied stash stays in place

- **WHEN** autostash was used and git cannot reapply the changes at the end of the rebase
- **THEN** the stash entry stays and the run does not drop or pop it

### Requirement: Rebase in progress is detected from the operation directories

`merge.js preflight` and `merge.js status` SHALL report `rebase_in_progress: true` only when git's `rebase-merge` or `rebase-apply` operation directory exists. A leftover `REBASE_HEAD` without either directory SHALL NOT report a rebase in progress.

#### Scenario: Leftover REBASE_HEAD after a finished rebase

- **WHEN** `REBASE_HEAD` exists and neither `rebase-merge` nor `rebase-apply` exists
- **THEN** `preflight` and `status` both report `rebase_in_progress: false`

#### Scenario: Rebase stopped at a conflict

- **WHEN** a rebase is stopped and its `rebase-merge` or `rebase-apply` directory exists
- **THEN** `status` reports `rebase_in_progress: true`

### Requirement: Run directory precedes the provenance receipt

On a fresh `/sai-merge` run, the coordinator SHALL open the run state and create the run directory with `temp-root.js mkdtemp` before it runs `merge.js provenance`, so that `provenance.json` is saved into a run directory that already exists. When the user accepted autostash, the coordinator SHALL record the stash reference as `stash-base.txt` in that run directory before the launch. The provenance SHALL be captured before the test command is fixed and before the baseline is taken. A run that resumes an interrupted integration SHALL skip the Start steps and SHALL ask nothing.

#### Scenario: Fresh run saves provenance into an existing run directory

- **WHEN** a fresh `/sai-merge` run reaches the provenance capture
- **THEN** its run directory has already been created and `provenance.json` is saved inside it

#### Scenario: Resumed run skips the start

- **WHEN** the invocation resumes an interrupted run of the same branch
- **THEN** the coordinator follows Resuming, skips the rest of Start, and asks no question
