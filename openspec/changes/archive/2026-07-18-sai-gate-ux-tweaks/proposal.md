## Why

Two UX gates in the SAI explore/spec flow add avoidable daily friction: the post-crystallization review gate is a harness option-picker that auto-fires at crystallization (consuming vertical space before any downstream artifact even exists), and the artifact feedback gate is itself a picker that structurally cannot carry the feedback text, so selecting "Give feedback" makes the agent reply "no feedback found" — a confusing extra round-trip.

## What Changes

- **Review gate (explore.md item 9):** the post-crystallization review is no longer auto-offered as a harness Yes/No picker immediately after the `Ready to Propose` block. It becomes a **user-triggered, plain-text sí/no standing invitation** the user returns to when they come back to the explore window after running `/sai-1-spec` / `/sai-2-design` in other chats.
- **Crystallization block close (explore.md items 5/6):** the single-change and sliced crystallization outputs close with a **recommendation to keep the explore window open** and use it to review/refine the artifacts created next with `/sai-1-spec` and `/sai-2-design`.
- **Per-change review menu is unchanged:** the three-option navigation menu (`Review sai-1's artifacts` / `Review sai-2's artifacts` / `Skip`) stays a harness option-picker — it is a navigation menu, not the space-heavy part the user objected to.
- **Feedback gate (artifact-feedback-gate.md):** on selecting the feedback option, the gate **prompts cleanly** for the user's feedback (canonical phrasing rendered in the user's language at runtime) instead of reporting that no feedback was supplied.

## Capabilities

### New Capabilities
<!-- none — all touched behaviors already have capability specs -->

### Modified Capabilities
- `explore-post-crystallization-review-loop`: the global review invitation changes from an auto-fired, unconditional harness Yes/No picker into a user-triggered, plain-text sí/no standing invitation; the per-change picker and all other item-9 machinery are preserved.
- `explore-crystallization-block`: the single-change (item 5) and sliced (item 6) crystallization outputs close with a recommendation to keep the explore window open and review/refine the downstream `/sai-1-spec` and `/sai-2-design` artifacts there.
- `artifact-feedback-gate`: selecting the feedback option first emits a clean feedback prompt naming the artifacts, rendered in the user's language at runtime, rather than processing an empty feedback turn and reporting that none was supplied.

## Impact

- Edits confined to two shared instruction files: `sai/instructions/explore.md` (items 5/6 block close + item 9) and `sai/instructions/artifact-feedback-gate.md`.
- `sai/commands/sai-1-spec.md` and `sai/commands/sai-2-design.md` are **not** modified — both fetch `artifact-feedback-gate.md`, so the single edit there covers both callers.
- Harness-agnostic: rules live in shared instructions fetched by Claude Code, opencode, and Copilot. No wrapper edits under `commands/{claude,opencode,copilot}/`.
- The plain-text global review invitation is a **deliberate exception** to the "Closed-choice prompts" native-picker rule in `sai/instructions/remember.md`; the per-change picker continues to honor that rule.
- No new tests: these are prompt instructions; verification is by inspection against the updated instructions and a manual walk-through of the explore → sai-1 → review flow.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md` (items 5, 6, 8, 9); `sai/instructions/artifact-feedback-gate.md` (Present the gate + `## On "Give feedback"`); `sai/instructions/remember.md` (Closed-choice prompts rule, language policy); `openspec/specs/explore-post-crystallization-review-loop/spec.md`, `openspec/specs/explore-crystallization-block/spec.md`, `openspec/specs/artifact-feedback-gate/spec.md` (existing capability contracts); `openspec/changes/archive/2026-07-16-update-explore-review-loop-closing/` (analogous prior change pattern).

**External URLs**: <!-- none -->

## Additional Notes

- **Capability naming.** The explore brief grouped the item-9 and items-5/6 edits under one conceptual capability, "explore-review-gate." This proposal instead maps them onto the two existing capabilities they actually modify (`explore-post-crystallization-review-loop`, `explore-crystallization-block`), matching the OpenSpec convention that a behavior change is expressed as a delta against the capability that owns it — creating a new overlapping capability would orphan the existing specs. If a single combined capability is preferred, that is adjustable via the feedback gate.
- **Feedback-prompt wording (English-artifact rule).** The brief pins the canonical phrasing in Spanish (`Indícame a continuación tu feedback sobre {artifacts}`). Because instruction files and specs are English artifacts (per `remember.md` / token-efficient-languages) and the repo's established pattern (explore.md item 3) writes the canonical prompt in English and renders it in the user's language at runtime, this proposal pins the English canonical form `Share your feedback on {artifacts} below.` and cites the Spanish string as the worked user-language rendering. The exact English wording is adjustable via the feedback gate.
- **Standing-invitation model.** The review step is reframed from "gate that fired automatically at crystallization" to "standing invitation the user triggers on return after running sai-1" — matching the real flow where sai-1/sai-2 run in separate chats.
- **Inherent one-turn cost.** Giving feedback still costs one extra turn because an option-picker cannot carry free text; this is accepted as inherent and mitigated by a clean, non-accusatory prompt.
