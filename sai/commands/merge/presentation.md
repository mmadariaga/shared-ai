# Merge Presentation Seam

The coordinator-owned presentation boundary of `sai-merge`: how worker results
and the coordinator's own fixed texts reach the user. It is local to this
command. It renders and reports; it never dispatches or continues the worker,
answers a question, authorizes a mutation, runs git, or writes a file.

`merge.js` delivers this file by stage (`mechanics.md` § Stage delivery): the
seam rules down to `## Preflight texts` arrive with the `preflight` stage, and
each `texts` section arrives with the stage that prints it.

## Three values

The coordinator keeps three values apart:

1. **Worker source** — the latest validated worker payload, kept verbatim: no
   rewording, reordering, timestamp conversion, or answer interpretation.
2. **Presentation state** — the object below, updated only from tool receipts,
   worker results, and the coordinator's own operation outcomes, and only after the lifecycle
   check (`@sai/commands/merge/lifecycle.md`) accepted the transition.
3. **Mutation outcome** — the result of a coordinator-owned launch, checkout,
   staging, rename, reference update, or commit.

The seam renders the first two and reports the third. It reads state from
these values, never from rereading artifacts or from prose in a worker summary.

The seam's operations are coordinator-local responsibilities, not a protocol:
`render_information`, `render_gate`, `render_open_input`, `render_progress`,
and `render_terminal`.

## Presentation state

```text
phase: a lifecycle state from lifecycle.md
current_branch, merged_branch
selected_method: merge | rebase
squash_selection: yes | no | not-applicable
target_sha, source_ref, source_sha, merge_base, source_introduced_adr_ddr_records
branch_options, branch_selection_source: unresolved | listed | free-text
merge_outcome: clean | conflicted
rebase_state: not-applicable | stopped | finished
working_language: unresolved | the selected language token
conflict_files_by_category
strategy_status: not-applicable | pending | revised | confirmed | declined
strategy_revision, conflict_detection_round: non-negative integers
test_command: unresolved | list (with the suite record reference and hash) | the explicit documented command
verification_round: 0 | 1 | 2 | 3
verification_result: pending | passed | unavailable | failed | cap-exhausted
staged_files
compact_finalization_summary
unresolved_escalations
collision_applicability: not-applicable | no-collision | repair-required | escalation-required
ambiguous_references
adr_ddr_renames
adaptive_todo_steps, adaptive_todo_marked
panel_ownership: unclaimed | exclusive | cleared
finalization_status: pending | continued | committed | failed | cleared
commit_executed: false | true
```

Each `adr_ddr_renames` record holds the worker's collision data: `old_path`,
`new_path`, `family`, `assigned_identifier`, `introduction_anchor`,
`introduction_path`, `introduction_commit`, `introduction_timestamp`,
`commit_date`, `suffix`, `old_h1`, `new_h1`, `old_index_label`,
`new_index_label`. The coordinator records them before executing the rename and
never rereads an artifact to fill a missing field.

## Two channels

### Report selection

Select the stage's report before choosing a channel. Preserve the validated
worker source unchanged; presentation selection never alters validation input.

- **Strategy:** print the complete strategy and Conflict Analysis once per
  conflict stop or revision, before application in either mode. A normal-mode
  gate's `worker_context` is that same already-rendered strategy, not a second
  print. Every new decision receives a complete new presentation.
- **Application:** retain the full resolution payload as internal evidence.
  Show only new errors, escalations or a changed state. Successful application
  does not repeat Conflict Analysis, alternatives, or selected-decision prose.
- **Verification/collision:** reuse established outcomes. Show new failures,
  unavailability, repairs and escalations with enough evidence for action;
  a mechanical non-applicability needs only its disposition, not a narrated
  search that did not occur.
- **Finalization:** show the compact pre-operation facts once, then the actual
  outcome.
- **Closure:** print the final summary once. Explain only new decisions,
  failures or state changes; settled strategy explanations stay in their
  earlier presentation.

No arbitrary length cap replaces necessary evidence. A compact report still
contains all errors, escalations and pending state that affect the next action.

- **Ordinary conversation text** — worker-authored information (the global
  strategy, test-failure analysis, collision plans, and open requests), printed
  once in the worker's wording and language, and the coordinator's own notices
  and summaries built from the fixed texts below. The coordinator's
  branch-entry prompt also travels here, in the ambient conversation language.
- **Native question** — closed decisions with non-empty options: Batch 1,
  Batch 2 and the normal-mode strategy confirmation. Claude Code uses
  `AskUserQuestion`; opencode uses
  `question`. The exact question and the ordered option values go to the
  picker unchanged.

A worker `needs_input` with an empty `options` list is open input:
`render_open_input` prints its request once as ordinary text; the coordinator
waits for the user's free-form answer and forwards it unchanged. The same
renderer prints the branch-entry prompt.

Paths, hashes, identifiers, option values, protocol tokens, JSON keys, and
artifact formats never change in either channel.

