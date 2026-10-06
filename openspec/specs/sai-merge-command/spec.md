# sai-merge-command Specification

## Purpose

Defines the `/sai-merge` routed command: pre-merge environment guards, the method and recency-ordered branch selection, the coordinator-only git mutation surface with a worker limited to resolution content writes, the method-aware side mapping, contextual conflict analysis inside one confirmed global strategy, the fast-track-gated runtime resolution scope, the bounded three-round verification loop, the incremental ADR/DDR collision pass, and explicit finalization authorization.

## Requirements

### Requirement: Pre-merge environment guards

The system SHALL run pre-merge environment checks before any merge work and SHALL refuse to start when the repository is unsafe.

#### Scenario: In-progress merge blocks a new run

- **WHEN** a `/sai-merge` invocation starts while `MERGE_HEAD` exists
- **THEN** the command stops with "Merge already in progress. Resolve or abort the current merge first (`git merge --continue` or `git merge --abort`)." and performs no merge step

#### Scenario: In-progress rebase blocks a new run

- **WHEN** a `/sai-merge` invocation starts while a rebase is in progress and no `MERGE_HEAD` exists
- **THEN** the command stops with "Rebase already in progress. Resolve or abort the current rebase first (`git rebase --continue` or `git rebase --abort`)." and performs no merge step

#### Scenario: Dirty worktree requires confirmation

- **WHEN** the worktree reports modified, untracked, or staged files and no other guard fired
- **THEN** Batch 1 carries the dirty-worktree question, and a `no` answer closes the run without any mutation

### Requirement: Method and branch selection

The system SHALL offer the methods `Merge`, `Rebase`, and `Rebase with squash`, and SHALL retain listed local branches from `git branch --no-merged HEAD` ordered by full committer timestamp descending with exact branch name ascending as tie-break, each with the exact branch name as value and `<branch> — last commit <YYYY-MM-DD HH:mm>` as label, plus the routing choice `sai:enter-branch` labeled `Enter a branch name` always present including when the list is empty. An empty candidate list SHALL NOT close the run. The canonical branch question SHALL remain `Which branch do you want to operate on?`. When `sai:enter-branch` is chosen and the dirty answer is not `no`, the coordinator SHALL collect one local branch name or one `origin/<branch>` reference as open text and SHALL forward it as `branch_entry`; on that sentinel path the exact typed value SHALL select the free-text path even when it matches a listed branch. When the dirty answer is not `no` and the branch answer is picker free text, the coordinator SHALL forward the exact typed value as `branch_entry` with no second prompt, as classified by `Harness-neutral branch picker answer classification`.

#### Scenario: User picks method and branch in one trip

- **WHEN** at least one eligible branch exists and fast-track is inactive
- **THEN** the method and branch answers arrive together in Batch 1 and the selected branch is the merge source for `merge` and the new base for `rebase`

#### Scenario: Squash with nothing to squash

- **WHEN** `rebase-squash` is selected and `merge_base` equals the current `HEAD`
- **THEN** the coordinator runs the plain rebase without a squash commit

#### Scenario: Empty list still allows text entry

- **WHEN** no unmerged local branch remains
- **THEN** the branch item still offers `sai:enter-branch` and the run continues to text entry instead of closing

#### Scenario: Sentinel text wins over a matching listed branch

- **WHEN** the user chooses `sai:enter-branch` and types text that exactly matches a listed branch
- **THEN** the coordinator forwards that text as `branch_entry` with `branch_selection_source: free-text` and validates it through the free-text path

### Requirement: Every merge stops before its commit

The coordinator SHALL launch the `merge` method with `git merge --no-ff --no-commit <source_ref>` where `source_ref` is `refs/heads/<name>` for a listed candidate or an unprefixed free-text entry and `refs/remotes/origin/<name>` for an `origin/<name>` entry. Clean and conflicted merges SHALL stop before committing so the existing collision, review, verification, and staging checks applicable to the route precede automatic local finalization under command-local authorization. A fast-forward SHALL never occur.

#### Scenario: Clean merge waits for authorization

- **WHEN** a merge completes without conflicts
- **THEN** the merge remains in progress with its result staged, the collision pass runs, and the coordinator commits automatically under invocation authorization without asking a finalization question

#### Scenario: Free-text source launches via exact ref

- **WHEN** a validated free-text entry resolves to its exact `source_ref`
- **THEN** the merge launches with that ref and stops before commit for the applicable checks and automatic coordinator finalization

