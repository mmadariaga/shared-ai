# Merge Presentation Seam

This is the coordinator-owned presentation boundary for `sai-merge`. It is
limited to this command; it is not a shared UI framework and it never replaces
the worker binding or the coordinator's mutation procedure. The active
`concise` renderer exposes decisions directly, moves technical evidence into
summaries, and keeps the worker lifecycle and mutation boundary unchanged.

## Installed source path and projections

`sai/commands/merge/presentation.md` is an installed SAI seam asset, not a
target-repository merge input. It stays outside the target invocation's
`changed_files` union and final staging set by default; fetching the installed
contract never makes it a merge path. The existing recursive `sai-commands`
projection owns this path for both supported harnesses and materializes the
same neutral destination:

- Claude Code — `sai/commands/merge/presentation.md`
- opencode — `sai/commands/merge/presentation.md`

Before the change closes, verify that both harness projections contain this
file and that the coordinator's `Fetch @sai/commands/merge/presentation.md`
target resolves in each harness. If a target repository also has a
repository-local copy, include that path in the merge union only after the
coordinator independently verifies that the file exists there and is owned by
the target repository; an installed-only copy is never staged.

## Ownership boundary

The merge worker returns technical source data in the closed worker-core
payloads. The source payload is opaque to mutation execution and includes the
worker-authored `summary`, and, for `needs_input`, its exact `question` and
ordered `options`. The coordinator owns the presentation of that source data.

Maintain three separate coordinator-local values:

1. **Worker source** — the latest validated lifecycle payload, retained without
   rewording, reordering, timestamp conversion, or answer interpretation.
2. **Merge presentation state** — the coordinator's lifecycle state, derived
   only from the worker result and the coordinator's own operation outcomes.
3. **Mutation outcome** — the result of a coordinator-owned merge, resolution
   write, staging operation, ADR/DDR rename or reference update, or commit.

The presentation seam may render the first two values and report the third. It
must never dispatch or continue the worker, select an answer, authorize a
mutation, run git, write a resolution, rename a record, or update a reference.
Technical analysis remains the worker's responsibility, and every mutation
remains the coordinator's responsibility.

The merge-only seam has three coordinator operations:

- `render_gate(worker_source, presentation_state)` — build and present the
  gate summary and its native picker inputs;
- `render_progress(presentation_state)` — decide whether the merge progress
  surface has anything to render; and
- `render_terminal(worker_source, presentation_state)` — render the terminal
  summary and completion literal according to commit state.

These names describe coordinator-local responsibilities, not a new runtime
protocol or a reusable abstraction.

## Merge presentation state

Initialize one state object for the invocation with these fields:

```text
phase: preflight | branch-selection | merge-outcome | scope-selection |
       contextual-analysis | resolution | verification | adr-ddr |
       authorization | terminal
presentation_mode: concise
current_branch
merged_branch
branch_options
merge_outcome: clean | conflicted
conflict_files_by_category
eligible_scope_options
selected_scope
contextual_decision_status: not-needed | pending | completed | blocked
pending_contextual_conflict
contextual_decisions: ordered records {conflict_id, decision: ours|theirs|synthesis}
verification_round: 0 | 1 | 2 | 3
verification_result: pending | passed | failed | cap-exhausted
staged_files
compact_authorization_summary
unresolved_escalations
collision_applicability: not-applicable | no-collision | repair-required |
                       escalation-required
ambiguous_references
adr_ddr_renames
adaptive_todo_steps: ordered canonical item records {id, label, state}
adaptive_todo_marked: completed canonical item ids
panel_ownership: unclaimed | exclusive | cleared
authorization_status: pending | committed | refused | cleared
commit_executed: false | true
```

Each `adr_ddr_renames` record carries the worker-supplied collision data:

```text
old_path
new_path
family: adr | ddr
assigned_identifier
commit_date
suffix
old_h1
new_h1
old_index_label
new_index_label
```

Update the state only at the corresponding lifecycle boundary:

- Start in `preflight`. A dirty-worktree gate remains in `preflight`; the
  branch selector is `branch-selection` and does not advance until a branch is
  selected. Store the worker-authored exact branch values and
  `YYYY-MM-DD HH:mm` labels for only branches whose commits are not already
  reachable from the current branch in `branch_options`.
- After branch selection, record the current and merged branches, render the
  adaptive TODO, run the coordinator-owned merge, and record `merge_outcome`.
  A clean merge advances directly to `adr-ddr`; a conflicted merge advances
  through `scope-selection`, `contextual-analysis`, and `resolution`.
- After scope selection, enter `contextual-analysis`. Keep the contextual item
  `in_progress` while the worker explains a semantically ambiguous conflict or
  continues a `more-context` request. An obvious conflict completes this stage
  without a user gate. Do not enter `resolution` or permit a resolution write
  until every required contextual decision has an explicit internal value and
  the worker has returned the matching complete alternative.
- After resolution writes and staging, enter `verification`. Keep the same
  staged state and increment `verification_round` for each failed round. Round
  three remains `cap-exhausted` and staged; it is never silently committed or
  reset by the presentation seam.