## Gates

Closed decisions travel in as few user trips as their dependencies allow:

| trip | when | author | items |
| --- | --- | --- | --- |
| Batch 1 | always | coordinator | `dirty` (only when dirty), `method` (not in fast-track), `branch` |
| Batch 2 | first conflict of the run | coordinator | `language` |
| Strategy | every conflict stop in normal mode | worker | the global strategy confirmation |

Batches hold closed questions only, one stable `id` per item, with no item
conditional on another item's answer. Every question complies with the
five-element anatomy of `@sai/policies/question-context.md`; its detailed
context prints as ordinary text before the picker, not in the question text.

For each closed gate, `render_gate` builds a local record before the picker:

```text
kind
context             the worker-authored summary unaltered, or the coordinator's
                    context built from the fixed texts
question            exact
options             exact and ordered
state_snapshot      decision-relevant coordinator state only
```

A batch gets one record per item, in order, presented in one trip;
the coordinator appends one `{id, question, options, answer_value}` pair per
item to the opaque input history. A batch larger than the picker's capacity
renders as plain text, keeping every item's order and exact values. Presentation
state never enters the input history or the envelope.

## Progress

The adaptive TODO is a coordinator-owned task list, separate from any worker
`progress_plan`. Its item ids, labels, order, route transitions, and panel
ownership are defined in `@sai/policies/todo-structure.md` § Merge adaptive
TODO; `render_progress` applies them verbatim through the active harness
binding (`TaskUpdate`/`TaskList` on Claude Code, `todowrite` and the session
todo surface on opencode). A TODO state never authorizes a mutation.

## Terminal

`render_terminal` prints the final summary once. A run closed by a worker
result (a declined strategy) prints that worker source `summary` unchanged. It
prints `Merge done.` only when `commit_executed` is true. Before clearing the
merge-owned TODO surface it records the final state; the invocation's
changed-files union stays coordinator state.

## Preflight texts

The pinned texts stay verbatim; write the surrounding context in the ambient
conversation language, because `working_language` is not yet known.

### In-progress guards

Close the run with exactly:

- when a merge is in progress: **"Merge already in progress. Resolve or abort
  the current merge first (`git merge --continue` or `git merge --abort`)."**
- otherwise, when a rebase is in progress: **"Rebase already in progress.
  Resolve or abort the current rebase first (`git rebase --continue` or
  `git rebase --abort`)."**

### Dirty item

When the worktree is dirty, Batch 1 includes the `dirty` item: **"Working tree
has uncommitted changes. Continue anyway?"** with ordered options `yes` / `no`,
and the context lists the dirty paths.

### Method item

Outside fast-track, Batch 1 includes the `method` item: **"Which integration
method do you want to use?"** with ordered options:

- `{label: "Merge", value: "merge"}`;
- `{label: "Rebase", value: "rebase"}`;
- `{label: "Rebase with squash", value: "rebase-squash"}`.

`rebase-squash` is a presentation shortcut for `method=rebase` + `squash=yes`;
`rebase` alone means `squash=no`, and `merge` means `squash=not-applicable`.
The context states the current branch and what each method does:

- `Merge` integrates the selected branch into the current branch; the coordinator
  finalizes it automatically under its command-local authorization.
- `Rebase` replays the current branch's commits onto the selected branch one by
  one, so conflicts may appear at each commit.
- `Rebase with squash` first unifies the current branch's unique commits
  (`merge_base..HEAD`) into one local commit, so conflicts appear at most once,
  then rebases that commit.

### Branch item

Use the preflight receipt's `current_branch` and `candidates`, not another
branch listing. The tool implements
`git branch --no-merged HEAD --format='%(refname:short) %(committerdate:iso8601)'`
and `git rev-parse --abbrev-ref HEAD`. The `--no-merged HEAD` filter is
authoritative. Candidates arrive sorted by full committer timestamp, newest
first, then by exact branch name ascending for equal timestamps.

Batch 1 includes the `branch` item with the canonical English question
**"Which branch do you want to operate on?"**; it is neutral because Batch 1
renders before the method is answered. It renders in the ambient conversation
language (Spanish: **"¿Sobre qué rama quieres operar?"**; English and any
other language: the canonical question). Its options are every candidate in
sorted order, then the branch-entry option last:

- For each candidate, `value` is the exact local branch name and `label` is
  `<branch> — last commit <YYYY-MM-DD HH:mm>` (timezone omitted).
- `{label: "Enter a branch name", value: "sai:enter-branch"}` — the branch-entry
  sentinel, a routing choice. The colon makes this value invalid as a Git ref,
  so it cannot collide with a valid branch.

With no candidates, the branch-entry option is the only option. Choosing it
opens the branch-entry prompt below; a branch typed directly into the picker
is taken as-is instead.

