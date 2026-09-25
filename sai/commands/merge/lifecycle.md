# Merge Lifecycle Validation Seam

The coordinator-owned state machine of `sai-merge`: the lifecycle states, the
permitted transitions, and the check the coordinator runs before selecting each
next operation. It is harness-neutral and read-only toward the worker: it
dispatches nothing, answers nothing, and runs no git.

## States

| state | holds when |
| --- | --- |
| `preflight` | environment checks run; no integration started |
| `method-selection` | the method (`merge` / `rebase` / `rebase-squash`) is chosen |
| `branch-selection` | the listed-branch or text-entry route is selected; no integration has launched |
| `branch-validation` | a free-text branch entry is being refreshed and checked as an exact branch ref; no integration has launched |
| `merge-outcome` | the coordinator ran a launch or a `git rebase --continue` and recorded the outcome |
| `language-selection` | the first conflict is detected; the working language is being chosen |
| `scope-selection` | the conflict scope is being chosen |
| `contextual-analysis` | the global strategy is being analyzed, revised, or confirmed |
| `resolution` | the confirmed resolution is being written, reviewed, and staged |
| `verification` | the suite runs within its three-round budget |
| `adr-ddr` | the collision pass runs on the final integration state, or is skipped |
| `authorization` | the finalization question is pending or answered |
| `terminal` | the run is closed and its final state recorded |

The usual paths:

```text
merge, clean:        preflight → method → branch → merge-outcome → adr-ddr → authorization → terminal
merge, free-text:    … → branch → branch-validation → merge-outcome → adr-ddr → authorization → terminal
merge, conflicted:   … → merge-outcome → language → scope → contextual-analysis → resolution
                       → verification → adr-ddr → authorization → terminal
rebase, per stop:    … → merge-outcome → [language → scope →] contextual-analysis → resolution
                       → verification → authorization → merge-outcome (git rebase --continue)
rebase, finished:    merge-outcome → adr-ddr → [authorization →] terminal
```

## Transition check

Before each operation the coordinator evaluates:

```text
validate_transition(current_state, target_state, operation_context) → valid | invalid
```

`operation_context` is the coordinator-owned state the precondition reads
(outcome, method, language, strategy status, verification result, staged
paths). A transition is `valid` only when its row below exists and its
precondition holds. On `invalid`, halt before the operation: no mutation, no
dispatch, no presentation update; report the current state, the target state,
and the violated precondition as ordinary text.

A batch checks each boundary it covers in item order within its one trip:
Batch 1 covers `preflight` → `method-selection` → `branch-selection`
(fast-track: `preflight` → `branch-selection`). Choosing the branch-entry
sentinel keeps the route in `branch-selection` while the coordinator collects
the exact text; it then enters `branch-validation`. Batch 2 covers
`language-selection` → `scope-selection`. An abandoned batch makes no
transition.

## Permitted transitions

```text
current_state         target_state          precondition
───────────────────────────────────────────────────────────────────────────────
preflight             method-selection      environment checks passed
preflight             branch-selection      environment checks passed; fast_track_active pins method=merge
method-selection      branch-selection      method stored (merge | rebase | rebase-squash)
branch-selection      branch-selection      entry sentinel selected; dirty answer is not no; open branch-entry prompt only
branch-selection      branch-validation     branch-entry text received; method and squash resolved
branch-selection      merge-outcome         listed local branch selected; provenance captured; no fetch; method and squash resolved
branch-selection      terminal              listed local ref no longer resolves; worker returned a closing result; no fetch or integration
branch-validation     merge-outcome         fetch succeeded; exact ref resolves to a commit; provenance captured; method and squash resolved
branch-validation     terminal              fetch failed or exact ref is unusable; worker returned a closing result; no integration started
merge-outcome         adr-ddr               outcome clean (merge stopped before commit, or rebase finished)
merge-outcome         language-selection    outcome conflicted; working_language unresolved
merge-outcome         contextual-analysis   outcome conflicted; working_language already selected
language-selection    scope-selection       working_language is a non-empty token
scope-selection       contextual-analysis   selected_scope is eligible, or fast_track_active supplies full
contextual-analysis   resolution            strategy_status = confirmed; completed payload validated
resolution            contextual-analysis   a write or review exposed a new conflict (strategy-analysis event)
resolution            verification          review passed; resolution staged
verification          contextual-analysis   a fix or run exposed a new conflict (strategy-analysis event)
verification          adr-ddr               method=merge; verification_result ∈ {passed, cap-exhausted}
verification          authorization         rebase stopped; verification_result ∈ {passed, cap-exhausted}
adr-ddr               authorization         applicability resolved; repairs applied; final staging done;
                                            a merge in progress, or a finished rebase with staged repair
adr-ddr               terminal              rebase finished with nothing staged
authorization         merge-outcome         rebase stopped; answer yes; git rebase --continue ran
authorization         terminal              answer recorded: committed or refused
<any>                 terminal              the worker returned a closing result (in-progress guard,
                                            dirty=no, branch-resolution failure, decline-strategy, no-suite=no,
                                            review budget exhausted)
```

`verification_result` is `passed` also when the user continued past the
no-suite question. A clean integration never passes through `verification`.

`commit_executed` is true when the run ends finalized: the merge commit
succeeded, or the rebase finished and its collision repair (if any) was
committed. Every other terminal leaves it false.
