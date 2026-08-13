**Complexity**: high (7 capabilities, ~23 requirements, 4 affected paths)

## Why

The edge-case review currently fires as an unannounced questionnaire once the idea solidifies, and each new end-of-flow concern (edge cases today, implementation details next) keeps bolting hidden gates onto crystallization. Staging the pre-crystallization lifecycle into a visible, user-paced progression removes the surprise, hands pacing to the user, and preserves the technical decisions surfaced during exploration — which are otherwise lost before the `/sai-2-design` handoff.

## What Changes

- The pre-crystallization lifecycle becomes a four-item staged TODO — `Explore change` → `Review edge cases` → `Implementation details` → `Crystallize` — rendered during exploration and advanced only on explicit user intent (the literal `next` token or clear natural-language intent), never auto-fired on the agent's "solid" judgment.
- The existing mandatory no-skip edge-case review becomes stage 2, preserving its gate exactly: no `Ready to Propose` block before agreement, a premature explicit crystallize enters the review with no skip path, and `--fast-track` never bypasses it.
- A new light implementation-details stage (stage 3) surfaces the technical decisions surfaced during exploration as `I1`…`In` with confirmation; an empty set emits `- None` and advances without iteration.
- The `Ready to Propose` block gains a dedicated `**Implementation Details**` section (the agreed `I1`…`In`, the "what") and an `**Overview language**` durable-reminder line; rationale and alternatives stay in **Decisions & Rationale** / **Alternatives Considered**.
- A new overview-language gate (gate 9) mirrors the crystallization language gate (gate 8) with the ambient language recommended; English input skips it; `--fast-track` selects both defaults (prompt in English, overview in ambient).
- The idea-list render bindings gain a phase-A/phase-B panel lifecycle: the stage TODO owns the panel during exploration and is cleared at crystallization, when the existing post-crystallization idea progress list takes the panel.
- The supervised `start-pipeline` flow forwards the gate-9 value through the existing chained design envelope; `sai-1-spec` does not parse or forward it.
- Conversation-only state throughout; `sai-explore` remains read-only with no persistence to `.openspec.yaml` or artifacts.

## Capabilities

### New Capabilities
- `explore-pre-crystallization-stages`: the four-stage user-paced pre-crystallization TODO — render contract, user-controlled advancement, the Crystallize stage hosting slicing and both language gates, and the phase-A/phase-B panel lifecycle shared with the idea progress list.
- `explore-implementation-details`: the light implementation-details stage (surfacing + confirmation as `I1`…`In`, empty set emits `- None` without iteration) and the `**Implementation Details**` handoff section.
- `explore-overview-language-gate`: gate 9 — the overview-language gate fired at crystallization, mirroring gate 8 with the ambient language recommended, `--fast-track` defaults, block reminder, and supervised-only forwarding.

### Modified Capabilities
- `explore-edge-case-review`: the review's trigger moves from the agent's solidity judgment to user advancement into the `Review edge cases` stage (or a premature crystallize request); the review no longer displaces the one-line readiness signal.
- `explore-edge-case-gate`: crystallization-waits-for-agreement, premature-crystallize no-skip, and fast-track non-bypass preserved, re-anchored to the staged progression.
- `explore-crystallization-language-gate`: the translation-scoping scaffolding list gains the two new block labels (`**Implementation Details**`, `**Overview language**`).
- `explore-idea-list`: panel ownership renegotiated into two phases — the stage TODO owns the panel before crystallization, the idea list takes it over from its first render.

## Impact

