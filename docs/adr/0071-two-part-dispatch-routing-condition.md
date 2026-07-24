# ADR 0071: Two-part dispatch-routing condition (RED block AND Step Contract)

## Status

Accepted

Supersedes the routing rule of `docs/adr/0024-split-only-testable-steps.md`.

## Context

`sai-4-apply` chose its dispatch count from a one-part signal: a Step whose body contains a `##### RED phase` block was "testable" and got two ordered dispatches (a blind test-writer, then an implementation dispatch); a Step without one got a single dispatch (ADR 0024). That made "has a RED block" and "gets two dispatches" synonyms, which stranded three rules in the same file:

- the single dispatch's *RED → GREEN handling* block, written for a single dispatch that runs RED — unreachable, because every RED-carrying Step routed to two dispatches;
- the report contract's claim that a single-dispatch Step carries real values in both the RED and GREEN fields — impossible for a Step with no RED;
- `sai/instructions/implement.md`'s promise that when `interfaces.md` is absent, `sai-4-apply` expands scenario descriptions into full test assertions during RED — a plan shape (RED block, no contract) the one-part rule handed to a blind test-writer whose prompt is assembled from an `interfaces.md` `## Step N` section that does not exist.

The blind test-writer's prompt is built from that `## Step N` section; with no section there is nothing to make the writer blind *to*, so the dispatch cannot be assembled at all.

## Decision

Route each Step by a **two-part condition**. The two-dispatch flow (test-writer, then implementation) is selected **if and only if both** parts hold; failing **either** part routes the Step to a single dispatch:

1. the Step's body contains a `##### RED phase` block, **and**
2. a **Step Contract** is available for that Step — `interfaces.md` exists for the change and has a `## Step N` section whose integer `N` matches the Step's `implementation.md` `## Step N` heading.

Part 2 is evaluated **per Step**, not as a test of whether `interfaces.md` merely exists. A Step satisfying both parts is a **Split-Routed Step**; every other Step, including a RED-carrying Step whose contract is unavailable, keeps the single-dispatch flow, whose *RED → GREEN handling* block is thereby reachable rather than dead text.

The Step-N key-integrity guard splits by outcome: an **ambiguous** match (several `## Step N` for the same `N`) STOPs the run, because the coordinator would have to guess which contract to inject; an **absent** match does NOT STOP — it is a routing input, and the coordinator prints one non-blocking trace line naming the Step and reason before dispatching a single subagent.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Two-part condition, rename sections by routing outcome (chosen) | Reconciles the signal with the three stranded rules; keeps `implement.md`'s promise true; the vocabulary already committed in `GLOSSARY.md` | The routing condition no longer states in one sentence |
| Keep headings, patch only the signal sentence | Cheapest edit | Leaves a section named "Non-testable Step dispatch" as the destination for RED-carrying Steps — the exact conflation, in the most load-bearing position |
| Delete the single dispatch's RED → GREEN handling and set field 3 to `n/a` | Simpler table | Removes the only path for a RED block with no contract; silently breaks `implement.md`'s absent-`interfaces.md` promise |
| Make `interfaces.md` mandatory for every RED-carrying Step | Uniform | Larger blast radius; constrains `/sai-2-design`'s omission rule and contradicts `implement.md` rather than reconciling with it |

## Consequences

- Backward compatible: a Step with a RED block and a matching contract keeps routing to two dispatches; a Step with no RED block keeps routing to one. Only the previously-unreachable third shape (RED block, no contract) changes — from "crash the test-writer with an empty contract" to "run as a single dispatch".
- **Absence has two shapes.** *Whole-file absence* (`interfaces.md` does not exist) is legitimate and supported — the plan shape `implement.md` anticipates and what an externally authored or partially generated plan produces. *Per-Step absence* (`interfaces.md` exists but omits that `## Step N`) is, for a RED-carrying Step, a probable desync and never a legitimate omission, because `/sai-2-design` cannot omit a `## Step N` for a Step that has a testable assertion; the reachable cause is an orphan Step preserved byte-for-byte in `implementation.md` across a re-run that regenerated `interfaces.md` wholesale.
- **Why absence routes rather than STOPs (proportionality).** The single dispatch executes the Step correctly regardless — it authors the test from the Step's own scenario descriptions and runs RED → GREEN — so a STOP would abort a run that was going to succeed in order to report a fault one printed line reports for free. The trace line is therefore the entire detection mechanism for the desync shape. This replaces the withdrawn "absence is indistinguishable from a legitimate omission" justification, which was wrong for the per-Step shape.
- **Reversal path.** If the trace line proves too easy to miss in practice, reverse toward *STOP on per-Step absence, route on whole-file absence* — halt on exactly the shape that indicates a fault while keeping the documented whole-file plan shape runnable.
- Sibling rules keyed on the conflation (telemetry row counts, dispatch counts and prompt contents, the pre-commit add-list union) are re-keyed to dispatch routing in the same change; `apply-telemetry-containment` keeps stale vocabulary deliberately, its label narrowing no rule.

## Related

- `docs/adr/0024-split-only-testable-steps.md` — superseded routing rule (single-part testability signal); not modified.
- `docs/adr/0064-instruction-only-steps-classified-non-testable.md` — instruction-only Steps are single-dispatch with no RED block.
- `sai/instructions/apply.md` — `## Step-Execution Subagent Dispatch`, `## Subagent Report Contract`.
- `sai/instructions/implement.md` — the absent-`interfaces.md` RED-expansion promise this condition keeps true.
- `openspec/changes/reconcile-apply-testability-routing/` — proposal, design (D1–D6), and the five capability deltas.
