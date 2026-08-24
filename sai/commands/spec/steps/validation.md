# Spec Step — Validation

Active step: validation. Verify the artifacts, derive the decision summary, then report the `validation` progress event per the worker contract.

Rules originating here: Complexity Derivation Rubric. Rules referenced from elsewhere: Rule #1 and Rule #2 are defined in common.md.

## Pre-completion verification

Before completion run the Artifact Verification Checklist from `steps/common.md`, then apply Rule #1 and Rule #2 from `steps/common.md`. A failed check is corrected before this step completes.

## Structured validation report

The validation step does not print warnings. For every warning from Rule #1
or Rule #2, return one ordered entry in the `validation_report.warnings`
extension defined by `@sai/policies/spec-phase-contract.md`, using its
`spec_assertion`, `other_side`, and `disagreement` fields. Return an empty
warning list when no warning applies. The coordinator renders each entry after
the decision summary and before the feedback gate using that policy's one
canonical warning block; it preserves the report fields verbatim and never
inspects or edits artifacts.

## Complexity Derivation Rubric

This rubric governs the `**Complexity**` line of `proposal.md` only, and is applied during this step — after the specs are written, before completion is reported.

Derive the token from these five signals, all read from the finished `proposal.md` and the change's `specs/**/*.md`:

- **S1 capabilities** — the number of entries under `## Capabilities` (New plus Modified).
- **S2 requirements** — the number of `### Requirement:` headings across this change's `specs/**/*.md`.
- **S3 breaking** — whether any `**BREAKING**` marker appears in `## What Changes`.
- **S4 new dependency** — whether the proposal states that a dependency is introduced.
- **S5 affected paths** — the number of distinct literal file paths listed as affected under `## Impact`. Paths the proposal lists as explicitly not touched are NOT counted. Count literal paths; do not interpret narrative breadth.

Select the tier by escalation precedence — evaluate `high`, then `medium`, then `low`, and take the first match:

- **high** — S1 ≥ 4, **or** S2 > 10, **or** S3 is true, **or** S4 is true, **or** S5 > 8.
- **medium** — S1 in 2–3, **or** S2 in 4–10, **or** S5 in 3–8.
- **low** — none of the above matched: S1 ≤ 1, S2 ≤ 3, no breaking change, no new dependency, S5 ≤ 2.

`high` is the ceiling. A change larger than `high` still emits `high`; never invent a fourth tier. Record the overflow as an Open Question in `design.md` during `/sai-2-design`.

**Calibration.** The cuts are grounded in a survey of 140 archived changes: median S2 = 5, max S2 = 37. The cut `S2 > 10` sits at twice the median and tags roughly 18% of a 40-change sample `high`, keeping all three tiers populated. Reproduce this distribution before re-tuning any cut.

Because S2 depends on the specs, derive or revise the token now — after `specs/**/*.md` are written and before completion is reported. A token derived from an early draft is corrected before this step completes.

## Decision-summary derivation

When the re-read of `proposal.md` and `specs/**` composes the decision summary per the skill's Completion contract, apply Rule #1 and Rule #2 FIRST, then print the decision summary recomputed from the current artifacts — every summary line traces only to those artifacts, never to prior-conversation or external context. Report the `validation` progress event only after verification, both rules, and the complexity token are complete.