### Requirement: Rebase continues per stop and finishes without a spurious gate

For the `rebase` method, each conflicted stop SHALL pass through resolution, verification, and final staging before the coordinator automatically runs `GIT_EDITOR=true git rebase --continue` under command-local authorization. A new conflicted commit SHALL re-enter strategy analysis with the same worker and selected working language. After the rebase finishes, the collision pass SHALL run on the final state; a staged collision repair SHALL be committed automatically, and when nothing remains staged no additional commit SHALL be created.

#### Scenario: Clean rebase reports and closes

- **WHEN** a rebase finishes without conflicts and no collision repair is staged
- **THEN** the run reports the new `HEAD` and that `target_sha` is the pre-rebase `HEAD`, without an authorization question or additional commit

#### Scenario: Multi-commit rebase stops again

- **WHEN** `git rebase --continue` stops at another conflicted commit
- **THEN** the coordinator reports the outcome to the same worker, which returns `conflict_detected` with `continuation_state: strategy-analysis` and no language question is repeated

### Requirement: Method-aware side mapping

The worker SHALL map git stages to branches by method: for `merge`, stage 2 (`--ours`) is the current branch and stage 3 (`--theirs`) the selected branch; for `rebase`, stage 2 is the selected branch and stage 3 the current branch's replayed commit. Decision values `ours` / `theirs` and payload sources `git-ours` / `git-theirs` SHALL always denote the git stage, and alternatives SHALL be described to the human by branch and behavior.

#### Scenario: Rebase keeps the user's chosen branch

- **WHEN** during a rebase the confirmed strategy keeps the current branch's version of a file
- **THEN** the payload records `git-theirs` for that file and `git checkout --theirs` materializes the current branch's version

### Requirement: Coordinator-only mutation surface

The system SHALL confine state-changing Git operations to the coordinator, including branch refresh with `git fetch --prune origin`, the launch and squash, `git checkout --ours/--theirs`, collision replacements and `git mv`, staging, `git rebase --continue`, and commits. The worker SHALL run only read-only Git commands and SHALL supply only resolution content authorized by normal-mode strategy approval or the coordinator's fast-track presentation-and-application continuation, as resolved text handed to the merge tool's `write` action, which places it in the working tree; the worker SHALL NOT edit an affected file by any other means, and SHALL never run fetch or exact-ref validation for branch selection. For a command-authorized merge finalization or staged repair commit, the coordinator SHALL pass the complete informative message literally on standard input to `git commit -F -` under `sai/policies/command-execution.md`, using Bash or PowerShell 7 without `git commit -m`, a Bash-only heredoc, or the `/sai-commit` `commit.js` path.

#### Scenario: Worker never executes git mutations

- **WHEN** the worker analyzes conflicts, proposes resolutions, scans collisions, or verifies the suite
- **THEN** it performs read-only inspection, hands authorized content for conflicted regions within scope to the merge tool's `write` action, returns payloads, and leaves all Git state changes to the coordinator

#### Scenario: Coordinator reviews materialized content before staging

- **WHEN** the merge tool has placed the worker's resolution content in the working tree
- **THEN** the coordinator reviews it against the confirmed strategy and either stages it or returns the named divergence to the worker, for at most three rounds

#### Scenario: Worker never validates branch entries

- **WHEN** a free-text branch entry requires refresh and exact-ref checks
- **THEN** the coordinator runs the fetch and exact-ref checks while the worker performs no Git mutation

#### Scenario: Authorized merge commit uses literal standard-input delivery

- **WHEN** command-local authorization permits a merge finalization or staged repair commit after the applicable checks
- **THEN** the coordinator sends the informative message unchanged to `git commit -F -` through the active supported shell

### Requirement: Categorized conflict analysis with declared rules

The system SHALL classify each conflicted file as specs, ADR/DDR, or code upon conflict detection. The analysis SHALL read, at the captured SHAs, the governing specs, ADRs, and DDRs forwarded as `target_rules` and `source_rules`, treat declared rules as normative Facts that outrank inferred objectives, label Inferences explicitly, and mark a region with no governing rule as `[No declared rule found for this region]`. A region is obvious when a declared rule or a simple textual pattern settles it, and semantic otherwise; contradicting rules, a conflicted arbiter, a rule rejecting both sides, and a spec contradiction SHALL always be semantic.

