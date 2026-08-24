# Merge Presentation Seam

This is the coordinator-owned presentation boundary for `sai-merge`. It is
limited to this command; it is not a shared UI framework and it never replaces
the worker binding or the coordinator's mutation procedure. The active
`legacy` renderer makes this refactor behavior-preserving: it introduces no
new user-facing output.

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
       resolution | verification | adr-ddr | authorization | terminal
presentation_mode: legacy
current_branch
merged_branch
merge_outcome: clean | conflicted
conflict_files_by_category
eligible_scope_options
selected_scope
verification_round: 0 | 1 | 2 | 3
verification_result: pending | passed | failed | cap-exhausted
staged_files
compact_authorization_summary
unresolved_escalations
adr_ddr_renames
commit_executed: false | true
```

Each `adr_ddr_renames` record carries the worker-supplied collision data:

```text
old_path
new_path
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
  selected.
- After branch selection, record the current and merged branches, run the
  coordinator-owned merge, and record `merge_outcome`. A clean merge advances
  directly to `adr-ddr`; a conflicted merge advances through
  `scope-selection` and `resolution`.
- After resolution writes and staging, enter `verification`. Keep the same
  staged state and increment `verification_round` for each failed round. Round
  three remains `cap-exhausted` and staged; it is never silently committed or
  reset by the presentation seam.
- After verification, enter `adr-ddr`, then `authorization` once all
  coordinator-owned renames, reference updates, and final staging are done.
  The terminal state records whether the authorized commit actually executed.

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
and ordered. `worker_context` carries the worker-authored technical payload
alongside the ask without alteration. `state_snapshot` carries only the
decision-relevant coordinator state. Append only the exact `question`, exact
ordered `options`, and the user's exact `answer_value` to opaque input history;
presentation state is never added to that history and is never sent as an
envelope field.

The seam owns the presentation location for the existing dirty-worktree,
branch, runtime-scope, no-suite, and commit-authorization gates. It does not
add a gate, alter the answer values, or change continuation order. The active
`legacy` renderer presents the existing worker question, ordered options, and
worker-authored context without rewording or filtering; this is the
behavior-preserving slice. It may record `eligible_scope_options` and
`compact_authorization_summary` for the next merge-only presentation change,
but it does not activate either concise rendering here. The future scope
renderer must not show an option that cannot apply to any detected conflict
category, and a future authorization renderer must use the compact summary
(current branch, merged branch, staged-file count, and unresolved escalations)
instead of a second full-file dump. A missing test suite remains an explicit
`needs_input` decision, not an automatic skip.

The authorization question, option order, refusal rule, and authorized HEREDOC
commit surface remain the existing merge contract in this slice.

## Progress rendering

Progress rendering is a coordinator-owned operation over the presentation
state, not a worker event or a mutation trigger. This slice keeps the merge
adapter's declared `progress_plan` absent: the seam emits no native task panel
or TODO output. In particular:

- no TODO is shown before source-branch selection;
- a clean merge does not create conflict-resolution work as pending; and
- progress state is never used to authorize a merge, resolution, staging,
  rename, or commit.

If a later merge-only presentation change adds a visual plan, it must consume
this state after the relevant boundary, use the same category and verification
state, and leave worker verification and continuation unchanged. That later
plan is not part of this refactor.

## Terminal rendering and record consistency

The legacy-compatible terminal renderer prints the worker source `summary`
without rewriting it. It prints `Merge done.` only when `commit_executed` is
true; every other closure stops without that literal and without mutation. It
forwards `emitted_on` verbatim and never takes a replacement clock reading.
The invocation-wide ordered, duplicate-free `changed_files` union remains
coordinator state and is not replaced by a presentation list.

ADR/DDR collision presentation uses one record for each planned rename with
the old path, new path, assigned number, commit date, exact old/new H1, and
exact old/new index label supplied by the worker. The coordinator records these
values before executing the rename and never rereads artifacts to fill a
missing presentation field. Every rendered reference uses the same assigned
filename and number, so the filename, H1, and index label cannot drift apart.
The seam reports E7/E8 findings but does not resolve or suppress them.
