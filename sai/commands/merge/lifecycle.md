# Merge Lifecycle Validation Seam

This is the neutral executable boundary for merge coordinator lifecycle
validation. It defines the state machine, valid transitions, and the
integration point where lifecycle results can be validated before the next
merge operation is selected. This seam is harness-neutral and does not change
existing merge behavior; it creates one shared integration point for
deterministic lifecycle enforcement.

## Ownership and scope

The lifecycle seam is coordinator-owned and read-only with respect to worker
analysis. It does not dispatch, continue, or replace the worker; it does not
select answers, authorize mutations, run git, write resolutions, rename
records, or update references. Technical analysis remains the worker's
responsibility, and every mutation remains the coordinator's responsibility.

The seam provides:

1. **State definitions** — the closed set of lifecycle phases and their
   invariants.
2. **Transition rules** — the valid state transitions and their preconditions.
3. **Validation contract** — the integration point where the coordinator
   validates lifecycle results before selecting the next operation.

## Lifecycle states

The merge lifecycle progresses through these states in the defined order. Each
state has invariants that must hold before transitioning to the next state:

```text
preflight
  → branch-selection
    → merge-outcome
      → [clean path] → adr-ddr → authorization → terminal
      → [conflict path] → language-selection → scope-selection →
        contextual-analysis → resolution → verification →
        adr-ddr → authorization → terminal
```

State invariants:

- **preflight** — environment checks complete, no merge operation started.
- **branch-selection** — source branch selected, merge provenance captured.
- **merge-outcome** — merge executed, outcome recorded (clean or conflicted).
- **language-selection** — conflict detected, working language selected.
- **scope-selection** — conflict scope selected.
- **contextual-analysis** — semantic analysis in progress or complete.
- **resolution** — resolution writes complete, files staged.
- **verification** — test suite executed, verification round recorded.
- **adr-ddr** — incremental collision check complete or skipped.
- **authorization** — commit authorization pending or executed.
- **terminal** — lifecycle complete, final state recorded.

## Transition validation

Before selecting the next merge operation, the coordinator SHALL validate that
the transition from the current state to the target state is permitted by the
transition rules. The validation contract is:

```text
validate_transition(current_state, target_state, operation_context) → valid | invalid
```

Where:

- `current_state` — the current lifecycle phase.
- `target_state` — the phase the next operation would enter.
- `operation_context` — the coordinator-owned context for the operation
  (merge outcome, conflict state, verification round, etc.).

The validation returns `valid` when the transition is permitted and `invalid`
when it is not. An invalid transition SHALL halt the operation and report the
lifecycle violation without executing the operation.

## Integration point

The lifecycle validation seam integrates at these coordinator-owned boundaries:

1. **Before merge launch** — validate transition from `branch-selection` to
   `merge-outcome`.
2. **Before conflict analysis** — validate transition from `merge-outcome` to
   `language-selection` (conflicted path only).
3. **Before scope selection** — validate transition from `language-selection`
   to `scope-selection`.
4. **Before resolution writes** — validate transition from
   `contextual-analysis` to `resolution`.
5. **Before verification** — validate transition from `resolution` to
   `verification`.
6. **Before ADR/DDR check** — validate transition from `verification` (or
   `merge-outcome` for clean path) to `adr-ddr`.
7. **Before commit authorization** — validate transition from `adr-ddr` to
   `authorization`.
8. **Before terminal rendering** — validate transition from `authorization`
   (or `adr-ddr` for non-committing closure) to `terminal`.

The coordinator calls the validation function at each boundary before
selecting the next operation. The validation is deterministic and controlled
by coordinator code; the AI worker operates only as an analysis worker for
conflicts, facts, inferences, and strategies.

## Enabling refactor scope

This seam is an enabling refactor that creates the executable boundary without
implementing the full validation logic. The current integration is:

- The state machine and transitions are defined.
- The validation contract is specified.
- The integration points are identified.
- The validation function is a placeholder that returns `valid` for all
  transitions (preserving existing behavior).

Future work can replace the placeholder with deterministic validation logic
that enforces ordering, checks preconditions, and rejects invalid transitions.
The seam ensures that safety-critical ordering does not depend on model
compliance alone.

## Neutrality

The lifecycle seam is neutral for Claude Code and opencode. Both harnesses
use the same state definitions, transition rules, and validation contract.
Only the native presentation mechanism differs (task-list binding, question
mechanism). The seam does not introduce harness-specific logic or diverge
between the two supported harnesses.