#### Scenario: Declared rule governs the resolution

- **WHEN** a governing rule explicitly constrains a conflict region
- **THEN** the worker reports it as a Fact with its source and applies it ahead of inferred objectives

#### Scenario: Missing declared rule generates a notice

- **WHEN** a conflict region has no governing rule
- **THEN** the Conflict Analysis carries `[No declared rule found for this region]` and the resolution rests on textual context

#### Scenario: True contradiction is never auto-selected

- **WHEN** both sides change the same requirement or scenario incompatibly
- **THEN** the conflict is presented as a semantic decision inside the strategy, and when no safe combination exists it is escalated rather than resolved

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

### Requirement: Global strategy gates resolution

The worker SHALL produce one prose strategy over the whole affected conflict set, stating per file what is kept, adopted, combined, or escalated, with Facts, Inferences, objectives, contracts, trade-offs, risks, and the alternatives considered. Per-conflict decisions SHALL live inside that strategy; no per-conflict picker SHALL exist. In normal mode, the coordinator SHALL require `apply-strategy` before any resolution write, marker removal, or staging; `revise-strategy` SHALL return an open empty-options request whose free-form answer continues the same worker, and `decline-strategy` SHALL close without a resolution write at that stop while reporting the exact repository state. In fast-track, the worker SHALL return the complete strategy as `completed` before writing any resolution; the coordinator SHALL validate and present it, then continue the same worker to apply the presented strategy without a picker or recorded user answer. Every later strategy SHALL follow the same mode-specific hand-off. A strategy without a valid resolution SHALL stop or escalate rather than be applied.

#### Scenario: Strategy is confirmed before mutation

- **WHEN** the user selects `apply-strategy` in normal mode
- **THEN** the worker writes the confirmed resolution and returns the complete payload, and nothing was written before that answer

#### Scenario: Strategy is revised without mutation

- **WHEN** the user selects `revise-strategy` in normal mode
- **THEN** the same worker requests open context with empty `options`, rebuilds the strategy from the answer, and the repository remains unchanged during that revision

#### Scenario: Fast-track presents before applying

- **WHEN** a complete valid strategy is returned while fast-track is active
- **THEN** the coordinator validates and prints it before continuing the same worker to apply it, without invoking a picker or fabricating an answer

#### Scenario: Later conflicts retain mode-specific strategy handling

- **WHEN** application, verification, or a later rebase stop requires a new strategy
- **THEN** the same worker and language are retained and the strategy is presented before normal-mode approval or fast-track automatic application

### Requirement: Complete resolution payload validation

Before staging, the coordinator SHALL atomically validate the original received worker result and its `complete resolution payload`: exactly one record per affected conflicted file with the worker's path and category; `source` of `git-ours` / `git-theirs` with empty `regions` or `authored` with complete captured region entries; decisions matching those stated by the confirmed strategy; and no conflict marker, diff, hunk, or complete file in region text. Obvious authored regions SHALL NOT require an invented semantic decision. The coordinator SHALL pass the original source bytes to validation rather than constructing a shortened substitute. Mechanical resolution checks SHALL validate the retained snapshot hash, immutable HEAD/index/operation identity, complete inventories, confirmed decisions, protected content, and unrelated content before checkout and before staging. Authored files SHALL equal the captured working file with only declared replacements, each replacement stored with the line endings and byte-order mark of the captured pre-write file as the merge tool's `write` action places it; Git-sourced files SHALL remain untouched by the worker and SHALL equal the captured stage after coordinator checkout. Independent semantic review SHALL also pass before staging. Any failure SHALL reject the whole payload, leaving every conflict untouched by coordinator checkout and unstaged.

#### Scenario: Fragmentary payload is rejected atomically

- **WHEN** a payload holds a diff, hunk, complete file, invalid source, missing region, marker, missing file, unexpected path, or a decision the strategy did not state
- **THEN** the coordinator rejects the entire payload and stages no path

#### Scenario: Git-sourced files are materialized by checkout

- **WHEN** every record passes validation
- **THEN** the coordinator materializes `git-ours` / `git-theirs` files with `git checkout --ours` / `--theirs`, leaves the `authored` files as the merge tool wrote them, and never reconstructs content from prose

#### Scenario: Original envelope is required

- **WHEN** resolution checking receives a reduced payload instead of the original worker result or the original result lacks a required field
- **THEN** checking fails rather than validating a fabricated replacement envelope

