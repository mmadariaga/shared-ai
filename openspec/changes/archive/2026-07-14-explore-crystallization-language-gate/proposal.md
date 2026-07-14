## Why

`sai-explore` already lets a non-English user pick the review language when reviewing an artifact (the review language gate), but crystallization is hard-forced to English by the current `Ready to Propose` invariant — so at the exact moment a user reviews and decides on the crystallized idea, the experience is inconsistent with reviews.

## What Changes

- Add a **crystallization language gate** to `sai-explore` that fires on an explicit crystallize request: when the user's dominant natural language is not English, ask a single 2-option question (`English (Recommended)` first + the current-language endonym) before printing any `Ready to Propose` block.
- The chosen language governs only the **free-text prose** of the block(s); machine-consumed **scaffolding stays English** (bold field labels, kebab-case Change name value, the `/sai-1-spec` command, and the "Open a new chat" line).
- Reconcile the review gate's `Ready to Propose` invariant: the review language gate never alters the block, and the block's prose language is governed solely by the new crystallization gate.
- Sliced crystallization: the gate fires once for the whole slice set; the chosen language applies to every emitted block, while per-slice scaffolding stays English.

## Capabilities

### New Capabilities
- `explore-crystallization-language-gate`: a language gate mirroring the review gate's machinery (question format, English-skip, `English (Recommended)`-first with verbatim `English`, persistence, decline/unclear fallback) but triggered by an explicit crystallize request; plus translation scoping that renders only free-text prose in the chosen language and keeps scaffolding English.

### Modified Capabilities
- `explore-review-language-gate`: rewrite the "Gate changes chat output only" requirement so the review gate never alters the `Ready to Propose` block and defers the block's prose language entirely to the crystallization gate.

## Impact

- `sai/instructions/explore.md` — adds a new crystallization language-gate item mirroring item 3, and rewrites item 3's `Ready to Propose` invariant (the sentence forcing the block to English "regardless of gate outcome" — anchor on that requirement text, not a line number, which drifts). No other `sai-*` command is affected.
- Behavioral (prompt-instruction) change only; no code, config, or file-format change. Downstream OpenSpec artifacts stay English per `remember.md:3`; the gate governs the in-chat block prose only.
- Qualifies `sai/instructions/remember.md:4` for crystallization turns only; `remember.md` itself is unchanged.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md` (items 3, 5, 6 and the emission gate), `openspec/specs/explore-review-language-gate/spec.md`, `sai/instructions/remember.md`, `sai/commands/sai-explore.md`.

**External URLs**: None.

## Additional Notes

- The review gate spec (`explore-review-language-gate`) is the machinery being mirrored; the two gates must stay behaviorally identical except for their trigger (artifact-review request vs. explicit crystallize request) and their tracked target (reviewed artifact set vs. current crystallized idea/slice set).
- The block becomes mixed-language (English scaffolding + non-English prose) when a non-English language is chosen — accepted as the cost of protecting the `/sai-1-spec` machine handoff, which parses the scaffolding markers.
- Gate state (chosen language + tracked idea/slice set) is held in-conversation only, never written to a file or config.
