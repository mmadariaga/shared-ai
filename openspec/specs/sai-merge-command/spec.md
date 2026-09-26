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

The coordinator SHALL launch the `merge` method with `git merge --no-ff --no-commit <source_ref>` where `source_ref` is `refs/heads/<name>` for a listed candidate or an unprefixed free-text entry and `refs/remotes/origin/<name>` for an `origin/<name>` entry, so a clean or conflicted merge never commits before final authorization. A fast-forward SHALL never occur.

#### Scenario: Clean merge waits for authorization

- **WHEN** a merge completes without conflicts
- **THEN** the merge remains in progress with its result staged, the collision pass runs, and the merge commit executes only after the authorization answer `yes`

#### Scenario: Free-text source launches via exact ref

- **WHEN** a validated free-text entry resolves to its exact `source_ref`
- **THEN** the merge launches with that ref and stops before commit for authorization

### Requirement: Rebase continues per stop and finishes without a spurious gate

For the `rebase` method, each conflicted stop SHALL pass through resolution, verification, and the authorization question `Continue the rebase onto <branch>?`, after which the coordinator runs `GIT_EDITOR=true git rebase --continue`. A new conflicted commit SHALL re-enter strategy analysis with the selected working language. After the rebase finishes, the collision pass SHALL run on the final state; when a collision repair is staged the authorization question SHALL be "Run `git commit` to record the ADR/DDR collision repair?", and when nothing is staged no authorization question SHALL be asked.

#### Scenario: Clean rebase reports and closes

- **WHEN** a rebase finishes without conflicts and no collision repair is staged
- **THEN** the run reports the new `HEAD` and that `target_sha` is the pre-rebase `HEAD`, without an authorization question

#### Scenario: Multi-commit rebase stops again

- **WHEN** `git rebase --continue` stops at another conflicted commit
- **THEN** the coordinator reports the outcome to the same worker, which returns `conflict_detected` with `continuation_state: strategy-analysis` and no language question is repeated

### Requirement: Method-aware side mapping

The worker SHALL map git stages to branches by method: for `merge`, stage 2 (`--ours`) is the current branch and stage 3 (`--theirs`) the selected branch; for `rebase`, stage 2 is the selected branch and stage 3 the current branch's replayed commit. Decision values `ours` / `theirs` and payload sources `git-ours` / `git-theirs` SHALL always denote the git stage, and alternatives SHALL be described to the human by branch and behavior.

#### Scenario: Rebase keeps the user's chosen branch

- **WHEN** during a rebase the confirmed strategy keeps the current branch's version of a file
- **THEN** the payload records `git-theirs` for that file and `git checkout --theirs` materializes the current branch's version

### Requirement: Coordinator-only mutation surface

The system SHALL confine state-changing git operations to the coordinator, including branch refresh with `git fetch --prune origin`, the launch, the squash commit, `git checkout --ours/--theirs`, `git mv`, staging, `git rebase --continue`, and commits. The worker SHALL run only read-only git commands and SHALL write only resolution content, and SHALL never run fetch or exact-ref validation for branch selection.

#### Scenario: Worker never executes git mutations

- **WHEN** the worker analyzes conflicts, proposes resolutions, scans collisions, or verifies the suite
- **THEN** it performs read-only inspection, writes authorized content to conflicted regions within scope, returns payloads, and leaves all git state changes to the coordinator

#### Scenario: Coordinator reviews materialized content before staging

- **WHEN** the worker has written resolution content to the working tree
- **THEN** the coordinator reviews it against the confirmed strategy and either stages it or returns the named divergence to the worker, for at most three rounds

#### Scenario: Worker never validates branch entries

- **WHEN** a free-text branch entry requires refresh and checks
- **THEN** the coordinator runs the fetch and exact-ref checks while the worker performs no git mutation

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

When every region of a file resolves to the same stage, the alternative SHALL come from git unchanged (`git-ours` or `git-theirs`). When regions resolve to different stages or need new text, the file SHALL be `authored`, with a region-scoped combination that keeps one owner per responsibility and one source per fact and is never built by concatenating fragments. A conflict without markers SHALL resolve to a git side or be escalated.

#### Scenario: Mixed-side file is authored

- **WHEN** a file's regions resolve to different stages
- **THEN** the git shortcut is not used and the worker authors each region's replacement text

### Requirement: Global strategy gates resolution

The worker SHALL produce one prose strategy over the whole selected conflict set, stating per file what is kept, adopted, combined, or escalated, with Facts, Inferences, objectives, contracts, trade-offs, risks, and the alternatives considered. Per-conflict decisions SHALL live inside that strategy; no per-conflict picker SHALL exist. The coordinator SHALL require `apply-strategy` before any resolution write, marker removal, or staging. `revise-strategy` SHALL return an open empty-options request whose free-form answer continues the same worker; `decline-strategy` SHALL close without a write.

#### Scenario: Strategy is confirmed before mutation

- **WHEN** the user selects `apply-strategy`
- **THEN** the worker writes the confirmed resolution and returns the complete payload, and nothing was written before that answer

#### Scenario: Strategy is revised without mutation

- **WHEN** the user selects `revise-strategy`
- **THEN** the same worker requests open context with empty `options`, rebuilds the strategy from the answer, and the repository remains unchanged

### Requirement: Complete resolution payload validation