#### Scenario: Protected content differs

- **WHEN** an authored result changes content outside captured replacement ranges or changes unrelated content
- **THEN** mechanical checking rejects the result and no path is staged

#### Scenario: Repository identity changes before review

- **WHEN** HEAD, index entries, or operation identity no longer match the retained resolution snapshot
- **THEN** the check reports stale evidence rather than accepting the resolution against a different state

#### Scenario: Mechanical success does not replace semantic review

- **WHEN** resolution checking succeeds
- **THEN** the coordinator independently reviews the materialized tree against the confirmed strategy and stages only when both checks pass

### Requirement: Runtime resolution scope gate

Resolution scope SHALL always include every affected conflicted file in every mode. The worker and coordinator SHALL NOT offer partial-scope choices, derive eligible scope options, ask a scope-selection question, or defer files because of a selected scope.

#### Scenario: Absent conflict categories are omitted

- **WHEN** a conflicted integration contains only code conflicts
- **THEN** every affected code file is included in resolution without a scope question or artifacts-only choice

#### Scenario: Mixed categories use full scope

- **WHEN** the affected conflict set includes specs, ADR/DDR records, and code
- **THEN** the strategy and complete resolution payload cover every affected file without partial-scope options or deferred-scope entries

### Requirement: Bounded verification loop

The coordinator SHALL fix the project's test command once in preflight, from the project's documentation or the merge tool's marker list, and SHALL run that fixed command through the merge tool after a conflict stop's resolution is staged, for at most three started executions per conflict stop. Every round SHALL use the command fixed in preflight. Each started execution, including one that reaches the execution timeout, SHALL consume a round; increasing the timeout SHALL NOT reset the budget.

After a failed first or second round, the coordinator SHALL continue the worker for failure analysis and SHALL choose exactly one retry-or-close branch before another execution:
- An applied correction SHALL permit a repeat only after tool evidence confirms changed bytes in authorized files against the current round's pre-write snapshot, the correction passes independent review, and the corrected files are re-staged. A proposal, report, no-op write, or cumulative `changed_files` union SHALL NOT establish a current-round applied correction.
- Without an applied correction, a repeat SHALL require a concrete, evidence-backed reason recorded before execution that explains how another execution can provide useful new information. Speculation about intermittent failures SHALL NOT qualify. A started run interrupted by the execution timeout MAY justify increasing that timeout within the same budget. This reason SHALL authorize neither environment changes nor scope expansion.
- When failure analysis completes without an applied correction and without a concrete repeat reason, the coordinator SHALL record `verification_result: failed-no-correction` and close verification immediately. Proposed but unapplied corrections SHALL follow this branch. The coordinator SHALL retain the consumed rounds and every remaining failure, SHALL NOT describe unused rounds as exhausted, and SHALL continue integration through the same navigation as `cap-exhausted` with failed status rather than a pass.

A failed third round SHALL record `cap-exhausted`. Re-entry to the same conflict stop, including after a new-problem strategy correction, SHALL retain consumed rounds. Each new rebase conflict stop SHALL receive fresh verification and its own three-round budget; earlier unresolved failures SHALL remain available for the final summary. Retry decisions and `failed-no-correction` SHALL remain coordinator state rather than stateless-tool retry management or worker response fields.

A missing suite, an ambiguous suite, or a test command that cannot start SHALL be recorded as `unavailable` with a notice and SHALL NOT be a pass or a question. A command that cannot start SHALL consume no round. A clean integration SHALL skip verification.

#### Scenario: Suite failure exhausts the budget

- **WHEN** the fixed test command still fails after the third round
- **THEN** the coordinator records `cap-exhausted`, reports the remaining failures in the final summary, and continues on the existing post-verification path to invocation-authorized automatic local finalization without an additional approval, while the resolved state stays staged and uncommitted until finalization and without claiming verification passed

#### Scenario: Unavailable verification continues the run

- **WHEN** verification returns `unavailable` because no suite was detected, the suite is ambiguous, or the command cannot start
- **THEN** the coordinator prints the matching notice, reports that resolution has already been applied and staged, records `verification_result: unavailable`, and continues automatically to the merge collision pass or stopped-rebase finalization without a question or simulated answer and without claiming a pass

#### Scenario: No correction or repeat reason closes verification early

