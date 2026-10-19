# ADR 0192: Apply recovery is disclosed on failure, and the Coverage Signature is an invariant

<!-- adr-index: amends 0161a; refs 0160a, 0172c -->

## Status

Accepted

## Context

The `/sai-4-apply` coordinator card carried the whole recovery procedure, the exhausted-Step choice, the unblock ladder, and a seven-field Coverage Signature comparison, and loaded all of it on every run although only a failing Step uses it. Much of it restated rules that `recovery-ledger@1`, `apply-step.js`, or `sai/policies/bounded-recovery.md` already enforce or define. ADR 0161a mandated the seven-field comparison, yet no tool implements it: the comparison is prose the coordinator judges, so the field list adds length without adding a check.

## Decision

1. Apply recovery moves behind failure-triggered pointers, the way veto override, plan amendment, and the terminal lifecycle already are: `sai/commands/apply/steps/recovery.md` for a failed `apply-step.js verify` or a non-clean worker result, and `sai/commands/apply/steps/exhausted-step.md` for a budget the ledger reports exhausted. The card keeps the Step-entry signal, the pointers, the write boundary, and the autonomous-correction trace, which hold on every run.
2. Recovery is written as a goal, its invariants, and one completion criterion. Budgets, key normalization, and rejections belong to the ledger; diagnosis, Cause Locus, and eligibility belong to the bounded-recovery policy. A sentence is deleted only when a tool, the ledger, or the policy already owns its rule.
3. The Coverage Signature is defined as one invariant: the verification's commands, paths, selectors, assertion operators and targets, and expected observations stay identical, and exactly one producer reference moves from the impossible later-Step point to an existing current-Step point. ADR 0161a's seven-field tuple list is retired as a procedure; its decision to allow one bounded plan-artifact repair stands.
4. Apply declares one exception to the policy's no-replacement rule: a GREEN-only Step whose cause lies in a test dispatches a fresh RED worker. The policy admits a phase-declared exception in one sentence.
5. The last-resort scaffolding repair no longer lists `unrecoverable` as a trigger. A true veto stops the Step and only the user lifts it; a veto the coordinator's evidence disproves stays recovery-eligible.

## Alternatives Considered

- **Trim the recovery section in place** — rejected: a run without failures would still load it.
- **Mechanize the Coverage Signature comparison in `apply-step.js`** — deferred to a separate issue; it would make the one coordinator write that can weaken a verification mechanically checked.
- **Let the coordinator lift a worker veto on its own evaluation** — rejected: the user keeps the lift.

## Consequences

- A run with no failure no longer loads recovery text; the pointer conditions are tool and ledger outputs, so a missed load is limited to an unobserved failure.
- The Coverage Signature check keeps depending on coordinator judgment.
- A cause inside a test file the plan does not name and the RED contract does not allow still stops for the user.
- ADR 0161a keeps its historical text; this record is the current statement of the Coverage Signature.

## Related

- `docs/adr/0161a-bounded-plan-artifact-repair-coverage-signature.md` — the amended record
- `docs/adr/0160a-known-false-report-recovery-branches-by-locus.md` — locus routing, unchanged
- `sai/commands/apply/steps/recovery.md`, `sai/commands/apply/steps/exhausted-step.md` — the disclosed files
- `sai/policies/bounded-recovery.md` — the shared policy

## Evidence

Equivalence is argued sentence by sentence; no runtime comparison was run.

Size before and after:

| File | Lines | Bytes |
|---|---|---|
| `sai/commands/apply/coordinator.md` before | 167 | 33779 |
| `sai/commands/apply/coordinator.md` after | 121 | 22273 |
| `sai/commands/apply/steps/recovery.md` (new, loaded on failure) | 45 | 7235 |
| `sai/commands/apply/steps/exhausted-step.md` (new, loaded on exhaustion) | 16 | 3541 |

A run with no failure loads only the shorter card.

Removed or reduced rules and where each stays enforced or defined:

| Removed or reduced rule | Still enforced or defined by |
|---|---|
| Numbered description of what `verify` does: sweep, Step-check run order, second sweep, `git status` comparison, RED versus GREEN item gating | `sai/tools/apply-step.js verify`, tested in `test/apply-step-tool.test.js` |
| Sweep internals: parent removal condition, the `> Scratch cleanup: removed ...` line forms, the empty sweep printing nothing | `apply-step.js` sweep and its `sweep.lines` return, pinned in `test/apply-step-tool.test.js` |
| Swept paths excluded from the plan cross-check, the `Subagent ↔ git` comparison, and line totals | `apply-step.js verify` and `close` comparisons; the card keeps the union and add-list exclusion |
| Tallies read from the ledger response, never from memory | `sai/policies/bounded-recovery.md` § Recovery scope and ledger; `recovery.md` states the no-response stop |
| One shared pool of three worker attempts per Step, never doubled per source | `sai-state/machines/recovery-ledger.js` and the policy; `recovery.md` keeps the one-pool statement without figures |
| Budget grant on a Step's first entry only; `re-entry` keeps spend; `unidentified` grants nothing | `recovery-ledger.js` step-entry handling and the policy § Recovery scope and ledger |
| Diagnosis key normalization, `rejected: duplicate diagnosis`, `rejected: unresolved cause` | `recovery-ledger.js` (asserted in `test/apply-coordinator-verification.test.js`) |
| An eligible diagnosis continues the same worker and never dispatches a fresh or replacement worker | Policy § Recovery attempt; the policy admits a phase-declared exception, and `recovery.md` declares apply's fresh RED |
| A cause in a test file belongs to its RED owner and never goes to GREEN | Policy § Diagnosis, Cause Locus (`owner-in-run`); `recovery.md` cites it |
| Exhaustion stops the attempt and names the Step, the diagnosis, and the spend on each budget | Ledger `exhausted` and `budgets` fields, policy § Hand-back and reporting, and `exhausted-step.md` |
| Hand-back report fields in the human override clause | Policy § Hand-back and reporting |
| Five `####` headings of the continuation payload | Policy § Recovery attempt names the five fields; `recovery.md` keeps their order and the no-raw-output rule |
| The four fixed definitions and example phrases of the exhausted-Step message | Removed with no replacement text; `exhausted-step.md` requires the message to define its own terms, and a free-text reply authorizes nothing |
| Seven-field Coverage Signature tuple procedure | Reduced to an invariant in `recovery.md`; no tool implements the comparison, so it stays coordinator judgment |
| `unrecoverable` as a trigger of the last-resort scaffolding repair | Removed; a true veto stops the Step via `steps/veto-override.md`, a false veto stays recovery-eligible |
| Trace line format and field meanings in the card | Moved to `recovery.md`; the card keeps the print-at-run-close rule and the `> Autonomous corrections: none` literal |

Rules that only prose sustains stay explicit: the write boundary, the fresh-RED exception, the delegation attempt cost, the plan-artifact repair limits, the scaffolding repair limits, the enumerated stops, and the exhausted-Step picker literals.
