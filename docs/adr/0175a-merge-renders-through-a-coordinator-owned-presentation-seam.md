# ADR 0175: Merge renders user-facing output through a coordinator-owned presentation seam

<!-- adr-index: refs 0075; refs 0083; refs 0086 -->

## Status

Accepted

## Context

`sai-merge` routes a read-only worker (pre-merge checks, branch selection,
conflict analysis, resolution proposals, scope gate, verification analysis,
ADR/DDR collision scanning) behind a coordinator that owns every mutation.
Today the coordinator forwards the worker's payloads verbatim: gate questions
go straight to the native picker and the terminal prints the worker-authored
summary unchanged. Planned merge-only presentation improvements — scope
options filtered to conflict categories that actually apply, a compact
authorization summary instead of a second full-file dump, and possibly a
progress surface — cannot be made by rewording worker payloads without
dragging presentation choices back into the read-only worker contract.

The implementation landed as a preparatory, behavior-preserving slice: an
active `legacy` renderer, no new user-visible output, no selector redesign,
and no visible TODO. The decision to record is where presentation
responsibility lives, because that placement is expensive to undo once the
worker contract and the coordinator card have both grown around it.

## Decision

Introduce a coordinator-owned presentation seam for `sai-merge`, installed at
`sai/commands/merge/presentation.md` and fetched by the coordinator card. The
seam separates three coordinator-local values and keeps them apart:

1. **Worker source** — the validated closed-payload result (worker-authored
   `summary` and, for `needs_input`, its exact `question` and ordered
   `options`), retained without rewording or reinterpretation;
2. **Merge presentation state** — coordinator lifecycle state derived only
   from worker results and coordinator operation outcomes, updated solely at
   named lifecycle boundaries (`preflight`, `branch-selection`,
   `merge-outcome`, `scope-selection`, `resolution`, `verification`,
   `adr-ddr`, `authorization`, `terminal`);
3. **Mutation outcome** — the result of a coordinator-owned merge, resolution
   write, staging operation, ADR/DDR rename or reference update, or commit.

Rendering runs through three coordinator-local operations —
`render_gate(worker_source, presentation_state)`,
`render_progress(presentation_state)`, and
`render_terminal(worker_source, presentation_state)` — named responsibilities,
not a new runtime protocol. The seam may render the first two values and
report the third; it never dispatches or continues the worker, selects an
answer, authorizes a mutation, runs git, writes a resolution file, renames a
record, or updates a reference.

The seam preserves the existing contract exactly: gate semantics, option
values and order, and continuation order are unchanged; the three-round
verification budget keeps cap-exhaustion staged and uncommitted;
worker-authored summaries and timestamps are forwarded verbatim and never
re-clocked; `Merge done.` still prints only when the authorized commit
actually executed; mutation ownership is unchanged. Gate asks append only
`{question, options, answer_value}` to the opaque input history; presentation
state never becomes an envelope field. For ADR/DDR renames, the worker now
returns the exact old/new H1 and old/new index labels as part of its read-only
collision pass, and the coordinator records them before executing `git mv`
instead of rereading artifacts — keeping filename, H1, and index label from
drifting apart.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Keep forwarding worker payloads directly | Zero new machinery; today's verbatim behavior by construction | Presentation choices stay implicit in worker payload text; every future UX change edits the worker contract and every forwarding site, risking drift between source and rendered output |
| Ad-hoc formatting inside each gate handler | Small local edits per gate | State derivation duplicated across five gates plus the terminal path; consistent verification-round and refusal semantics become incidental rather than guaranteed |
| Speculative generic cross-command UI framework | One renderer for all phases | A single consumer today; couples other phases' gate surfaces to merge lifecycle state before any second consumer exists; extraction can wait until a real second consumer emerges |

## Consequences

- The slice is behavior-preserving: the `legacy` renderer presents existing
  questions, ordered options, and worker context without rewording or
  filtering; `eligible_scope_options` and `compact_authorization_summary`
  are recorded but not activated.
- Future merge-only presentation changes consume the same state after the
  relevant boundary instead of re-editing worker payloads or individual gate
  handlers; the scope renderer must not show options that cannot apply to any
  detected conflict category, and the authorization renderer uses the compact
  summary instead of a full-file dump.
- The installed seam asset stays outside the changed-files union and final
  staging set; a repository-local copy joins the merge only after the
  coordinator independently verifies its existence and target-repository
  ownership.
- Progress rendering stays absent: the adapter declares no `progress_plan`,
  no TODO appears before branch selection, clean merges create no pending
  conflict work, and progress state never authorizes any operation.

## Provenance

User — retroactive ADR for the staged `merge-ux-presentation-seam`
implementation (`sai/commands/merge/coordinator.md`,
`sai/commands/merge/instructions.md`,
`sai/commands/merge/presentation.md`, `sai/commands/merge/worker.md`).

## Related

- `sai/commands/merge/presentation.md` — the seam contract recorded here
- ADR 0075 — Normalized invocation envelope and lifecycle payload (worker
  source remains inside closed payloads)
- ADR 0083 — Extract shared coordinator mechanics through phase adapters
  (the seam deliberately stays merge-local instead of joining the shared core)
- ADR 0086 — Separate worker write journals from the coordinator changed-file
  union (union population rules extended for the seam asset)
