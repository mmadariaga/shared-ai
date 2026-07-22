## Why

The suspected largest cost sink in `/sai-4-apply` is retries caused by idiom mismatch — a cold subagent writing code that fails verification not because of a bug but because it did not know the repo's conventions. The current 8-field Subagent Report Contract measures nothing about retries, so any proposed fix would be unfalsifiable; this change makes the sink observable before anyone pays to address it.

## What Changes

- Add a **ninth field** to the `/sai-4-apply` Subagent Report Contract: a list of `{phase, attempts, first_failure, note}` entries, one per verification phase the dispatch actually ran.
- Define `attempts` as a count of verification-command **runs regardless of outcome**, and `first_failure` as the error class of the first failing run — `n/a` only when the first run did not fail. This keeps a halted invalid RED (`attempts` = 1, `first_failure` = `import`) distinguishable from a clean pass (`attempts` = 1, `first_failure` = `n/a`), which matters because the blind test-writer halts on an invalid RED instead of iterating.
- Give `first_failure` a **closed vocabulary** — `assertion` / `setup` / `import` / `other` / `n/a` — reusing the invalid-RED classification the dispatch rules already apply, so the column aggregates across changes instead of accumulating per-dispatch synonyms.
- Bind field 9's entries to fields 3/4 in both directions: an entry exists for `red` exactly where field 3 carries a non-`n/a` value, and for `green` exactly where field 4 does. A surplus entry is omitted from the appendix; a missing entry is absent telemetry under soft degradation — neither is a malformed report.
- Exempt field 9 from the field-8 malformed-report rule: an absent or empty field 9 SHALL NOT make a report malformed and SHALL NOT block the commit gate.
- Add a coordinator-authored `## Appendix: Execution Telemetry` table to `implementation.md`, appended per Step in the same workflow loop slot that already holds the deviations appendix.
- The appendix's `Step` and `dispatch` columns are supplied by the coordinator, not reported by the subagent.
- Pin the two appendices' order: `## Appendix: Plan vs Final Implementation` first, then `## Appendix: Execution Telemetry`, independent of which section a run creates first.
- Prohibit the coordinator from re-injecting field 9 into any subsequent dispatch prompt — for the same Step as well as any later Step.
- Not breaking: existing reports remain valid; the contract's "exactly these 8 fields" wording becomes "exactly these 9 fields" with field 9 softly degrading.

## Capabilities

### New Capabilities

- `apply-execution-telemetry-appendix`: the coordinator-authored `## Appendix: Execution Telemetry` table in `implementation.md` — its columns, its per-Step append slot, and the coordinator-supplied `Step` and `dispatch` values.
- `apply-telemetry-containment`: the prohibition against the coordinator re-injecting field 9 into any dispatch prompt, keeping retrospective telemetry out of the prospective learnings channel.

### Modified Capabilities

- `apply-subagent-report-contract`: the report grows from 8 to 9 fields; field 9 (`Attempts per phase`) is added with its per-phase entry rule bound to fields 3/4, and with an explicit soft-degradation exemption from the field-8 malformed-report rule.

## Impact

- `sai/instructions/apply.md` — the `## Subagent Report Contract` section, the three dispatch blocks' *Report completeness* bullets, the `<workflow>` loop's appendix slot, the `### Malformed subagent report` sub-section, and the `## Technical Learnings Memory` section (containment prohibition). The edit surface is wider than the concept because the "exactly these 8 fields" count is restated in several places.
- `openspec/specs/apply-subagent-report-contract/spec.md` — superseded on archive by this change's spec delta.
- No change to `sai/instructions/design.md`, the `tasks.md` template, or any dispatch prompt's work-order contents.
- No runtime, dependency, or API impact — this repository is a prompt/instruction library.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/apply.md` — full current contract: `## Subagent Report Contract` (8 fields, per-dispatch table), `## Step-Execution Subagent Dispatch` (three dispatch kinds and their *Report completeness* bullets), `<workflow>` (appendix loop slot), `## Technical Learnings Memory`, `### Malformed subagent report`.
- `openspec/specs/apply-subagent-report-contract/spec.md` — the normative baseline for the 8-field contract being modified.
- `openspec/specs/apply/spec.md` — `Requirement: Only the coordinator writes implementation.md`, which forces the appendix author to be the coordinator.
- `openspec/specs/apply-pre-commit-file-report/spec.md` — located as the home of the field-8 malformed-report rule that field 9 is exempted from.
- `GLOSSARY.md` — existing pipeline terms (`Blind Test-Writer`, `Implementation Dispatch`, `GREEN Conflict`).

