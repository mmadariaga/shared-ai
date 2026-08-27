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
lifecycle violation — the current state, target state, and violated
precondition — without executing or selecting the operation. No mutation,
worker dispatch, or presentation update follows an `invalid` result.

## Allowed transitions and preconditions

The table below is the exhaustive set of permitted transitions. A transition
not listed is `invalid`. Each row names the precondition that
`operation_context` MUST satisfy; a missing or unsatisfied precondition is
`invalid`.

```text
current_state         target_state           precondition
─────────────────────────────────────────────────────────────────────
preflight             branch-selection       environment checks complete
branch-selection      merge-outcome          branch selected, merge provenance captured
merge-outcome         adr-ddr                merge_outcome = clean
merge-outcome         language-selection     merge_outcome = conflicted
language-selection    scope-selection        working_language resolved to a non-empty token;
                                             fast_track_active may satisfy scope implicitly
scope-selection       contextual-analysis    selected_scope is a non-empty eligible scope
                                             or fast_track_active supplies full scope
contextual-analysis   resolution             strategy confirmed (strategy_status = confirmed),
                                             complete resolution payload present and validated
resolution            verification           resolution writes complete, files staged
verification          adr-ddr                verification_result ∈ {passed, cap-exhausted}
adr-ddr               authorization          collision check complete or skipped,
                                             collision_applicability resolved
authorization         terminal               authorization_status ∈ {committed, refused, cleared}
adr-ddr               terminal               non-committing closure: authorization_status = cleared,
                                             commit_executed = false
```

### Precondition details

- **preflight → branch-selection**: `environment checks complete` — the
  dirty-worktree gate has passed and the branch list is available. No merge
  operation has started.
- **branch-selection → merge-outcome**: `branch selected, merge provenance
  captured` — a branch value is stored, and `target_sha`, `source_sha`,
  `merge_base`, and `source_introduced_adr_ddr_records` are captured before
  the merge launch.
- **merge-outcome → adr-ddr**: `merge_outcome = clean` — the merge completed
  without conflicts. The clean path skips every conflict-only state
  (language-selection, scope-selection, contextual-analysis, resolution,
  verification).
- **merge-outcome → language-selection**: `merge_outcome = conflicted` — the
  merge produced conflicts. The conflicted path MUST enter language-selection
  before any conflict analysis.
- **language-selection → scope-selection**: `working_language resolved` — the
  working-language question has been answered with a non-empty language
  token. Under fast-track, the scope item may be auto-selected, but the
  language gate is never bypassed.
- **scope-selection → contextual-analysis**: `selected_scope is non-empty` —
  a scope value has been selected or fast-track has supplied the full scope.
- **contextual-analysis → resolution**: `strategy confirmed, payload present`
  — the user has confirmed the current global strategy
  (`strategy_status = confirmed`) and the worker has returned a complete,
  validated resolution payload. A `more-context` or `revise-strategy` answer
  does not satisfy this precondition.
- **resolution → verification**: `resolution writes complete, files staged` —
  every validated resolution file has been written and staged.
- **verification → adr-ddr**: `verification_result ∈ {passed, cap-exhausted}`
  — the test suite has passed or the three-round budget is exhausted. A
  `pending` or `failed` result with remaining budget does not satisfy this
  precondition.
- **adr-ddr → authorization**: `collision check complete or skipped` — the
  incremental ADR/DDR collision scan has completed or been legitimately
  skipped, and `collision_applicability` is resolved to a final value.
- **authorization → terminal**: `authorization_status resolved` — the
  authorization gate has been answered (`committed`, `refused`, or `cleared`).
- **adr-ddr → terminal**: `non-committing closure` — the authorization step
  is explicitly cleared without a commit (`authorization_status = cleared`,
  `commit_executed = false`). This is the E5 non-committing terminal closure.

### Invalid transitions

Any transition not in the table above is `invalid`. The validator reports:

```text
{
  result: "invalid",
  current_state: <current>,
  target_state: <target>,
  violated_precondition: <description of the missing or unsatisfied condition>
}
```

The coordinator SHALL halt before selecting the operation, perform no
mutation, dispatch no worker, and render no presentation update for the
rejected transition.

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

## Deterministic enforcement

The seam enforces lifecycle ordering deterministically. The integration is:

- The state machine and transitions are defined.
- The validation contract is specified.
- The integration points are identified.
- The allowed-transition table and precondition checks replace the previous
  placeholder. Every transition is validated against the table before the
  coordinator selects the next operation; invalid transitions halt without
  executing the operation.

The seam ensures that safety-critical ordering does not depend on model
compliance alone. The coordinator invokes the validator at each integration
point and halts on `invalid` without selecting the operation, performing any
mutation, or updating presentation state for the rejected transition.

## Neutrality

The lifecycle seam is neutral for Claude Code and opencode. Both harnesses
use the same state definitions, transition rules, and validation contract.
Only the native presentation mechanism differs (task-list binding, question
mechanism). The seam does not introduce harness-specific logic or diverge
between the two supported harnesses.
