# Merge Presentation Seam

The coordinator-owned presentation boundary of `sai-merge`: how worker results
reach the user. It is local to this command. It renders and reports; it never
dispatches or continues the worker, answers a question, authorizes a mutation,
runs git, or writes a file.

## Three values

The coordinator keeps three values apart:

1. **Worker source** — the latest validated worker payload, kept verbatim: no
   rewording, reordering, timestamp conversion, or answer interpretation.
2. **Presentation state** — the object below, updated only from worker results
   and the coordinator's own operation outcomes, and only after the lifecycle
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
eligible_scope_options, selected_scope
strategy_status: not-applicable | pending | revised | confirmed | declined
strategy_revision, conflict_detection_round: non-negative integers
verification_round: 0 | 1 | 2 | 3
verification_result: pending | passed | failed | cap-exhausted
staged_files
compact_authorization_summary
unresolved_escalations
collision_applicability: not-applicable | no-collision | repair-required | escalation-required
ambiguous_references
adr_ddr_renames
adaptive_todo_steps, adaptive_todo_marked
panel_ownership: unclaimed | exclusive | cleared
authorization_status: pending | committed | refused | cleared
commit_executed: false | true
```

Each `adr_ddr_renames` record holds the worker's collision data: `old_path`,
`new_path`, `family`, `assigned_identifier`, `introduction_anchor`,
`introduction_path`, `introduction_commit`, `introduction_timestamp`,
`commit_date`, `suffix`, `old_h1`, `new_h1`, `old_index_label`,
`new_index_label`. The coordinator records them before executing the rename and
never rereads an artifact to fill a missing field.

## Two channels

- **Ordinary conversation text** — worker-authored information: summaries,
  conflict notices, the global strategy, verification findings, collision
  results, and open requests, printed once in the worker's wording and
  language. The coordinator's own branch-entry prompt also travels here, in
  the ambient conversation language.
- **Native question** — closed decisions with non-empty options: Batch 1,
  Batch 2, the strategy confirmation, the no-suite question, and the
  authorization question. Claude Code uses `AskUserQuestion`; opencode uses
  `question`. The exact question and the ordered option values go to the
  picker unchanged.

A worker `needs_input` with an empty `options` list is open input:
`render_open_input` prints its request once as ordinary text; the coordinator
waits for the user's free-form answer and forwards it unchanged. The same
renderer prints the branch-entry prompt below.

Paths, hashes, identifiers, option values, protocol tokens, JSON keys, and
artifact formats never change in either channel.

## Gates

For each closed gate, `render_gate` builds a local record before the picker:

```text
kind
worker_context      the worker-authored summary, unaltered
question            exact
options             exact and ordered
state_snapshot      decision-relevant coordinator state only
```

A batch gets one record per `questions` item, in order, presented in one trip;
the coordinator appends one `{id, question, options, answer_value}` pair per
item to the opaque input history. A batch larger than the picker's capacity
renders as plain text, keeping every item's order and exact values. Presentation
state never enters the input history or the envelope.

Per gate:

- **Method** — the summary carries the current branch and the difference
  between the three methods.
- **Branch** — the question renders in the ambient conversation language
  (Spanish: **"¿Sobre qué rama quieres operar?"**; English and any other
  language: the canonical **"Which branch do you want to operate on?"**),
  because `working_language` is not yet known. Options, labels, and order are
  exactly the worker's (`instructions.md` Step 3), ending with the
  `Enter a branch name` option whose value is the sentinel `sai:enter-branch`.
  The summary carries the current branch, the direction (merge source or new
  base), the full timestamps, and that entering text runs
  `git fetch --prune origin` before validation, which may prune stale `origin`
  tracking refs and authorizes nothing more; with no candidates it says so
  plainly.
- **Branch entry** — the coordinator's open prompt after the sentinel
  (coordinator § Gates; picker free text needs no prompt, and the sentinel
  leads to this open prompt). Its context says
  the list holds only unmerged local branches, names the selected method and
  current branch, and says the branch will be merged into the current branch or
  used as the rebase base. Text entry accepts any local branch (including a
  merged one the list omits) or an `origin/<branch>` remote-tracking branch,
  used directly without creating a local branch; the exact ref must validate
  before integration starts. Ask: **"Enter the exact local branch name or
  `origin/<branch>` reference to use."** Localize the prose to the ambient
  language; keep refs and protocol tokens unchanged.
- **Batch 2** — the conflict notice prints first as ordinary text, then the
  `language` item and, outside fast-track, the `scope` item. Before rendering,
  check that `eligible_scope_options` matches `conflict_files_by_category`:
  `full` first as `Full scope (Recommended)`, then `artifacts` as
  `Artifacts only (specs + ADR/DDR)` only with a specs or ADR/DDR conflict, then
  `code` as `Code only` only with a code conflict.
- **Strategy confirmation** — before rendering, check that the worker source
  covers the whole selected conflict set in file and region order and holds
  `## Global resolution strategy` with **Facts**, **Inferences**, both branch
  objectives, what the plan preserves, gains, and gives up, risks, affected
  contracts, the alternatives considered, and a combination assessment where
  one applies. Print it as ordinary text, then ask the confirmation.
- **No suite** — an explicit decision, never an automatic skip.
- **Authorization** — show `compact_authorization_summary` in place of the
  worker's staged-file context.

### Compact authorization summary

Derived from coordinator state immediately before the authorization picker:

```text
Method: <merge | rebase (squash yes/no)>
Target branch: <current branch>
Source branch: <selected branch>
Verification status: <passed | not required (clean integration) | continued without a detectable suite | failed after round N>
Conflict result: <clean | resolved (N files) | unresolved (N escalations)>
Collision result: <not applicable | none detected | N repaired | N reported (N escalations)>
Staged files: <N>
```

`Staged files` stays a count; the exact paths stay in coordinator state for the
refusal record and for staging. Conflict, verification, and collision details
may print beside it as worker-authored text.

## Progress

The adaptive TODO is a coordinator-owned task list, separate from any worker
`progress_plan`. Its item ids, labels, order, route transitions, and panel
ownership are defined in `@sai/policies/todo-structure.md` § Merge adaptive
TODO; `render_progress` applies them verbatim through the active harness
binding (`TaskUpdate`/`TaskList` on Claude Code, `todowrite` and the session
todo surface on opencode). A TODO state never authorizes a mutation.

## Terminal

`render_terminal` prints the worker source `summary` unchanged and forwards the
validator's `validated_at` sidecar verbatim. It prints `Merge done.` only when
`commit_executed` is true. Before clearing the merge-owned TODO surface it
records the final state; the invocation's changed-files union stays coordinator
state.

## Collision presentation

Each planned rename renders one record from `adr_ddr_renames`, grouped by
affected `(family, numeric prefix)`. Every rendered reference uses the record's
single assigned identifier: filename prefix, H1, index label, relationship
tokens, markdown links (correction-table and `*Superseded by*` link text
included), and structured index metadata. Groups outside the source frontier
never render. Orphan, ambiguous, and delete/modify escalations render as
reported, unresolved.
