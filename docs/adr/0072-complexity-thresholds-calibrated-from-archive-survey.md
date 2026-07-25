# ADR 0072: Numeric complexity thresholds calibrated from an archive survey

<!-- adr-index: refs 0069; refs 0070 -->

## Status

Accepted

## Context

`proposal.md` gains a `**Complexity**: low|medium|high` line, emitted by `/sai-1-spec`, mirroring the `complexity` token already carried per-step on `tasks.md`'s `**Routing**` line. The `proposal-complexity` capability spec fixes the vocabulary, the five spec-phase signals, and the escalation-precedence rule, but explicitly delegates the numbers: "The numeric thresholds that map signal values to tiers live in the rubric section named above; a reader needs both to reproduce a token."

That delegation leaves the load-bearing part unspecified. The spec also demands that "a second agent given the same proposal and the same rubric SHALL produce the same token", which rules out qualitative cuts — the tier prose says "a handful of capabilities", and two agents do not agree on what a handful is. Someone has to pick numbers, and the numbers are the only part of the rubric a downstream reader could reasonably dispute.

## Decision

Pin the thresholds in `sai/instructions/spec.propose.md` under `## Complexity Derivation Rubric`, as an escalation table evaluated high → medium → low, first match wins:

- **high** — S1 ≥ 4, or S2 > 10, or S3 true, or S4 true, or S5 > 8.
- **medium** — S1 in 2–3, or S2 in 4–10, or S5 in 3–8.
- **low** — otherwise: S1 ≤ 1, S2 ≤ 3, no breaking change, no new dependency, S5 ≤ 2.

Where S1 = capabilities (new + modified), S2 = `### Requirement:` headings across the change's `specs/**/*.md`, S3 = any `**BREAKING**` marker, S4 = a new dependency, S5 = distinct literal affected paths named under `## Impact` (excluding the "explicitly not touched" list).

The cuts are calibrated against a survey of all 140 archived changes, which gives a median requirement count of 5 and a max of 37. `S2 > 10` sits at 2× the median and tags ~18% of a 40-change sample `high`, leaving all three tiers populated. The rubric section carries the shell one-liner that reproduces the survey, so a re-tune starts from a re-runnable measurement rather than from the numbers quoted here.

The thresholds are single-sourced in the rubric. `openspec/schemas/sai-workflow/schema.yaml`'s proposal `instruction:` block points at the section by name and deliberately does not restate them, because `schema.yaml` is byte-copied into every target project by `bin/setup.js` and a drifted second copy would propagate silently.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Escalation table with measured cuts (chosen) | Reproducible across agents; calibration is re-runnable, so a disagreement is resolvable rather than rhetorical | Cuts are coarse step functions — a 9-path change is not categorically bigger than an 8-path one |
| Qualitative thresholds only, matching the spec's tier prose | No numbers to defend; reads naturally | Fails the spec's own two-agents-same-token requirement — "a handful" is not reproducible |
| Weighted score summed across the five signals | Smooth; no boundary artifacts | Contradicts the spec's stated escalation-precedence rule, and adds arithmetic no reader can do at a glance |
| Tighter cuts (`S2 > 6` → high) | Flags more changes for a careful design pass | Measured against the archive, tags roughly half of all changes `high` and destroys the token's discrimination |

## Consequences

- The coarseness is deliberate, not an oversight. A soft gradient would be more faithful to reality, but the spec forecloses it (`high` is the ceiling; no fourth tier), and a coarse token two agents reproduce identically is worth more here than a smooth one they disagree about.
- S2 does most of the tier assignment, so it is the cut to adjust first on a re-tune.
- Re-tuning is only partially reversible: no file needs re-tagging, but every change tagged under the old numbers becomes non-comparable with changes tagged under the new ones. `design.md`'s `## Deferred` therefore carries a recalibration checkpoint at roughly fifteen tagged changes, comparing each emitted token against the design iterations the change actually took.
- Nothing reads the token in this change. The thresholds' real cost lands only when an orchestrator maps tokens to models, which is deliberately out of scope.
- A change genuinely larger than `high` still emits `high`; the overflow is recorded as an Open Question in `design.md` rather than resolved with a fourth tier.

## Related

- `docs/adr/0069-test-command-sibling-field-outside-conventions-quota.md` — sibling precedent for pinning a field's contract in the instruction that owns it.
- `docs/adr/0070-test-command-carries-parameterised-scoping-idiom.md` — same single-sourcing posture for a `tasks.md` field.
- `openspec/specs/tasks-routing-metadata/spec.md` — the per-step `complexity` vocabulary this change mirrors, and the "no consumer is built" precedent.
- `openspec/changes/proposal-complexity/` — proposal, capability spec, and `design.md` D1 (the decision this ADR records) and D4 (single-sourcing).