- **WHEN** failure analysis after a failed first or second round completes without an applied correction and without a concrete repeat reason
- **THEN** the coordinator records `failed-no-correction`, stops verification without consuming another round, retains the actual round count and failures, and continues through the exhausted-budget navigation with failed status

#### Scenario: Proposed but unapplied correction does not justify a retry

- **WHEN** failure analysis proposes a correction but no correction is applied and no concrete repeat reason exists
- **THEN** verification closes as `failed-no-correction` rather than repeating the suite or reporting budget exhaustion

#### Scenario: Current-round correction permits a bounded repeat

- **WHEN** tool evidence confirms changed bytes in authorized files against this round's pre-write snapshot and the corresponding independent review passes
- **THEN** the coordinator re-stages the corrected files and repeats the fixed verification command only within the remaining three-round budget

#### Scenario: Reports and earlier changes do not prove a correction

- **WHEN** the offered correction evidence consists only of a proposal, report, no-op write, or cumulative changed-file list
- **THEN** the coordinator does not count it as an applied correction for the current round

#### Scenario: Concrete evidence permits a repeat without correction

- **WHEN** no correction was applied but the coordinator records evidence before execution that another run can provide useful new information
- **THEN** another execution may use the remaining budget with the same fixed command without authorizing environment changes or scope expansion

#### Scenario: Timeout consumes an attempt

- **WHEN** a started verification execution reaches the execution timeout and a longer timeout justifies another run
- **THEN** the timed-out execution remains counted and any repeat consumes another round within the same maximum of three

#### Scenario: Same-stop re-entry retains attempts

- **WHEN** verification re-enters the same conflict stop after a new-problem strategy correction
- **THEN** the coordinator retains that stop's consumed rounds rather than resetting its verification budget

#### Scenario: New rebase stop receives fresh verification

- **WHEN** rebase continuation reaches a new conflict stop
- **THEN** that stop receives fresh verification with its own three-round budget while earlier unresolved failures remain reportable

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

### Requirement: Explicit finalization authorization

Invoking `/sai-merge` SHALL supply command-local authorization for exactly the local merge commit, `git rebase --continue` at each resolved stop, and a collision-repair commit after a finished rebase. This authorization SHALL expire when the invocation closes, SHALL NOT create a session grant or affect another command, and SHALL NOT authorize push, amend, force, hook bypass, destructive operations, or unrelated changes. After the applicable review, verification, collision, and staging checks, the coordinator SHALL present a compact summary of method, target and source branch, verification status, conflict result, collision result with applicability, and staged-file count without the staged-file list, then execute the corresponding operation directly without a finalization question or fabricated answer. Other safety confirmations SHALL remain required. Finalization SHALL include only integration-owned staged content; unrelated working-tree changes SHALL be retained, and unrelated staged content that would enter a commit SHALL stop finalization. Git failure SHALL preserve and report the exact state without claiming success.

#### Scenario: Authorization declined

- **WHEN** the run reaches local finalization after the applicable checks
- **THEN** no finalization approval or refusal choice is presented; the coordinator executes the invocation-authorized operation or reports the blocking state without claiming completion

#### Scenario: Completion literal follows finalization

- **WHEN** the run ends with the merge commit executed, or with the rebase finished and any repair committed
- **THEN** the terminal prints the coordinator-written final summary followed by `Merge done.`; every other closure omits it

#### Scenario: Unrelated staged content blocks finalization

- **WHEN** a finalization commit would include unrelated staged content
- **THEN** the coordinator stops without committing that content and reports the exact repository state

#### Scenario: Git finalization failure remains visible

- **WHEN** the local finalization operation fails
- **THEN** the coordinator reports the error and exact repository state without bypassing Git checks or claiming successful finalization

### Requirement: Conflict-triggered language hand-off

Clean integrations SHALL never ask for a working language or strategy. On the first conflict stop the coordinator SHALL detect the conflict itself from the conflict snapshot, print one concise notice with the affected paths and no semantic analysis, and ask the working language in Batch 2 before any worker analysis. The language question SHALL run once per run. No scope item, eligible-scope set, or scope-selection answer SHALL be produced, and the strategy SHALL cover every affected conflicted file. The worker SHALL return `event: conflict_detected` only with `continuation_state: strategy-analysis`, `changed_files: []`, and the current `affected_files` inventory, when a write or a test correction exposes a new problem, and later conflicts SHALL reuse the selected language and the same worker.

