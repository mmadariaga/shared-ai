# ADR 0183: Apply self-gating via standalone state machine

<!-- adr-index: refs 0172c -->

## Status

Accepted

## Context

ADR 0172c established step-gated instruction delivery for sai-1-spec: the coordinator names the active step in each continuation payload, and the worker fetches only the named step file. That pattern routes through the progress event, which the coordinator sends as an additive nonterminal result: the worker reports completion of declared steps, the coordinator marks them and resumes the same worker with a pointer to the next step.

The apply phase has a different structure. Apply dispatches independent RED, GREEN, or green-exception workers for each step — a clean dispatch boundary at each step — rather than a single long-running worker that reports progress. The step dispatch loop itself is not a worker's responsibility; it lives entirely in the coordinator. And critically, apply's Step loop declares no progress protocol: no `progress_plan` declaration, no progress event, no progress payload, and no acknowledgement (per coordinator.md § Run-Start Step Projection). The pause/resume carrier that 0172c leverages does not exist in apply.

This creates a choice: apply could extend itself to declare and use a progress plan (following 0172c's pattern), or it could adopt the explore self-gating precedent (`explore-idea@1` / `explore-slice@1`), where a stateless session machine owns the cursor and the coordinator consults it per emit → next.follow → fetch without a nonterminal event. The machine is spawned once per session, seeded from durable state, and drives itself through the coordinator's direct calls—not through worker continuations.

The key difference is the deriving party: in 0172c, the worker derives what it reports (and the coordinator consumes it); in explore, the coordinator derives the cursor from durable state and asks the machine to render the pointer. In apply, the cursor derives from checkbox state in `implementation.md` and is owned by the coordinator, not the worker. If a machine owns that cursor, its derivation must be a property of the machine itself, not a side effect of worker completion.

## Decision

1. Apply adopts the explore self-gating precedent for step-cursor management and routing-file delivery. A new `apply-standalone@1` state machine owns the Step cursor and routing mode and is spawned once per run at the harness-session-derived stable key.

2. The machine is seeded from the parsed `#### Step N:` headings and per-Step checkbox state via `{ recordedList: [...], recordedDone: [...] }`, implementing the derivation rule currently written as prose in coordinator.md § Run-Start Step Projection: a fully-marked Step is done, the first not-fully-marked is active, the remainder pending.

3. For each Step, the coordinator determines which of the five routing conditions (per runner.md § Step Routing Tree) the Step satisfies, emits `{ mode: <mode-name> }` to the machine, and fetches only the routing file named by the returned `next.follow` pointer. The machine does no file I/O; it provides deterministic routing only.

4. The machine is a run-scoped cursor: it is re-seeded at each spawn from the authoritative `implementation.md` file and is never carried across runs. On any divergence, the file wins.

5. No progress protocol is added to apply. The Step loop remains as specified: no `progress_plan`, no progress event, no progress payload.

6. On apply-standalone@1 store failure or unreachability, the coordinator falls back to loading every routing file in `sai/commands/apply/steps/` conditionally based on the five routing conditions, deriving the cursor inline from `implementation.md` and on-disk checkboxes without the machine, and completes the run at full context cost; only session state saving is lost.

## Alternatives Considered

- **Extending apply to declare a `progress_plan` and use 0172c's pattern** — rejected: it violates the explicit contract that "the Step loop introduces no progress protocol." Adding a progress plan, progress event, and progress payload would be a breaking change to apply's protocol surface and would couple apply to progress-event delivery when no progress event currently exists in apply's lifecycle. The coordinator would need to become a worker that reports progress, which inverts apply's structure (the coordinator orchestrates; workers do not drive the loop).

- **Letting the machine own Step completion** — rejected: `implementation.md` survives crashes, hand-edits, and new chats, while machine state does not. A machine that owns the cursor routes confidently to the wrong Step after any divergence between state and file. The file must remain authoritative, so the machine is a run-scoped cursor only, re-seeded at spawn.

- **Persisting the machine cursor across runs** — rejected for the same reason as above. Re-seeding at spawn is what keeps the file authoritative and ensures apply always restarts at the correct Step.

## Consequences

- The derivation rule from coordinator.md § Run-Start Step Projection (the prose "a Step whose checkboxes are fully marked `[x]` renders `completed`, the first not-fully-marked Step in plan order renders `in_progress`, and the remaining Steps render `pending`") is relocated from prose into the machine's `transition()` function and removed from the prose to eliminate duplication and drift risk.

- Each Step re-entry (e.g., after a retry or re-run) starts at the Step's entry stage; checkbox granularity carries no inner-stage information, so a partially-completed Step re-enters at the start of its routing, not at an intermediate position.

- A crashed Step re-dispatches its work (one repeated dispatch cost per crash), as oppose to resuming from an inner checkpoint.

- On coordinator-observable store failure (unavailability or malformed state), apply does not halt; it degrades gracefully and completes the run at full context cost.

## Related

- ADR 0172c — the rejected alternative pattern; apply's no-progress-protocol contract stays in place.
- `openspec/specs/sai-apply-standalone-state-machine/` — design and implementation details.
- `sai-state/machines/apply-standalone.js` — the machine implementation.
- `test/apply-standalone-machine.test.js` — comprehensive machine tests.
