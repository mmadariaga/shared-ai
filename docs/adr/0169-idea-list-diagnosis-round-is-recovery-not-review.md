# ADR 0169: Idea-list treats Diagnosis Round as recovery, not review

<!-- adr-index: refs 0116; refs 0137; refs 0168 -->

## Status

Accepted

## Context

The Explore idea progress list renders supervised review progress via `reviewed-sai-1` / `reviewed-sai-2` `in_progress` state and evidence-only marks. Item-10 Diagnosis Round (ADR 0168) reuses the Review Engine but its findings are recovery feedback, not a Supervised Review Round. If diagnosis left a review item `in_progress`, added a list row, or marked/cleared evidence, users would misread recovery as converged review. Harness idea-list bindings deliberately do not restate instruction-owned contract rules (item 11).

## Decision

Encode diagnosis render rules only in `sai/commands/explore/instructions.md` (item-10 / idea-list contract owner):

- Before Diagnosis Round starts, resolve any active phase review item to `pending` and render once.
- During diagnosis and its possible re-dispatch, neither `reviewed-sai-1` nor `reviewed-sai-2` is `in_progress`; no diagnosis list item is added; diagnosis findings mark or clear no evidence; `diagnosis_rounds` does not mutate `review_rounds`.
- Only a successful return to the ordinary phase review entry point may set the phase item `in_progress` again.
- Stopped diagnosis leaves the item `pending`.

Do not edit `sai/adapters/{claude,opencode}/idea-list-render.md`. Pre-existing opencode supervised-round wording gaps are out of scope for this change.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Instruction-only diagnosis render rules (chosen) | Matches item-11 ownership; bindings stay non-restating | Bindings may lag prose (accepted) |
| Restate diagnosis in harness idea-list bindings | Panel-level visibility | Violates non-restating binding rule; dual maintenance |
| New diagnosis list item | Makes recovery visible | Masquerades as catalog progress; confuses evidence marks |

## Consequences

- Idea-list structural coverage extends `test/explore-pipeline-selector.test.js` (designated home; no dedicated idea-list suite yet).
- Diagnosis state remains conversation/render-session only — never persisted to files or `.openspec.yaml`.

## Related

- `openspec/changes/diagnosis-driven-recovery-supervised-explore/design.md` — Decision D4
- ADR 0116 — Idea progress list expressed in explore instructions
- ADR 0137 — Non-worker idea-list glue at harness adapter seam
- ADR 0168 — Explore item-10 diagnosis uses Review Engine and same-worker continue_after_recovery