#### Scenario: Clean integration needs no language

- **WHEN** an integration completes without conflicts
- **THEN** the run proceeds to the collision check without a language question or strategy

#### Scenario: New problem re-enters strategy analysis

- **WHEN** resolution application or verification exposes a new conflict or inconsistent contract
- **THEN** the same worker rebuilds the strategy in the selected language and follows normal-mode approval or fast-track presentation-and-application before the next write

### Requirement: Fast-track changes only method and scope

Merge fast-track SHALL pin the method to `merge` and automatically apply each complete valid strategy only after coordinator validation and presentation. Normal mode SHALL retain apply/revise/decline strategy approval. Full resolution scope, unavailable-suite continuation, and command-local finalization SHALL apply identically in both modes rather than being fast-track opt-outs. Conflict-triggered language selection, complete payload validation, review and verification budgets, collision handling, remaining questions, and safety checks SHALL remain in force.

#### Scenario: Fast-track conflict retains strategy safety

- **WHEN** `--fast-track` is active for a conflicted merge
- **THEN** Batch 1 has no method item, Batch 2 carries only the language item, and each complete strategy is validated and presented before automatic application with no strategy-confirmation picker

### Requirement: The merge coordinator validates operation boundaries

The merge coordinator SHALL call `validate_transition(current_state, target_state, operation_context)` before each operation and SHALL halt when it returns `invalid`.

#### Scenario: Invalid coordinator transition halts safely

- **WHEN** lifecycle validation reports an invalid transition
- **THEN** the coordinator reports the violation and performs no operation, worker dispatch, mutation, or presentation update

### Requirement: Harness-parity merge contract

Claude Code and opencode SHALL use the same neutral worker and coordinator contracts. Given the same worker payloads, mode, and operation outcomes, both SHALL preserve the same remaining question texts, option values and order, mode-specific strategy and revision semantics, mutation ownership, payload validation, verification reporting, automatic local finalization, exact failure-state reporting, and completion literal; only the native question and task-list mechanisms differ.

#### Scenario: Both harnesses preserve merge decisions

- **WHEN** the same conflicted integration is handled through Claude Code or opencode in the same mode
- **THEN** both present the same strategy, require the same normal-mode approval or fast-track presentation hand-off before resolution, preserve validation and staging checks, and finalize under the same command-local authorization

### Requirement: Merge guard windows keep coordinator mutations outside every window

The merge coordinator SHALL run the guard's `snapshot` step at each window opening and its `verify` step immediately before each boundary the no-commit-guard policy lists (human turn, coordinator git mutation, run close), holding the returned SHA as invocation-scoped `guard_base`, and SHALL act on a progress event or notice with no guard call. The coordinator's own git mutations — the launch, squash commit, `git rebase --continue`, `git checkout --ours/--theirs`, `git mv`, staging, and authorized commits — SHALL run between windows and never inside one. No merge window carries `allow_commit`.

#### Scenario: The authorized merge commit runs between windows

- **WHEN** the coordinator stages and commits the merge
- **THEN** those mutations run after the verify that closed the preceding window and before the next window's fresh snapshot

### Requirement: Free-text branch entry validation

The coordinator SHALL validate a free-text `branch_entry` by running `git fetch --prune origin` before any ref check, deriving exactly one ref without trimming or normalization where a value beginning with the exact prefix `origin/` maps to `refs/remotes/origin/<remainder>` and every other value maps to `refs/heads/<value>`, then running `git check-ref-format`, `git show-ref --verify --quiet`, and `git rev-parse --verify` with the full ref as one literal argument. The coordinator SHALL NOT fetch for a listed candidate, SHALL NOT create a local branch for an `origin/<branch>` entry, SHALL NOT resolve arbitrary revisions, and SHALL stop without provenance capture or integration when the fetch fails or the exact ref does not resolve.

#### Scenario: Failed fetch stops before integration

- **WHEN** the fetch fails or the exact ref does not resolve
- **THEN** the run closes stating no integration started with no provenance captured and no local branch created

### Requirement: Harness-neutral branch picker answer classification

