**Complexity**: medium (1 new capability, 5 requirements, no breaking change)

## Why

`/sai-explore` already guides users through maturity, edge-case, and implementation-detail questions, but users who prefer a native choice control have no optional way to navigate those checkpoints without replacing the existing conversational prompts. Adding additive selectors makes the advancement choices discoverable while preserving the text-first exploration flow and its explicit progression safeguards.

## What Changes

- Add an optional native maturity selector after the existing maturity question, with localized choices for reviewing edge cases or continuing to iterate plus a free-text path.
- Add an optional native stage selector after the existing edge-case and implementation-detail questions, with localized choices for advancing or continuing discussion plus a free-text path.
- Keep selector responses conversation-only: review and advancement behavior must preserve the existing ask-mode, explicit `next-step`, edge-case agreement, implementation-detail agreement, and crystallization rules.
- Reset selector state, progression, and agreed lists when the explored idea materially changes.
- Keep the overview language value at the literal `None` for this selector flow unless a separately supported explicit overview opt-in is supplied; the selector itself never opts into overview generation.

## Capabilities

### New Capabilities

- `explore-stage-choice-selectors`: Optional localized native selectors that supplement the existing text questions and provide explicit, non-advancing or advancing stage choices.

### Modified Capabilities

- None

## Impact

- `sai/commands/explore/instructions.md` — define additive selector placement, ask-mode transitions, localized labels, and reset behavior.
- `sai/policies/remember.md` — existing native-picker and free-text presentation rules remain the governing policy.
- `openspec/specs/explore-pre-crystallization-stages/spec.md` — existing stage, agreement, and material-change-reset contracts are the behavior that selectors must preserve.
- `openspec/specs/explore-edge-case-review/spec.md` and `openspec/specs/explore-implementation-details/spec.md` — existing text questions and agreement gates remain unchanged.
- Harness-specific explore interaction tests and projections may be updated downstream; this spec phase writes no production code.

## Proposal Research Documentation

**Local files**: `sai/commands/explore/instructions.md`; `sai/policies/remember.md`; `openspec/specs/explore-pre-crystallization-stages/spec.md`; `openspec/specs/explore-edge-case-review/spec.md`; `openspec/specs/explore-implementation-details/spec.md`; `openspec/specs/explore-crystallization-on-demand/spec.md`; `openspec/specs/explore-overview-language-gate/spec.md`; `openspec/specs/closed-choice-prompts/spec.md`; `test/explore-pre-crystallization-stages.test.js`; `commands/claude/sai-explore.md`; `commands/opencode/sai-explore.md`

**External URLs**: None

## Additional Notes

- The Spanish labels `Revisar edge cases`, `Seguir iterando`, `Ir al siguiente step`, and `Discutir ideas / dar feedback` are the required localized examples for a Spanish conversation; equivalent labels and surrounding prose must follow the active conversation language.
- The existing maturity, edge-case, and implementation-detail questions remain text questions and remain authoritative. A native selector is an additional navigation affordance, not a replacement agreement picker.
- `Ir al siguiente step` must map exactly to the existing literal `next-step` behavior; arbitrary free text must never be interpreted as advancement merely because a selector was shown.