- After verification, enter `adr-ddr`, then `authorization` once all
  coordinator-owned renames, reference updates, and final staging are done.
  Set `collision_applicability` from the worker's collision result (or its
  skipped-scan authorization source), and derive collision TODO work only when
  it is `repair-required` or `escalation-required`. Build the compact
  authorization summary before the authorization picker. On `yes`, mark the
  authorization task completed after the commit executes; on `no`, clear the
  authorization task before terminal rendering. The terminal state records
  whether the authorized commit actually executed.

Do not derive lifecycle state by rereading artifacts or by treating prose in a
worker summary as a mutation instruction. The coordinator already knows the
operation outcome it reports to the worker; the seam records that outcome for
presentation only.

## Gate presentation

For every worker `needs_input`, `render_gate` creates a coordinator-local gate
summary before invoking the native picker:

```text
kind
worker_context
question
options
state_snapshot
```

`question` and `options` come from the validated worker source and remain exact
and ordered. Branch options use the exact branch name as `value` and
`<branch> — last commit <YYYY-MM-DD HH:mm>` as `label`; the worker has already
filtered them with `git branch --no-merged HEAD` and sorted them by commit
timestamp descending and branch name ascending for ties. `worker_context`
carries the worker-authored technical payload
alongside the ask without alteration. `state_snapshot` carries only the
decision-relevant coordinator state. Append only the exact `question`, exact
ordered `options`, and the user's exact `answer_value` to opaque input history;
presentation state is never added to that history and is never sent as an
envelope field.

The seam owns the presentation location for the existing dirty-worktree,
branch, runtime-scope, contextual semantic-decision, no-suite, and
commit-authorization gates. It does not add a gate, alter answer values, or
change continuation order. For the runtime scope gate, validate that the
worker's `eligible_scope_options` matches `conflict_files_by_category` before
rendering: `full` represents all detected categories and is rendered first as
`Full scope (Recommended)`; `artifacts` requires a specs or ADR/DDR conflict
and follows as `Artifacts only (specs + ADR/DDR)` when applicable; `code`
requires a code conflict and follows as `Code only` when applicable. Render
only that filtered, canonical option set and never show a category-specific
option for an absent category.

For a contextual semantic-decision gate, validate that the worker source names
one pending conflict and carries both **Facts** and **Inferences**, the two
branch objectives, the preserve/gain/give-up/risk comparison, affected
contracts, and the synthesis safety assessment. The only accepted option
values are `ours`, `theirs`, optional `synthesis`, and `more-context`; values
are internal and must remain exact. `synthesis` may appear only when the source
contains a complete safe combined outcome. `more-context` is a continuation
request, never a resolution choice. Human-facing labels must describe the
complete behavior and trade-off rather than expose merge jargon or a text
fragment. The seam validates this source and renders it; it does not select a
value or infer a missing alternative.

While this gate or a `more-context` continuation is pending, the coordinator
must not write a resolution, remove conflict markers, or stage a path. A
forwarded decision is not sufficient by itself: the worker must return the
matching complete, marker-free alternative, and the coordinator validates that
payload before entering the resolution boundary. A completed resolution result
must carry the `## Complete resolution payload` JSON object defined by
`@sai/commands/merge/instructions.md`. The seam validates that it has exactly
one complete `content` string for every conflicted file in the selected scope,
that each path and category matches the worker's classified source, that every
semantic decision is an offered value other than `more-context`, and that no
conflict marker appears in any content string. The coordinator writes only
those exact content strings; neither the seam nor the coordinator may derive a
file by applying a region replacement, concatenating alternatives, or reading
resolution prose.

For branch selection, render the concise question **"¿Qué rama quieres mergear?"**
with the readable `YYYY-MM-DD HH:mm` labels. Render the detailed current
branch, candidate timestamps, and merge rationale in the gate summary rather
than inside the question. For authorization, render the compact summary below
instead of the worker's full staged-file context. A missing test suite remains
an explicit `needs_input` decision, not an automatic skip.

The authorization question, option order, refusal rule, and authorized HEREDOC
commit surface remain unchanged. The seam presents these improved summaries;
it never selects an answer or authorizes a mutation.

### Compact authorization summary

Immediately before the final authorization picker, derive
`compact_authorization_summary` from coordinator state and render exactly these
decision facts:

```text
Target branch: <current branch>
Source branch: <merged branch>
Verification status: <passed | not required (clean merge) | continued without a detectable suite | failed after round N>
Conflict result: <clean | resolved (N files) | unresolved (N escalations)>
Collision result: <not applicable | none detected | N repaired | N reported (N escalations)>
Staged files: <N>
```

Do not expand `Staged files` into a path list at this gate. Preserve the exact
paths in coordinator state for the worker's E9 refusal summary and for staging
ownership. Technical conflict proposals, verification failures, and collision
details may be rendered as adjacent worker-authored summary content, but they
must not replace or duplicate the compact decision summary in the picker.