The context carries the current branch, the direction (the selected branch is
the merge source for `merge` and the new base for `rebase`), every candidate's
full timestamp, why a branch is needed, and that entering a name makes the
coordinator run `git fetch --prune origin` (which can prune stale `origin`
tracking refs and authorizes nothing more) before checking it. With no
candidates, say so plainly and explain that text entry is still available.

### Branch entry

The coordinator's open prompt after the sentinel (picker free text needs no
prompt, and the sentinel leads to this open prompt). Its context says
the list holds only unmerged local branches, names the selected method and
current branch, and says the branch will be merged into the current branch or
used as the rebase base. Text entry accepts any local branch (including a
merged one the list omits) or an `origin/<branch>` remote-tracking branch,
used directly without creating a local branch; the exact ref must validate
before integration starts. Ask: **"Enter the exact local branch name or
`origin/<branch>` reference to use."** Localize the prose to the ambient
language; keep refs and protocol tokens unchanged.

### Integration proposal

Before launching, print the exact launch, naming the branch by its full
`source_ref`, never a shorthand Git could resolve as another kind of revision:

- `merge` — `git merge --no-ff --no-commit <source_ref>`, so every merge, clean
  or conflicted, stops before its commit;
- `rebase` — `git rebase <source_ref>`;
- `rebase-squash` — `git reset --soft <merge_base>` plus one `git commit`
  holding the squashed change, then `git rebase <source_ref>`. When `merge_base`
  equals `target_sha` there is nothing to squash and the plain rebase runs.
  Rewriting already-pushed commits stays the user's responsibility.

### Early closes

- `dirty` answered `no` — state that no merge was performed.
- Branch failure — state that no integration was started and name the failed
  fetch or the exact branch reference.

## Conflict texts

- **Batch 2** — the conflict notice prints first as ordinary text, then the
  `language` item the `conflicts` stage defines.
- **Strategy presentation** — before rendering in either mode, check that the worker source
  covers the whole affected conflict set in file and region order and holds
  `## Global resolution strategy` with **Facts**, **Inferences**, both branch
  objectives, what the plan preserves, gains, and gives up, risks, affected
  contracts, the alternatives considered, and a combination assessment where
  one applies. Print it as ordinary text, then follow the mode-specific
  hand-off in `instructions.md` Step 7. Only normal mode uses `render_gate`.
- **Review budget exhausted** — state that the confirmed strategy could not be
  materialized within the retry budget, that nothing was staged, and the exact
  repository state with the manual continuation and abort commands.

## Verification texts

- **No suite** — print as ordinary text that automated verification is
  unavailable, and that the resolution has already been applied and staged; it
  is not a gate. For `ambiguous-suite`, add the candidates from `detail`.
- **Not runnable** — print as ordinary text that the test command could not
  start, with the command and the reason from `detail`, that no test ran, and
  that the resolution has already been applied and staged; it is not a gate
  and not a test failure.
- **Failed round** — print the worker's failure analysis and proposed fixes
  once; on the third failed round, state that verification failed through all
  three rounds, list the remaining failures, and note that the resolved state
  stays staged and uncommitted.

## Collision texts

Each planned rename renders one record from `adr_ddr_renames`, grouped by
affected `(family, numeric prefix)`. Every rendered reference uses the record's
single assigned identifier: filename prefix, H1, index label, relationship
tokens, markdown links (correction-table and `*Superseded by*` link text
included), and structured index metadata. Groups outside the source frontier
never render. Orphan, ambiguous, and delete/modify escalations render as
reported, unresolved.

## Final texts

### Compact finalization summary

Derived from coordinator state immediately before the local operation, shown
as ordinary text; it is not a gate:

```text
Method: <merge | rebase (squash yes/no)>
Target branch: <current branch>
Source branch: <selected branch>
Verification status: <passed | not required (clean integration) | unavailable (no detectable suite) | unavailable (command not runnable: <reason>) | failed after round N>
Conflict result: <clean | resolved (N files) | unresolved (N escalations)>
Collision result: <not applicable | none detected | N repaired | N reported (N escalations)>
Staged files: <N>
```

`Collision result` carries the `collision_applicability` value. `Staged files`
stays a count; the exact paths stay in coordinator state for failure reporting
and staging. Conflict, verification, and collision details may print beside it.

### Final summary

After the operation succeeds, restate the exact
finalization in a self-sufficient closure: method, target/source branches,
actual operation and resulting HEAD, verification outcome, conflict/collision
disposition, and any remaining escalations. Reuse the established decisions;
do not explain the settled strategy again.

A rebase that finished with nothing staged needs no operation: report the new
`HEAD`, and that `target_sha` is the pre-rebase `HEAD`.

If the operation fails, report it as failed, with the exact repository state,
through the existing error path. Name completed partial operations, the failed
operation and its error, current HEAD, staged and pending paths, merge/rebase
state, and unresolved verification or collision findings. A shortened report
never hides a partial operation or claims successful finalization.

Write the summary in the `working_language` once selected, otherwise in the
ambient conversation language.
