# ADR 0094: Supervised auto-answer confidence is a qualitative judgment gated by an objective grounding floor

<!-- adr-index: pair-with 0095 -->

## Status

Accepted

## Context

Under `start-pipeline` supervision, `sai-explore` may now answer a routed spec-proposal worker's `needs_input` question on the user's behalf instead of escalating every question. The gate that authorizes an auto-answer needs a definition of "confident enough". A purely felt confidence — the model simply believing it knows the answer — would re-open the retired "infer an answer from explore context" behavior and let a confidently-wrong answer forward silently to the worker.

## Decision

Keep the confidence threshold a **qualitative** model judgment: explore never computes, requires, or emits a numeric confidence value. Auto-answering is the narrow exception; escalation is the default, and borderline/unclear/unassessed confidence always escalates.

Pair that qualitative judgment with an **objective grounding floor**: an auto-answer is permitted only when the answer is actually locatable in — determinable from — the permitted grounding sources, such that explore can cite what within those sources determines the answer. Felt confidence alone can never authorize an auto-answer; a question whose answer is not present in the permitted sources escalates regardless of how confident explore feels. This gives "unclear" an objective, checkable meaning rather than only a felt state.

## Alternatives Considered

- **Numeric confidence gate** — attach a computed confidence score and auto-answer above a fixed number. Rejected: invites false precision and a fabricated metric with no calibration behind it; a model can emit a high number as easily as it can feel confident.
- **Felt confidence alone (no grounding floor)** — auto-answer whenever the model judges itself above threshold. Rejected: this is effectively the retired "infer from explore context" behavior and lets a confidently-wrong answer bypass escalation.

## Consequences

- The safety contract is checkable: every auto-answer must point at a grounding source, and the phase-end audit log records that citation as the verification surface.
- Changing the gate later (for example to a numeric dial) must retrofit both the decision prose and the audit-log format; the fixed qualitative-plus-floor pairing is deliberately the only shipped behavior.
- Ambiguity resolving toward escalation means the escalation path — not the auto-answer path — is what keeps genuinely ambiguous decisions with the user.

## Related

- `openspec/changes/add-pipeline-autonomous-question-answering/design.md` — Decision "Confidence stays a qualitative model judgment with an objective grounding floor"
- `openspec/changes/add-pipeline-autonomous-question-answering/specs/pipeline-question-autonomy/spec.md` — "Ambiguity resolves toward escalation", "The answer must be located in the permitted grounding sources"
- `docs/adr/0095-bounded-grounding-sources-exclude-conversation.md`
