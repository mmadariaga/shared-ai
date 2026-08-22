# Spec Step — Validation

Active step: validation. Verify the artifacts, derive the decision summary, then report the `validation` progress event per the worker contract.

## Pre-completion verification

Before completion verify non-empty `proposal.md`, at least one non-empty `specs/**/*.md`, proposal/spec consistency, valid requirement scenarios, and the existing spec-only scope. A failed check is corrected before this step completes.

## Rule #1 — Proposal-to-spec self-consistency gate

Reconcile the proposal narrative against `specs/**/*.md` so that no statement in `proposal.md` contradicts a requirement or scenario in the specs. This reconciliation reuses the same artifact re-read that already produces the decision summary — it adds reasoning, not I/O.

The specs' requirements and scenarios are normative. When a proposal statement and a spec requirement/scenario contradict each other:
- If the spec is unambiguously normative for the topic, adjust the proposal narrative to match the spec (never the reverse). Record the correction as one line in the decision summary of the form `Reconciled proposal: spec is normative for <topic>`. This correction line is subject to the existing 15-line cap and `+N more` overflow signal defined in the `spec-quality` capability spec — no special casing.
- If intent is genuinely ambiguous (neither side is clearly the source of truth), do NOT guess or silently correct either artifact. Instead, raise the shared warning block below, naming both sides and their locations, and let the user decide.

The absence of spec coverage is NOT a contradiction: a proposal note describing something intentionally deferred, out of scope, or left to a future iteration — where the specs are simply silent — SHALL NOT be flagged as an inconsistency.

## Rule #2 — Source-grounding of spec-pinned literals

When a spec written during the change pins a literal string — a value the requirement or scenario reproduces verbatim (a message string, config key, path, or flag), most commonly in a MODIFIED requirement, and also in an ADDED requirement that quotes an existing source string — classify the literal before grounding it against current source.

**Classification (determinable from the spec's own text — no extra I/O):**
- **Preserved** — a value the spec restates WITHOUT intending to change it.
  - (i) A MODIFIED requirement whose pinned new value **equals** its prior spec baseline value (the spec touches surrounding wording but leaves the literal unchanged — the "intro line" defect case).
  - (ii) An ADDED requirement that quotes an existing source string unchanged.
  A preserved literal SHALL match current source; divergence from current source is a drift bug.
- **Introduced** — the new value the change intends to establish.
  - (i) A MODIFIED requirement whose pinned new value **differs** from its prior spec baseline value (by definition the change is changing the literal — current source still holds the OLD value, so divergence is EXPECTED, it is the change itself, not a drift bug).
  - (ii) A new ADDED requirement introducing a literal that did not exist before (current source has nothing to compare against — the not-found path applies, not divergence).
- **Ambiguous** — when preserved vs introduced cannot be determined from the spec text plus the change's own proposal/scope.

**Grounding:**
Verify the pinned literal against the current project source, not only against the prior spec baseline. Verification SHALL use a targeted read or grep for that specific literal — performed by you directly under the single-known-file / targeted-symbol-search exception of the cost discipline. Broad exploration is forbidden; the budget rules stay intact. The check SHALL fire only within the literals the phase is already grounding — the values it pins and the MODIFIED requirements it touches — never a full spec-vs-source audit of unrelated specs. When no spec-pinned literal exists, no source read is required.

**Reactions by classification:**
- **Preserved**, literal matches current source → no warning.
- **Preserved**, literal diverges from current source → raise the shared warning block below (which-side-is-stale). Do NOT auto-prefer or silently reconcile either side.
- **Introduced**, literal diverges from current source → **SUPPRESS** the divergence warning. The divergence is the intended change, not a drift bug.
- **Introduced**, literal not yet in source (new ADDED first introduction) → report `could not ground literal <X>: not found` in the warning area, NOT a divergence claim.
- **Ambiguous** → fall through to the SAME shared warning block defined for the preserved case, matching Rule #1's "Ambiguous intent is surfaced, not guessed" handling. No separate block, no silent suppression.

## Shared warning format (ONE canonical block)

The following block is reused by:
- Rule #1's ambiguous-intent case,
- Rule #2's PRESERVED-literal divergence case,
- Rule #2's AMBIGUOUS preserved-vs-introduced fall-through case.

Print the block immediately AFTER the decision summary and BEFORE the feedback gate prompt is presented by the coordinator, so it cannot be scrolled past above the interactive gate. The block is additive (printed in addition to the decision summary), never swallowed, never aggregated behind another warning. If multiple divergences or ambiguous cases are detected, print one separate block per case, stacked in the warning area.

```
⚠ Consistency warning — not auto-resolved; you decide which side is stale.

  • Spec assertion    : <spec file + requirement/scenario name>
  • <Other side>      : <file:line> of the divergent value
  • Disagreement      : <one-line statement of how they differ>
```

where `<Other side>` is:
- `Source value` for Rule #2 (preserved or ambiguous fall-through),
- `Proposal statement` for Rule #1 (ambiguous intent).

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

Because S2 depends on the specs, derive or revise the token now — after `specs/**/*.md` are written and before completion is reported. A token derived from an early draft is corrected before this step completes.

## Decision-summary derivation

When the re-read of `proposal.md` and `specs/**` composes the decision summary per the skill's Completion contract, apply Rule #1 and Rule #2 FIRST, then print the decision summary recomputed from the current artifacts — every summary line traces only to those artifacts, never to prior-conversation or external context. Report the `validation` progress event only after verification, both rules, and the complexity token are complete.