The merge coordinator SHALL classify the branch answer the picker returns, in this order and without naming or depending on any harness: an answer equal to the exact value or the exact label of a listed candidate or of the `sai:enter-branch` option SHALL be that option's selection and SHALL be mapped to its value before classification; an exact listed candidate value SHALL set `branch_selection_source: listed` and SHALL trigger no fetch, including picker free text that exactly matches a listed value; the sentinel `sai:enter-branch` SHALL lead to the branch-entry open prompt; any other non-empty answer SHALL be picker free text that becomes `branch_entry` exactly as typed, with `branch_selection_source: free-text`, no second prompt, and only its existing Batch 1 history pair recorded, never an added `branch-entry` pair; and an empty or whitespace-only answer SHALL NOT be a branch and SHALL repeat the branch question with no fetch. A `no` dirty answer SHALL be applied before this classification, ignoring any branch text. Picker free text SHALL then follow the existing `Free-text branch entry validation` unchanged. The coordinator branch-classification block and the presentation Branch entry gate SHALL name no harness.

#### Scenario: Picker free text becomes the branch entry directly

- **WHEN** the dirty answer is not `no` and the user types `origin/main` into the branch picker, matching no option value or label
- **THEN** the coordinator forwards `origin/main` as `branch_entry` with `branch_selection_source: free-text`, shows no branch-entry prompt, and validates it through the free-text branch entry validation

#### Scenario: Picker free text matching a listed value counts as listed

- **WHEN** the picker free text exactly equals the value of a listed candidate
- **THEN** the coordinator sets `branch_selection_source: listed` and runs no fetch

#### Scenario: Picker returns an option label

- **WHEN** the picker answer equals the exact label of a listed candidate or of the `Enter a branch name` option
- **THEN** the coordinator treats it as that option's selection, mapped to its value before classification

#### Scenario: Empty picker answer repeats the branch question

- **WHEN** the branch answer is empty or whitespace-only
- **THEN** the coordinator repeats the branch question and runs no fetch

#### Scenario: Picker free text is accepted with no candidates

- **WHEN** no unmerged local branch remains and the user types a branch into the picker instead of choosing `Enter a branch name`
- **THEN** the coordinator accepts the typed text as `branch_entry` with no second prompt while `sai:enter-branch` stays offered

#### Scenario: Dirty refusal ignores picker free text

- **WHEN** the dirty answer is `no` and the branch answer carries typed text
- **THEN** the coordinator forwards the batch as answered and no fetch, validation, or mutation runs

#### Scenario: Branch gate names no harness

- **WHEN** the coordinator branch-classification block and the presentation Branch entry gate are read
- **THEN** neither names `Claude Code` nor `opencode`

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
- **THEN** one engine call returns dirty paths, merge and rebase guards, the current branch, and authoritative unmerged local candidates sorted by full committer timestamp descending and exact branch name ascending

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

### Requirement: Coordinator-run mechanical merge stages

The merge coordinator SHALL run the mechanical stages `preflight`, `conflicts`, `verify`, `collision`, and `final` itself through `sai/tools/merge.js`. Its own tool use SHALL be read-only except for the Git mutations it already owns. Conflict analysis, resolution content, test correction, and decision-record renumbering plans SHALL remain worker work, and the coordinator SHALL review what the worker wrote as a separate session.

#### Scenario: Clean integration completes through the tool alone

- **WHEN** a merge or rebase launches without conflicts and the collision receipt is `not-applicable` or `no-collision`
- **THEN** the run enters `collision` and then `final`, never enters `verify`, and closes with no worker dispatched

#### Scenario: Failed launch without conflicts closes the run

- **WHEN** a launch fails and the conflict snapshot holds an empty inventory
- **THEN** the coordinator surfaces the Git error and closes the run with the exact repository state instead of treating it as a conflict

### Requirement: Composite stage entry

The merge tool SHALL provide `enter --stage <stage>` for the coordinator stages `preflight`, `conflicts`, `verify`, `collision`, and `final`. One call SHALL return that stage's instructions, its fixed presentation texts, and a `## Stage facts` JSON block holding the stage's receipt. Entry to `conflicts`, `verify`, and `collision` SHALL require `--record` naming a new file outside the repository. The exit code SHALL be that of the stage's mechanical action. A stage name outside the coordinator stages SHALL be rejected as a usage error.

#### Scenario: Failed test run still returns the stage text

- **WHEN** the coordinator enters `verify` and the detected suite fails
- **THEN** the call exits 1 and still returns the complete stage text with the verification receipt

#### Scenario: Recorded stage without a record file is refused

- **WHEN** `enter --stage conflicts` is called without `--record`
- **THEN** the tool reports a usage error and collects nothing

