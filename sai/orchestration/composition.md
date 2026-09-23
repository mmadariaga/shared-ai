# Chained Phase Composition

A composition coordinator follows this contract on top of
`@sai/orchestration/command-runner.md`: one invocation executes an ordered
sequence of phase adapters, each through the runner's Result Loop. Composition
obeys exactly three rules:

1. **Ordered multi-adapter invocation** — A single supervising invocation MAY
   declare an ordered sequence of phase adapters as an indexable list and SHALL
   execute them strictly in list order through this Result Loop. The composition
   retains a zero-based position into that list. Activating a segment SHALL
   rebind that segment's adapter fields (including that segment's
   `progress_plan`, `step_machine`, and `recovery_policy`
   when declared); recovery-ledger creation, scoping, and non-inheritance across
   segments follow `@sai/policies/bounded-recovery.md`. The invocation-scoped
   changed-files union SHALL continue across segment activations in first-seen
   order and SHALL NOT reset at a transition. Intra-segment multi-dispatch
   behavior a phase already owns (for example apply's per-dispatch plan
   selection) remains phase-owned inside the active segment and is not a second
   composition axis.

2. **Non-final terminal navigation resolves to transition** — When a non-final
   phase adapter (position `i` where `i + 1` is still in range) reaches an
   adapter-authorized successful phase completion, its `terminal_navigation`
   SHALL resolve to the composition's authorized transition rather than to that
   phase's standalone pinned completion literal or run-ending stop. The
   authorized transition SHALL name exactly the successor at position `i + 1` and
   that successor's `original_envelope` values the composition authorizes for the
   next segment (including any composition-injected session signals such as
   apply's fast-track boolean). The shared contract SHALL activate only that
   consecutive successor with that envelope. It SHALL NOT skip ahead to a later
   list entry. Only the final adapter's `terminal_navigation` (or the sole
   adapter in a one-adapter invocation) SHALL emit the user-facing
   invocation-closing completion presentation on a successful run. `failed`,
   `cancelled`, malformed worker terminal payloads, and malformed transitions
   SHALL close the supervising invocation without advancing.
   The runner must not infer the next phase or successor from worker summaries,
   artifacts, or `changed_files` text; only the authorized transition names the
   successor.

3. **Chained Isolation Mode does not reset supervisor state** — Entering a
   chained phase adapter's Isolation Mode preamble SHALL isolate that phase's
   worker-facing input as the phase already requires and SHALL NOT clear
   supervisor session state retained by the supervising invocation (including the
   resolved change identity, composition position, invocation-scoped
   changed-files union, and other supervisor-owned session signals the
   composition carries). Worker isolation and supervisor continuity remain
   distinct.

A transition is malformed when it omits the successor identity, names any adapter
other than position `i + 1`, omits an envelope field the successor adapter's
contract requires for dispatch, or duplicates a segment already completed in this
invocation. Handoff of supervisor-retained state is by continuity of the
supervising invocation — not by copying artifact bodies into the transition. The
composition constructs each successor's `original_envelope` directly; it does not
invoke a harness boot adapter or wrapper to produce that envelope. For a chained
apply segment the composition-authorized envelope SHALL carry exactly:
`command_name` set to the apply command identity (it is not a routing or
card-selection input on the chained path — the composition already selected the
apply adapter), and `arguments_value` set to the already-resolved change name.
Worker dispatch inside the apply segment uses the runner's `arguments_value`
worker envelope. Apply's normalized fast-track boolean and other
supervisor-retained session signals are set by the composition as session state
for that segment and are not required to appear as additional envelope keys.

Composition does not authorize explore-supervisor semantics (selector gates,
chat-scoped autonomy, or explore's inline item-10 transition) as the default
composition pattern. A composition with a single phase adapter behaves exactly
as an ordinary one-phase invocation, unchanged.
