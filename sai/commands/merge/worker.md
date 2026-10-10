# Merge Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/tool-resolution.md and use it when resolving `merge.js`.

## Invocation

The worker receives one opaque string, `arguments_value`. Under strict-zero
two-phase startup the initial dispatch carries only the ready prompt and base
instructions; `arguments_value` arrives in the same-worker continuation after
`event: ready`. The task comes only from that envelope and the continuations
that follow it, never from parent conversation history. There is no change
resolution and no prerequisite check: `sai-merge` works in projects without
openspec, and payloads never carry `resolved_change_name`.

The coordinator runs the mechanical stages itself (preflight, conflict
detection, the test run, the collision check, closure) and dispatches you at
the first **judgment point**: a conflict to resolve or decision records in
collision to renumber. You are the judgment session: you saw none of the
earlier stages, so the task disclosure hands you their complete state.

The coordinator holds invocation-scoped values outside `arguments_value` and
hands them over in the task disclosure:

- `fast_track_active` — declared at dispatch;
- the **merge provenance** — the complete receipt, defined in
  `instructions.md` § Merge provenance;
- `working_language` — selected at the first conflict and kept for every later
  explanation, revision, test correction, and new conflict. A run dispatched
  for a collision alone never receives it;
- the conflict snapshot — the affected inventory with categories, region ids,
  and the record reference/hash that `bundle` and `write` take.

## Reads

The read list is exactly the three fetches above, plus the disclosed active
stage and repository content it needs (conflicted files, governing rules, ADR/DDR records and
indexes of an affected group). The other merge cards (`coordinator.md`,
`coordinator-stages.md`, `presentation.md`, `lifecycle.md`) and the merge spec records belong to the
coordinator; `sai/policies/question-context.md` arrives through worker-core.
The active stage may also require the code-quality policy before authoring code.
A read-only check with a definitive answer runs once while its dependencies
remain valid, including across stretches. Use the mechanical receipt rather
than deriving its facts again; repeat only invalidated checks.

## Lifecycle

The phase declares no progress plan: emit no progress events and no design
notice. Every stretch opens with `event: ready` before any expensive work. A
write or fix that exposes a new conflict returns the declared nonterminal
`event: conflict_detected` extension from worker-core with
`continuation_state: strategy-analysis`, carrying no question or
options. Every stretch closes with exactly one terminal status — `completed`,
`needs_input`, `failed`, or `cancelled` — in the closed worker-core shapes,
with an ordered duplicate-free `changed_files` and a concrete summary, in
English until a `working_language` is selected and in that language afterwards.
Pinned questions and stop texts stay verbatim.

## Procedure

Follow the coordinator's `Active stage:` pointer through the `merge.js`
disclosure command. Your stages are `strategy`, `apply`, and the two
conditional entries `test-correction` and `renumbering-plan`. The selected
sections of `instructions.md` own the strategy gate question, its option
list, every analysis rule, the payload shape, and the renumbering procedure.
The strategy gate leaves as a `needs_input` result; the coordinator's
presentation seam owns how every prompt reaches the user. End each task at
its hand-off and await the next pointer; do not read or execute future
sections. Reuse retained semantic analysis when its evidence
is still valid, updating it only for new context or changed state.

The first task, every continuation, and a replacement must include the active stage, exact references
and hashes, complete affected inventory and necessary valid receipts,
provenance, working language, exact strategy and its confirmation state,
verification/review counters and outcomes, collision plans, pending corrections,
operation outcomes, and changed-files union, as applicable to that stage.
Inventories are exhaustive: no `and others; see earlier` entries. On incomplete
reconstruction, stop before writing or finalizing and return the precise missing
state. A replacement verifies external references and receipt validity before
using them; it never assumes prior context is available. The first task
and a replacement arrive with the `--reconstruct` form of the pointer, which
adds the common evidence rules, the side mapping, and the provenance
definition.

## Write boundary

Your writes are resolved text handed to `merge.js write`, which places it in
the working tree and preserves each file's encoding, BOM, and line endings:

- after normal-mode `apply-strategy` or the coordinator's fast-track
  presentation-and-application continuation, the region text of each `authored` file from the
  confirmed resolution payload;
- the test corrections the coordinator authorizes, for its captured
  correction ranges;
- the named divergence corrections from the coordinator's post-resolution
  review.

Report every path the tool wrote in `changed_files`. The renumbering plan is
read-only: it returns the rename plan, and the coordinator applies it.

## Git

Run only read-only git commands (`status`, `rev-parse`, `branch`, `diff`,
`show`, `log`, `ls-files`, `merge-base`, `cat-file`). NEVER run a state-changing git
command — `merge`, `rebase`, `add`, `commit`, `checkout`, `stash`, `reset`,
`mv`, or any other — and never rename a file: the integration launch, squash,
checkouts, renames, collision replacements, staging, rebase continuation, and
commits belong to the coordinator.

Branch selection, refresh, and validation finished before you were dispatched.
Never run
`git fetch --prune origin`, `git check-ref-format`, or `git show-ref`. The
test run is the coordinator's too: read its failure record instead of running
the suite.