#### Scenario: Later entry runs the bare action

- **WHEN** the coordinator re-enters a stage whose text it already holds, such as a second rebase stop or a second test round
- **THEN** it runs only that stage's bare mechanical action with a new record file

### Requirement: Stage-gated coordinator instructions

At start the merge coordinator SHALL load only what every stage needs. Its stage instructions in `sai/commands/merge/coordinator-stages.md` and the fixed texts in `sai/commands/merge/presentation.md` SHALL arrive from the merge tool when a stage starts, and the coordinator SHALL NOT fetch either file whole. A stage's text SHALL be in force from its entry to its exit and SHALL grant no authority to run a later stage.

#### Scenario: Preflight entry carries the seam rules once

- **WHEN** the coordinator enters `preflight`
- **THEN** the returned text holds the presentation seam's rules, the preflight stage instructions, and the preflight texts, and holds no later stage body

#### Scenario: Squash launch reads the message rules alone

- **WHEN** a `rebase-squash` launch needs the informative-message rules before the `final` stage
- **THEN** `instructions --stage messages` returns those rules alone

### Requirement: Judgment-point worker dispatch

The coordinator SHALL dispatch exactly one merge worker at the first judgment point of a run: a conflict stop, or a collision receipt whose result is `needs-judgment`. It SHALL continue that same worker at every later judgment point, including later rebase stops and failed test rounds. A run that reaches no judgment point SHALL dispatch no worker and SHALL open no no-commit guard window. The dispatch SHALL use the ready handshake and SHALL then disclose the task with the `--reconstruct` form of the `Active stage:` pointer and the complete reconstruction state. The `strategy` disclosure SHALL NOT carry stage blob OIDs: the worker SHALL read the conflicts through the merge tool's `bundle` action on the disclosed snapshot reference and hash.

#### Scenario: First conflict dispatches the worker

- **WHEN** the first conflict stop of a run is detected and no worker is running
- **THEN** the coordinator dispatches one worker and discloses `strategy` with the affected inventory, the snapshot reference and hash, the provenance receipt, the method, and the working language

#### Scenario: Collision alone dispatches the worker

- **WHEN** a clean integration's collision receipt is `needs-judgment` and no worker is running
- **THEN** the coordinator dispatches one worker and discloses `renumbering-plan` without asking for a working language

#### Scenario: Later rebase stop reuses the worker

- **WHEN** `git rebase --continue` stops on a new conflicted commit
- **THEN** the coordinator captures a fresh snapshot and continues the same worker with the language already selected

### Requirement: Coordinator-authored preflight and closure

The coordinator SHALL build Batch 1, the in-progress guard closings, the integration proposal, and the final summary from the fixed texts the merge tool serves with each stage. It SHALL take the preflight facts from the `preflight` receipt and the closing facts from the `status` receipt rather than listing branches or re-running status checks itself.

#### Scenario: In-progress guard closes without a question

- **WHEN** the `preflight` receipt reports a merge or rebase in progress
- **THEN** the coordinator prints the matching pinned closing text and closes the run with no question and no launch

#### Scenario: Final summary is written from the final texts

- **WHEN** no finalization operation remains
- **THEN** the coordinator writes the final summary from the final texts' template and hands it to terminal navigation

### Requirement: Provenance capture validates the exact source ref

The merge tool's `provenance` action SHALL check the source ref's format, its existence, and its commit before capturing the merge provenance, in one call. A ref that fails any check SHALL produce no provenance receipt.

#### Scenario: Missing ref produces no receipt

- **WHEN** `provenance` receives a well-formed ref that does not exist
- **THEN** the call fails and the coordinator closes the run with the branch-failure text without launching

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

The merge tool's `verify` action and `enter --stage verify` SHALL accept `--command <line>` for a documented command, or `--suite <record> --suite-hash <sha256>` for a suite record captured in preflight, and the coordinator SHALL pass one of the two on every verification call so that no round detects the command again. A documented command SHALL run instead of the marker list and its receipt SHALL carry `command_source: documented`; a marker-list command SHALL carry `command_source: list`. A captured suite record SHALL decide the command, or the absence of one, whatever marker files the integration later adds or removes. The tool MUST refuse with a usage or collection error a `--suite` without a matching `--suite-hash`, a record whose bytes do not match the hash, a record that is not a suite receipt, and `--command` together with `--suite`.

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
