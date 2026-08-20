# DDR 0151: External Explore findings block is the only `review` progress evidence

<!-- adr-index: amends 0133; refs adr:0158 -->

## Status

Accepted

## Context

The `review` progress step on the six-step spec plan and seven-step design plan is evidence-marked: it must not be inferred from artifact existence, successful completion, or ordinary prose. Previously a worker-owned no-High pass could supply that evidence. After the worker-owned loop is deleted, the pipeline still needs a single non-ambiguous no-High signal that Explore already produces.

This is change `remove-cold-artifact-reviewer`, Decision D2. It is a domain invariant about what may mark `review`, not a build-layout choice.

## Decision

A worker may emit `review` only when it receives a complete Explore findings block whose base-form `Summary: High=<count> Medium=<count> Low=<count>` reports `High=0`, while the step is still unmarked. Medium/Low do not block marking. Ordinary prose, missing blocks, missing Summary lines, invalid blocks, and `High>0` never mark and never clear an existing mark (progress marks remain monotonic). Coordinators never synthesize `review` marks at reconciliation; absence of findings is never `High=0`.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Explicit external base-form Summary is the only evidence (chosen) | Non-ambiguous; already produced by Explore; matches shared contract | Standalone runs leave `review` unmarked unless the user pastes findings |
| Infer `High=0` from empty feedback or successful completion | Convenient for standalone runs | Violates evidence-marked carve-out; invents false no-High |
| Let coordinators mark `review` at reconciliation | Simple coordinator path | Breaks worker-owned progress emission and monotonic evidence rules |

## Consequences

- Amends DDR 0133: the evidence source is an external Explore findings block, not a worker-owned pass.
- Gate note (ADR 0160) advertises `sai-explore` `review-loop` so users can obtain pasteable evidence.
- Successful reconciliation without qualifying evidence leaves `review` unmarked while other steps complete.

## Related

- `openspec/changes/remove-cold-artifact-reviewer/design.md` — Decision D2
- `openspec/changes/remove-cold-artifact-reviewer/specs/review-step-evidence-marking/spec.md`
- DDR 0133 — Review progress is marked only by no-High pass evidence (amended)
- ADR 0158 — Delete the worker-owned planning-artifact review loop