## Progress rendering

Progress rendering is a coordinator-owned operation over the presentation
state, not a worker event or a mutation trigger. The merge adapter still
declares no worker `progress_plan`; this adaptive TODO is a separate
coordinator-owned task list whose shape can follow the resolved merge path.
Use the active harness's native task-list binding and the canonical item
identities, labels, ordering, and transitions in
`@sai/policies/todo-structure.md` verbatim. The renderer must pass the stable
canonical ids and labels on every full render; it must not invent a route-local
id or label. The merge TODO claims exclusive ownership of the active panel on
its first full render. Before that claim, use the marker `sai-merge-todo` only
to clear stale merge entries; after the claim, the active binding may displace
foreign entries and no restoration is promised.

`render_progress(presentation_state)` follows these boundaries:

1. Before source-branch selection, keep `panel_ownership: unclaimed`, clear
   only stale entries bearing `sai-merge-todo` if the harness binding requires
   a surface start clear, and render no TODO. Foreign entries remain intact
   until the first merge render claims the panel.
2. Immediately after the user selects a source branch, render the initial
   canonical `merge` item with the selected source and target visible:

   ```text
   [~] Merge <source> into <target>
   ```

   Set `panel_ownership: exclusive` on this first full render. No possible
   conflict work is shown before the outcome is known.
3. At a clean outcome, mark canonical `merge` `completed` and remove
   `scope`, every `resolve-*` item, and `verification`. After the collision
   pass reports its applicability, append canonical `authorization`; insert
   canonical `collision` before it only for `repair-required` or
   `escalation-required`. A skipped scan or a scan with no collisions
   contributes no collision item; impossible conflict work is never rendered
   as pending.
4. After a conflicted outcome, reconcile the list to the actual categories and
   gate path. Append canonical `scope` only when the scope gate is actually
   presented; fast-track omits it. Add `contextual-analysis` after `scope` (or
   make it the first active conflict item on fast-track) and keep the applicable
   `resolve-artifacts`, `resolve-code`, or `resolve-full` item pending. The
   category-specific scope options are the worker's filtered set, not a new
   TODO decision.
5. While the worker is explaining a semantic ambiguity, while `more-context` is
   being answered, or while more contextual decisions remain, keep
   `contextual-analysis` `in_progress` and keep the resolution item pending.
   Do not render the resolution item as active before the worker returns the
   selected complete alternatives. When the worker returns an obvious route or
   the final explicitly selected alternatives, mark `contextual-analysis`
   `completed` and make the applicable resolution item `in_progress`; only
   then may the coordinator write and stage resolutions.
6. After each resolution or verification outcome, mark only the applicable
   canonical item that the coordinator has actually completed and render the
   complete current list. Round three remains staged and uncommitted when
   verification is exhausted; the TODO must not imply that a commit occurred.
7. After the collision pass, omit canonical `collision` for
   `not-applicable` or `no-collision`; otherwise keep it before
   `authorization` and mark it completed only after all coordinator-owned
   renames and canonical reference updates have finished. Add
   `authorization` only after final staging and leave it `in_progress` while
   the native picker is pending. On `yes`, mark it completed only after the
   commit succeeds. On `no` or any other non-committing terminal closure,
   remove and clear it rather than leaving a pending commit action.

The list may change shape at the merge-outcome boundary by removing impossible
steps; it remains coordinator-emitted, and progress state is never used to
authorize a merge, resolution, staging, rename, or commit. Worker verification
round ownership and continuation behavior remain unchanged. At terminal
rendering, clear the exclusive merge-owned surface and set
`panel_ownership: cleared`; do not promise restoration of entries that were
displaced when ownership was claimed.

## Terminal rendering and record consistency

The concise terminal renderer prints the worker source `summary`
without rewriting it. It prints `Merge done.` only when `commit_executed` is
true; every other closure stops without that literal and without mutation. It
forwards `emitted_on` verbatim and never takes a replacement clock reading.
The invocation-wide ordered, duplicate-free `changed_files` union remains
coordinator state and is not replaced by a presentation list.

When terminal rendering begins, record the final state before clearing the
exclusive merge-owned TODO surface. A successful authorization first marks the
`authorization` item completed after the commit; a refusal or other
non-committing closure removes and clears that item so it cannot remain an
actionable pending task. Preserve the worker's exact refusal summary and
repository-state record; no foreign panel entries are restored.

ADR/DDR collision presentation uses one record for each planned rename with
the family, old path, new path, assigned suffixed identifier, suffix, commit
date, exact old/new H1, and exact old/new index label supplied by the worker.
The coordinator records these values before executing the rename and never
rereads artifacts to fill a missing presentation field. Every rendered
reference uses the same family-aware assigned identifier: the filename prefix,
H1 identifier, index label, same-family token, cross-family token, markdown link
(including correction-table and reserved historical link text), and structured
index metadata cannot drift apart. The seam reports orphan, ambiguous, and
other manual escalations but does not resolve, invent a destination, or
suppress them.
