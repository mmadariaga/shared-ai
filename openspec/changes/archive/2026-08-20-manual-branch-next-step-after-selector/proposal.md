**Complexity**: medium

## Why

The crystallization close currently presents path-specific next-step guidance before the final `Auto`/`Manual` selector, so the manual branch does not receive its actionable handoff after the user chooses not to dispatch automatically. The same selector also leaves failed or cancelled automatic runs without phase-specific orientation. This follow-up makes both outcomes explicit while preserving the selector's state and retry contracts.

## What Changes

- Move the existing `/sai-1-spec` next-step guidance for single-change, sliced, and inline-refusal crystallization paths to the post-selector Manual/unmapped response, localizing surrounding prose while preserving the command literals.
- Preserve the sliced first-block boundary, inline-refusal isolation rationale, and one-time shared recommendation/selector close; keep only `/sai-1-spec`, `/sai-2-design`, and `review-loop` verbatim where the language gate requires literals.
- Add one phase-specific localized guidance line after a failed or cancelled `Auto` run, derived from existing state so spec failures name `/sai-1-spec` and design failures name `/sai-2-design`.
- Keep successful `Auto` free of next-step or implementation handoff text, and keep Manual/unmapped responses non-dispatching, state-preserving, and eligible for uncapped selector re-invocation.
- Extend the selector tests to pin the post-selector guidance, path coverage, no-duplicate close output, successful Auto silence, and phase-specific Auto failure guidance.

## Capabilities

### New Capabilities

<!-- No new capability is introduced. -->

### Modified Capabilities

- `explore-crystallization-block`: relocate the path-specific next-step guidance from the shared pre-selector close to the Manual/unmapped continuation while preserving the three crystallization-path contracts.
- `explore-crystallization-language-gate`: localize the relocated Manual/unmapped prose while keeping only the agreed command and standing-path literals verbatim.
- `explore-pipeline-selector`: define the post-selector Manual/unmapped handoff, phase-specific Auto failure guidance, and the existing state, retry, and re-invocation semantics.

## Impact

- `sai/commands/explore/instructions.md` — crystallization close and selector-branch instructions.
- `openspec/specs/explore-crystallization-block/spec.md` — delta requirements for the three crystallization paths.
- `openspec/specs/explore-crystallization-language-gate/spec.md` — delta requirement for localized post-selector prose and preserved literals.
- `openspec/specs/explore-pipeline-selector/spec.md` — delta requirements for Manual/unmapped and Auto outcomes.
- `test/explore-pipeline-selector.test.js` — lexical behavior coverage for ordering, repetition, and branch separation.
- No production source API, configuration, dependency, infrastructure, or generated overview is changed.

## Proposal Research Documentation

**Local files**:

- `sai/commands/explore/instructions.md`
- `openspec/specs/explore-crystallization-block/spec.md`
- `openspec/specs/explore-pipeline-selector/spec.md`
- `openspec/specs/explore-crystallization-language-gate/spec.md`
- `openspec/specs/explore-pre-crystallization-closure/spec.md`
- `openspec/specs/review-loop-navigation/spec.md`
- `test/explore-pipeline-selector.test.js`
- `openspec/changes/archive/2026-08-20-single-source-crystallization-close/proposal.md`
- `openspec/changes/archive/2026-08-20-single-source-crystallization-close/design.md`
- `openspec/changes/archive/2026-08-20-single-source-crystallization-close/implementation.md`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- The existing `/sai-1-spec`, `/sai-2-design`, and `review-loop` literals remain unchanged; surrounding post-selector prose follows the selected crystallization language.
- The sliced flow continues to direct only the first block to `/sai-1-spec`; later slices remain separate follow-up changes.
- Failed or cancelled `Auto` runs retain their existing retry state and now name the stopped phase using `/sai-1-spec` or `/sai-2-design`.
- This spec phase intentionally creates no `design.md`, `tasks.md`, `interfaces.md`, implementation plan, or `change-overview.md`; the overview-language preference is therefore not materialized here.