- `sai/commands/explore/instructions.md` (folded structure) — the pre-crystallization lifecycle (items 4-8 and 11) is restructured into the four-stage progression; the `Ready to Propose` block template gains the `**Implementation Details**` section and the `**Overview language**` line; the idea-list panel contract gains the phase-A/phase-B ownership split.
- `sai/orchestration/workers/bindings/opencode/idea-list-render.md` and `sai/orchestration/workers/bindings/claude/idea-list-render.md` — phase-A (stage TODO) and phase-B (idea list) lifecycle, a stage-ownership marker distinct from `sai-idea-list:`, and a start-clear covering both surfaces; both harness bindings mirror each other.
- `sai/commands/explore/body.md` — unchanged: the `--overview-lang` and `--fast-track` parsing already exists and is reused by gate 9.
- `GLOSSARY.md` — two new domain terms appended (Pre-Crystallization Stage TODO, Overview Language) with relationship and ambiguity entries.
- Specs — three new capability specs; four modified capabilities (`explore-edge-case-review`, `explore-edge-case-gate`, `explore-crystallization-language-gate`, `explore-idea-list`).
- No new dependencies; no breaking changes.

## Proposal Research Documentation

**Local files**:
- sai/commands/explore/instructions.md — the current explore lifecycle: edge-case review gate, emission gate, pre-crystallization closure, crystallization protocols (items 5/6), crystallization language gate (item 8), review loop (item 9), supervised pipeline (item 10), idea progress list (item 11)
- sai/commands/explore/body.md — `--overview-lang` and `--fast-track` parsing
- sai/orchestration/workers/bindings/opencode/idea-list-render.md — opencode panel render binding
- sai/orchestration/workers/bindings/claude/idea-list-render.md — Claude Code panel render binding
- openspec/specs/explore-edge-case-review/spec.md, explore-edge-case-gate/spec.md, explore-handoff-edge-cases/spec.md — the edge-case review and handoff contract the staged flow preserves
- openspec/specs/explore-crystallization-language-gate/spec.md — gate 8, the machinery gate 9 mirrors
- openspec/specs/explore-crystallization-on-demand/spec.md — readiness signal and explicit-request emission
- openspec/specs/explore-review-language-gate/spec.md, explore-pre-crystallization-closure/spec.md, explore-idea-list/spec.md, explore-pipeline-token/spec.md, explore-pipeline-supervision/spec.md — adjacent lifecycle surfaces

**External URLs**: - None

## Additional Notes

- **Readiness signal**: with the edge-case review moved to a user-paced stage, the review no longer displaces the one-line readiness signal; the signal reverts to its own `explore-crystallization-on-demand` rule (fires once per stable idea at the solid threshold, names the trigger action) and never advances a stage.
- **Stage 4 positioning vs crystallization**: advancing into the `Crystallize` stage positions the TODO only; the slicing assessment and both language gates run on the explicit crystallize request, preserving the on-demand emission gate.
- **Sliced crystallization**: every per-slice block carries the full agreed `I1`…`In` list (or exactly `- None`); no mechanical per-slice attribution is applied (unlike `Edge Cases`).
- **Direct crystallize jump**: an explicit crystallize request from a stage before the implementation-details stage skips that stage; the block then carries `**Implementation Details**: - None`. The edge-case review always fires first (no skip path) when not yet agreed.
- **`--overview-lang` precedence**: the interaction between a user-passed `--overview-lang` and a gate-9 choice (both feed the supervised `overview_language`) is left to the design phase.
- **Token literal**: the request's "next-step token" is pinned as the shorter literal `next` in the specs, recognized with the same bare/dominant-intent machinery as `review-loop` / `start-pipeline`. The explore conversation discussed longer candidate literals (`next-step`, `continue-exploration`); the shorter `next` is a deliberate spec-phase choice for brevity. **The design phase MUST confirm the literal with the user before implementation**; if a longer literal is chosen, the specs' firing-condition and scenarios are updated accordingly.
- **`/sai-1-spec` block consumption**: the `Ready to Propose` block is consumed by the spec phase as free-form request text (the `crystallized_block` / envelope) with no strict field-label validation, so the two new block elements (`**Implementation Details**`, `**Overview language**`) pass through as request prose. Implementation SHALL verify the spec phase tolerates the new labels unchanged and record any consumption adjustment at the spec phase if a validation surface is found.
- **Feature under implementation**: the structure refactor (worktree-1) is not yet merged; this change targets the folded structure (`sai/commands/explore/instructions.md`).
