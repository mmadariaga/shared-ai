**Complexity**: medium (1 capability, 9 requirement blocks, 6 affected paths)

## Why

The routed sai-1 and sai-2 coordinators reference the artifact feedback gate without loading its shared policy, and the routed coordinator/worker contract does not assign ownership of the empty-turn feedback-text prompt. This leaves prompt cardinality undefined and allows the same prompt to be emitted more than once after the feedback option is selected.

## What Changes

- Wire the routed sai-1 and sai-2 coordinators to fetch `sai/policies/artifact-feedback-gate.md` before applying the shared feedback gate.
- Make the routed coordinator the sole owner of the feedback-text prompt and require the prompt to be emitted exactly once per feedback-option selection; the worker consumes the resulting user text and never re-presents the prompt.
- Add the same ownership and single-emission contract to the normative artifact-feedback-gate specification, correcting its gate-policy and `remember.md` policy references.
- Clarify that the coordinator/worker ownership applies to routed sai-1 and sai-2, while the Copilot inline path remains unchanged; preserve prompt language rendering, picker labels, iteration counter, per-item feedback processing, and supervised machine-feedback adapter behavior.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `artifact-feedback-gate`: define routed coordinator ownership and exactly-once emission of the feedback-text prompt, and require routed coordinators to load the shared policy.

## Impact

- `sai/policies/artifact-feedback-gate.md` — shared ownership and prompt cardinality contract.
- `sai/commands/spec/coordinator.md` — routed sai-1 policy fetch and coordinator-owned prompt lifecycle.
- `sai/commands/design/coordinator.md` — routed sai-2 policy fetch and coordinator-owned prompt lifecycle.
- `sai/orchestration/workers/sai-1-spec-proposal-worker.md` — worker guard against presenting the prompt.
- `sai/orchestration/workers/sai-2-design-worker.md` — worker guard against presenting the prompt.
- `openspec/specs/artifact-feedback-gate/spec.md` — normative ownership, cardinality, and source-reference requirements.

## Proposal Research Documentation

**Local files**: `sai/policies/artifact-feedback-gate.md`; `sai/commands/spec/coordinator.md`; `sai/commands/design/coordinator.md`; `sai/orchestration/workers/sai-1-spec-proposal-worker.md`; `sai/orchestration/workers/sai-2-design-worker.md`; `sai/commands/sai-1-spec.md`; `sai/orchestration/inline-invocation.md`; `sai/policies/remember.md`; `openspec/specs/artifact-feedback-gate/spec.md`; `GLOSSARY.md`; `README.md`

**External URLs**: None.

## Additional Notes

- The shared policy remains the single source of gate logic; routed coordinators load it rather than duplicating its prompt text or loop semantics.
- The coordinator already owns picker presentation, the in-conversation iteration counter, and pending feedback, so prompt ownership remains in the same user-facing turn.
- The prompt's existing user-language rendering rule is unchanged.
- The picker requirement is reproduced in the delta to correct stale policy paths and align its recommendation-marker wording with the shared policy; picker labels and iteration semantics otherwise remain unchanged.
