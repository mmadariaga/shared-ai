**Complexity**: high (4 capabilities, 10 requirements, 1 affected path)

## Why

When an explored idea becomes solid, `sai-explore` currently moves directly to its crystallize reminder, so edge cases discussed during exploration are not preserved for the `/sai-1-spec` handoff. A mandatory, agreement-gated review pass records scope-boundary behavior before crystallization so the next phase receives the agreed reasoning instead of losing it.

## What Changes

- Add a once-per-stable-idea edge-case review that presents numbered proposed scope-boundary behaviors and asks for semantic agreement.
- Gate the crystallize reminder and explicit crystallization behind agreement; premature requests enter the review without a skip path, while disagreement or ambiguity keeps the discussion open and re-asks.
- Keep the mandatory edge-case gate active under `--fast-track`; fast-track continues to bypass only the existing language gates.
- Add a mandatory `Edge Cases` section to every `Ready to Propose` handoff, using `- None` when empty and mechanically partitioning the agreed `E1`…`En` list across slices.
- Exclude edge cases that do not bound this change; they remain Non-Goals.

## Capabilities

### New Capabilities

- `explore-edge-case-review`: review and obtain agreement on numbered scope-boundary edge cases before crystallization.
- `explore-edge-case-gate`: prevent crystallization until the edge-case review reaches semantic agreement and restart it for a materially changed idea.
- `explore-handoff-edge-cases`: carry the agreed edge cases into a dedicated handoff section, including per-slice attribution.

### Modified Capabilities

- `explore-crystallization-block`: extend every `Ready to Propose` block with the mandatory `Edge Cases` section while preserving the existing handoff fields and language-gate behavior.

## Impact

- `sai/instructions/explore.md` — conversation-only review state, agreement gate, and `Ready to Propose` rendering rules.
- No source, configuration, or artifact files are changed by this proposal; downstream `/sai-1-spec` consumption is a separate change.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/explore.md` — current emission, closure, slicing, handoff, and review-loop behavior.
- `sai/instructions/spec.propose.md` — handoff research-lead and downstream proposal-consumption rules.
- `openspec/specs/explore-crystallization-on-demand/spec.md` — explicit crystallization and stable-idea readiness semantics.
- `openspec/specs/explore-vertical-slicing/spec.md` — single-versus-sliced routing and slice ordering.
- `openspec/specs/explore-closure-state/spec.md` — material-change lifecycle behavior.
- `openspec/specs/explore-crystallization-block/spec.md` — existing handoff sections and language invariants.
- `GLOSSARY.md` — canonical terms including Closure State and Tracked Crystallized Set.

**External URLs**: None.

## Additional Notes

- `sai-explore` remains read-only; review state and agreement are held in conversation only.
- The agreement question is language-agnostic and follows semantic intent rather than a fixed phrase or native yes/no picker.
- One agreed edge-case list is partitioned at emission time by slice; edge cases outside the change remain in Non-Goals.