Before staging, the coordinator SHALL atomically validate the `## Complete resolution payload`: exactly one record per conflicted file in the selected scope with the worker's path and category; `source` of `git-ours` / `git-theirs` with empty `regions` or `authored` with region entries; decisions matching those stated by the confirmed strategy; and no conflict marker, diff, hunk, or complete file in region text. Any failure SHALL reject the whole payload, leaving every conflict untouched and unstaged.

#### Scenario: Fragmentary payload is rejected atomically

- **WHEN** a payload holds a diff, hunk, complete file, invalid source, missing region, marker, missing file, unexpected path, or a decision the strategy did not state
- **THEN** the coordinator rejects the entire payload and stages no path

#### Scenario: Git-sourced files are materialized by checkout

- **WHEN** every record passes validation
- **THEN** the coordinator materializes `git-ours` / `git-theirs` files with `git checkout --ours` / `--theirs`, leaves the worker-written `authored` files as written, and never reconstructs content from prose

### Requirement: Runtime resolution scope gate

When conflicts exist and fast-track is inactive, the scope question SHALL ride Batch 2 with only the eligible values in the order `full`, `artifacts`, `code`. Fast-track SHALL select `full` without the question.

#### Scenario: Absent conflict categories are omitted

- **WHEN** a conflicted integration contains only code conflicts
- **THEN** the scope question offers full and code scope without artifacts-only scope

### Requirement: Bounded verification loop

The system SHALL detect the project's test suite from project metadata, run it after resolutions are staged, and iterate proposed fixes for at most three rounds per conflict stop before surfacing the remaining failures. A missing suite with code in scope SHALL be an explicit decision.

#### Scenario: Suite failure exhausts the budget

- **WHEN** the detected suite still fails after the third round
- **THEN** the remaining failures are reported and the resolved state stays staged and uncommitted for the authorization decision

### Requirement: Incremental ADR/DDR collision pass

The system SHALL run the ADR/DDR collision pass on the final integration state using only source-introduced records that survive in it. The coordinator SHALL capture `target_sha`, `source_sha`, `merge_base`, and the added-only source record inventory before the launch and forward them unchanged. Candidate keys SHALL be `(family, numeric prefix)`, compared only against final-state bare and suffixed records; references SHALL be repaired only for affected family-aware identifiers.

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

### Requirement: Explicit finalization authorization

The system SHALL finalize only after explicit authorization, with a method- and state-aware question and a compact summary of method, target and source branch, verification status, conflict result, collision result with applicability, and staged-file count, without the staged-file list.

#### Scenario: Authorization declined

- **WHEN** the user answers `no`
- **THEN** the resolved state stays staged, and the refusal record documents the branches, method, staged paths, how to finalize, and how to revert (including `target_sha` as the pre-squash `HEAD` for `rebase-squash`)

#### Scenario: Completion literal follows finalization

- **WHEN** the run ends with the merge commit executed, or with the rebase finished and any repair committed
- **THEN** the terminal prints the worker summary followed by `Merge done.`; every other closure omits it

### Requirement: Conflict-triggered language hand-off

Clean integrations SHALL never ask for a working language or strategy. On the first conflict the worker SHALL read the three stages, classify each file, and return `event: conflict_detected` with `continuation_state: language-selection`, `changed_files: []`, the `affected_files` inventory, and the `Categories:` / `Eligible scope:` summary lines; the coordinator SHALL then ask the language (and scope outside fast-track) in Batch 2 before any semantic analysis. Later conflicts SHALL use `continuation_state: strategy-analysis` and reuse the selected language.

#### Scenario: Clean integration needs no language

- **WHEN** an integration completes without conflicts
- **THEN** the run proceeds to the collision pass without a language question or strategy

#### Scenario: New problem re-enters strategy analysis

- **WHEN** resolution application or verification exposes a new conflict or inconsistent contract
- **THEN** the same worker rebuilds the strategy in the selected language and a fresh confirmation is required before the next write

### Requirement: Fast-track changes only method and scope

Merge fast-track SHALL pin the method to `merge` and select `full` scope, while the language question, strategy confirmation, payload validation, verification, collision pass, and final authorization remain required and no `ours`, `theirs`, or `synthesis` decision is ever auto-selected.

#### Scenario: Fast-track conflict retains strategy safety

- **WHEN** `--fast-track` is active for a conflicted merge
- **THEN** Batch 1 has no method item, Batch 2 carries only the language item, and the global strategy confirmation remains

### Requirement: The merge coordinator validates operation boundaries

The merge coordinator SHALL call `validate_transition(current_state, target_state, operation_context)` before each operation and SHALL halt when it returns `invalid`.

#### Scenario: Invalid coordinator transition halts safely

- **WHEN** lifecycle validation reports an invalid transition
- **THEN** the coordinator reports the violation and performs no operation, worker dispatch, mutation, or presentation update

### Requirement: Harness-parity merge contract

Claude Code and opencode SHALL use the same neutral worker and coordinator contracts. Given the same worker payloads and operation outcomes, both SHALL preserve the same question texts, option values and order, strategy and revision semantics, mutation gates, payload validation, verification behavior, authorization question, refusal record, and completion literal; only the native question and task-list mechanisms differ.

#### Scenario: Both harnesses preserve merge decisions

- **WHEN** the same conflicted integration is handled through Claude Code or opencode
- **THEN** each presents the same strategy and confirmation values and permits no resolution write, staging, or commit before the same coordinator-owned gates

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
