## Why

Today `sai/instructions/explore.md` §5/§6 re-emit the full multi-section `Ready to Propose` block on every turn the idea "is clear," burning tokens on redundant re-crystallization while the user is still refining. Emission should be user-triggered, not state-triggered.

## What Changes

- Replace state-triggered auto-emission of the `Ready to Propose` block with **user-triggered** emission: `sai-explore` never auto-prints the block.
- When the idea is judged solid (same qualitative threshold as today's "idea is clear"), emit a single **one-line readiness signal** instead of the block.
- The readiness signal fires **once per stable idea**, reusing the in-conversation Persistence pattern already used by the §3 language gate — it does not re-emit every subsequent refining turn.
- The full block is printed (or re-printed) **only when the user explicitly asks to crystallize** / get the paste-ready block / start a proposal.
- Both the single-change protocol (§5) and the sliced protocol (§6) honor the same gate.
- Keep the qualitative readiness judgment; no numeric threshold is introduced.
- Explore mode stays read-only — this is a prompt/instruction edit, not code.

## Capabilities

### New Capabilities
- `explore-crystallization-on-demand`: governs *when* the `Ready to Propose` block is emitted — a once-per-stable-idea readiness signal plus user-triggered full emission, replacing state-triggered auto-emission, for both the single-change and sliced protocols.

### Modified Capabilities
- `explore-context-isolation`: the `explore-no-inline-proposal` requirement's crystallize trigger is reworded from state-triggered ("idea becomes clear → presents block") to on-demand (clear idea → one-line readiness signal; block only on explicit crystallize request). This is the **required** delta — its old `WHEN clear THEN presents block` scenario literally contradicts on-demand emission. The requirement's real intent (no inline `/sai-1-spec`, offer a paste-ready block, context isolation) is preserved verbatim in spirit; only the trigger clause changes.
- `explore-vertical-slicing`: consistency rider. The emission scenarios of `explore-slicing-assessment-before-crystallization` and `explore-sliced-crystallization-protocol` gain an explicit "on request" trigger clause so the whole explore-* family speaks one language about *when* a block emits. Routing (how many blocks, in what order) is unchanged.
- `explore-refactor-first-slicing`: consistency rider. The `slice-zero-emission-composition` scenario that promotes a single-block idea into a refactor → feature 2-block set gains the same "on request" trigger clause. Slice-0 composition/ordering is unchanged.

## Impact

- **Affected file**: `sai/instructions/explore.md` only (§4 routing references, §5 single-change protocol, §6 sliced protocol, and the §7 inline-proposal path). The Modified Capabilities above are spec-artifact deltas that this same single `explore.md` edit already satisfies — the timing language in those specs is aligned to the on-demand behavior the edit introduces; no additional code surface is touched.
- **Unaffected capabilities**: `explore-crystallization-block` (block section content) — its section format is unchanged. The slicing composition/ordering requirements in `explore-vertical-slicing` and `explore-refactor-first-slicing` are unchanged; only their emission *timing* language is aligned (see Modified Capabilities).
- **Unaffected commands**: no other `sai-*` command, wrapper, skill, schema, or OpenSpec template is modified. `/sai-1-spec` still receives the block content via the user's message in the new chat.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md`, `openspec/specs/explore-crystallization-block/spec.md`, `openspec/specs/explore-context-isolation/spec.md`, `openspec/specs/explore-vertical-slicing/spec.md`, `openspec/specs/explore-refactor-first-slicing/spec.md`

**External URLs**: <!-- None consulted. -->

## Additional Notes

- The §3 language gate's **Persistence** subsection is the concrete pattern being reused for "once per stable idea": track the target in-conversation, re-fire only when the tracked subject materially changes, hold state in-conversation only (never written to a file or config).
- §7 ("Inline proposal refusal") already prints the paste-ready block(s) when the user asks to create a proposal or run `/sai-1-spec` now. That request is itself an explicit crystallize request, so §7 remains the explicit-emission path and stays consistent with on-demand emission — it is not weakened by this change.
- The exact wording of the one-line readiness signal is left to implementation; this change does not pin a verbatim signal string.
