> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The three-attempt coordinator budget delivered in `recovery-cause-locus-by-ownership` did not bind. Two loopholes let an unattended apply Step evade it:

- The coordinator branch of `recovery-ledger@1` carried no diagnosis key, so a repeated diagnosis spent an attempt instead of costing zero, and a sterile retry loop consumed the cap it exists to enforce.
- Nothing distinguished entering a Step from re-entering one. The reset is what grants the budget, and the reset was unguarded, so a Step re-entered after a correction or a route retry drew a fresh cap — the budget was bounded by its reset, not by its number.

Two further gaps made a long unattended run unauditable: an exhaustion did not say which budget ran out or what each had spent, forcing the coordinator to recall tallies from conversation state that a three-hour run loses; and the autonomous-correction trace was promised in prose with no pinned format and no declared coverage.

## What Changes

- `sai-state/machines/recovery-ledger.js` — the coordinator-attempt branch now normalizes and compares a diagnosis key exactly as the worker branch does. A key already attempted at coordinator level in the scope returns `rejected: duplicate diagnosis` and spends zero; an attempt with no concrete key returns `rejected: unresolved cause` and spends zero. A new `coordinator_ledger` array holds the normalized coordinator keys.
- `sai-state/machines/recovery-ledger.js` — a new `step-entry` signal replaces the unguarded reset for Step-executing adapters. The machine tracks `entered_steps`; a first entry clears both budgets and answers `step_entry: first`, a re-entry keeps the spent worker slots and coordinator attempts and answers `step_entry: re-entry`, and an entry with no usable Step identifier fails closed with `step_entry: unidentified` and grants nothing.
- `sai-state/machines/recovery-ledger.js` — every outcome, including the read-only projection, now carries `budgets` as `{worker: {spent, limit}, coordinator: {spent, limit}}`, and an exhaustion additionally carries `exhausted` as `worker` or `coordinator`.
- `bin/sai-state.js` — a closed set of machine-authored observability fields (`budgets`, `exhausted`, `step_entry`) is carried verbatim onto the emit wire, into the persisted merged wire, and into the stored `lastOutcome`.
- `sai/policies/bounded-recovery.md` — the shared policy records the Step-guarded entry (the bare `reset` remains the segment-boundary form for adapters that execute no Steps), extends the duplicate rule to the coordinator's own budget, and states that `attempts_spent` is read from the machine response rather than recalled from conversation.
- `sai/commands/apply/coordinator.md` — the Step-scoped budgets rung, the stopping-reasons bullet, and the autonomous-correction trace bullet are rewritten to match: the `{kind: step-entry, step: "Step N"}` signal, the required `{kind: coordinator-attempt, key: [...]}` tuple, the store-sourced tallies, and a pinned trace line `> Autonomous correction: Step <N> | <rung> | key <path> :: <point> :: <boundary> | <budget> <ordinal> of 3 | <outcome>` with declared rung vocabulary, zero-cost coverage, close-time reporting in every closure, and `> Autonomous corrections: none` for an empty trace.
- `test/recovery-ledger-machine.test.js` and `test/apply-coordinator-verification.test.js` — coverage for coordinator duplicates and normalization, keyless attempts, first entry versus re-entry, unidentified Step entries, both budget tallies, the named exhausted budget, and the CLI wire carrying all three observability fields.

No new budget, counter, or machine is introduced, the cap remains three, and worker scope is untouched: `green-worker.md` and `red-worker.md` are not modified.

## Capabilities

### New Capabilities

None. This change adds no capability directory; it closes evasion routes in two capabilities already published.

### Modified Capabilities

- `bounded-worker-recovery` — the recovery-scope entry becomes Step-guarded, the coordinator budget gains key-based duplicate rejection and an unresolved-cause branch, and the machine's response becomes self-describing with per-budget tallies and a named exhausted budget carried onto the emit wire.
- `apply-coordinator-verification` — the apply coordinator grants Step budgets through the `step-entry` signal instead of the bare reset, carries a concrete diagnosis key on every coordinator attempt, reads escalation tallies from the store response, and emits an autonomous-correction trace in a pinned format with declared coverage.

## Impact

Modified files:

- `sai-state/machines/recovery-ledger.js`
- `bin/sai-state.js`
- `sai/policies/bounded-recovery.md`
- `sai/commands/apply/coordinator.md`
- `test/recovery-ledger-machine.test.js`
- `test/apply-coordinator-verification.test.js`

New files: none.

Behavioral consequences:

- The coordinator must derive a concrete diagnosis key before every attempt, including before a delegation.
- A re-entered Step inherits a partly spent budget, so a genuinely new problem discovered on re-entry may escalate sooner.
- Because delegating spends coordinator budget, a Step whose coordinator budget is exhausted stops even when worker slots remain.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
