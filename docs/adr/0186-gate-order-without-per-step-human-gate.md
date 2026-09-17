# ADR 0186: Gate order after a Step worker report, without a per-Step human gate

## Status

Accepted

Supersedes [ADR 0019](./0019-coordinator-gate-ordering-after-subagent-report.md).

## Context

ADR 0019 fixed the post-report gate order as: coordinator verification → learnings → **Human Verification gate** → batched checkbox marking → STOP & COMMIT. The human gate sat between verification and marking because the checkbox set was undifferentiated: a Step's browser checks and its automated checks were marked together, so marking could not happen before a human had signed off on the browser checks.

Two things changed since. First, `sai/commands/apply/instructions.md` was deleted in commit `8892196f`; its numbered steps 3 and 4 owned the human gate and the batched checkbox write, and neither survived anywhere, so `/sai-4-apply` silently stopped marking checkboxes that `openspec/specs/apply/spec.md` still requires it to mark. Second, apply gained a terminal functional review that empirically re-exercises exactly the checks the human gate used to guard, after the Step loop and before the Final sweep.

The repair therefore has to decide the gate order again rather than restore ADR 0019 verbatim.

## Decision

Per Step, the order is: (1) the coordinator re-runs the Step's Verification Checklist itself; (2) it incorporates the report's technical learnings into memory; (3) on a pass, it marks **only the Step's Automated checkboxes** in one batched update and writes the appendices; (4) it runs the STOP & COMMIT checklist. There is no per-Step human gate.

Functional checkboxes (formerly `**Human (...)**`, now `**Functional (...)**`) are marked exclusively by the terminal functional review, once per run, and only for checks it verified with verdict `pass`. A `fail` or `unverifiable` check stays `- [ ]` and is reported as pending human review — a terminal state, not missing work. Step completion, the Final sweep's blocking condition, run completion, and the chained transition are all evaluated on Automated state only.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Restore ADR 0019 verbatim, human gate included | Pure regression repair; no safety guarantee changes | Keeps a blocking human stop on checks an agent can now re-exercise itself, and stalls unattended runs at every Step |
| Keep the human gate only when the terminal review cannot verify a check | Preserves the strongest guarantee per check | The gate fires per Step, before the review runs, so it cannot know what the review will verify |
| Mark Automated per Step, Functional at the terminal review (chosen) | Restores the lost marking with one owner per checkbox class; no stop for a check an agent can exercise; unverifiable checks stay visibly pending | A per-Step commit can contain code whose functional verification has not run yet; the review is a net after the commit rather than a gate before it |

## Consequences

- A Step's commit may land before its functional checks are exercised. ADR 0019 existed to prevent exactly this; the terminal functional review is the accepted replacement, and it runs before the Final sweep of the same run.
- A run can complete with zero functional checkboxes marked. Apply then guarantees automated verification plus an explicit report of what remains pending human review.
- Fast-track no longer has a distinct functional-marking branch: with the per-Step gate gone, the fast-track and non-fast-track paths are identical.
- Every checkbox class has exactly one writer: the coordinator for Automated, the terminal functional review for Functional. RED and GREEN workers still never mark a checkbox or edit `implementation.md`.

## Related

- `docs/adr/0018-checkbox-override-scoped-to-apply-not-remember.md` — the per-Step batched-marking override, now restated in `sai/commands/apply/runner.md` § Step checkbox marking (Automated)
- `sai/commands/apply/runner.md` — § Coordinator Checklist Execution, Automated marking slot
- `sai/commands/apply/steps/terminal-lifecycle.md` — terminal functional review and Final sweep
- `openspec/specs/apply/spec.md` — the per-Step marking requirement this repair restores