**External URLs**: none.

## Additional Notes

- **Why phase keying, not dispatch keying.** Keying field 9 by phase (`red`/`green`) lets the non-testable Step's single dispatch — which runs both RED and GREEN — emit two entries with no special case and no new enum value, and makes the field self-validating against the existing per-dispatch table in `## Subagent Report Contract`.
- **Why the coordinator fills `dispatch`.** The coordinator already knows which dispatch it issued; the subagent is deliberately blind to the orchestration, and every field it does not report is one it cannot get wrong.
- **Why both axes are kept.** A high RED attempt count from the non-blind single dispatch means something different from a high RED count from the blind test-writer. Collapsing them contaminates exactly the average that is supposed to drive the follow-up decision.
- **Why `attempts` starts at 1.** `1` means the command was run once. A counter starting at `0` would have to be named `retries`. Success is read from `first_failure`, not from the count — see the next note.
- **Why the invalid-RED case forced a refinement.** The blind test-writer does not retry an invalid RED; it halts. Had `first_failure` been `n/a` whenever `attempts` = 1, a wrong-failure — the exact idiom-mismatch signature this change exists to detect — would have been recorded identically to a first-try pass, and the telemetry would have systematically under-counted the failure mode that justifies the follow-up. Counting runs rather than successes fixes this without adding a column.
- **Why `note` states what changed, not what failed.** The error class is already captured by `first_failure`; phrasing the note as "what changed between attempts" is the bound that keeps tracebacks out of what gets persisted.
- **What containment can and cannot guarantee.** The report is returned to the coordinator, so a subagent that violates the note contract has already placed the offending text in that context and nothing downstream removes it. The guarantee is therefore limited to two things the mechanism actually controls: adding no new pathway for execution noise, and persisting no violating note at all (the row is written with an empty `note` cell rather than a cleaned one).
- **Field 6 vs field 9.** Field 6 is prospective — facts the next dispatch needs, and therefore injected. Field 9 is retrospective — diagnosis of this run, for the human tuning the workflow, and therefore never injected. Different content, different destination, different audience.
- **The table shape is itself the bound.** A fixed-column row cannot degenerate into an iteration log the way a prose field can.
- **Alternatives considered and rejected**: a free-text retry field alongside field 6 (overlaps field 6's purpose; "explain the retries" is the most direct possible invitation to paste a traceback); a third dispatch enum value on the reported field to cover the non-testable Step (phase keying needs no new value); excluding non-testable Steps from the appendix (silently drops a whole dispatch kind from the measurement); a single phase axis with no dispatch column (mixes blind and non-blind RED counts into one average); keeping the telemetry only in the coordinator's context (that context is ephemeral by design, so the numbers would die with the session).
- **Trade-offs accepted**: the counter measures attempts *within* a dispatch, not re-dispatches of a whole Step after a coordinator disagreement — it is sufficient for the decision at hand but is not a total-cost figure and must not be presented as one; containment rests on a written prohibition rather than a structural barrier, because field 9 lives in the coordinator's context next to field 6.
- **Gate criterion for the follow-up.** Mean `attempts` alone is not sufficient to decide the follow-up slice, because a halted invalid RED contributes `attempts` = 1. The decision SHALL read `first_failure` alongside `attempts`: a run full of `setup`/`import` first failures indicates idiom mismatch even when the mean attempt count is near 1.0.
- **Scope is instrumentation only.** This change fixes nothing it measures. The follow-up — a mandatory testing sub-block in `## Implementation Context` plus an exemplar-test pointer — is deliberately deferred until baseline data exists. Raising field 9 to field 8's strictness is an explicit non-goal.
