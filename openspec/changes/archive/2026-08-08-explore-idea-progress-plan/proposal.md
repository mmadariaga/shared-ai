**Complexity**: medium (2 capabilities, 8 requirements, no breaking change)

## Why

Explore's value is orientation — knowing where the explored idea stands — not a procedural checklist, and today that orientation lives only in the user's head across a long session. Every item a progress list needs can be marked from evidence explore already produces in-session (block emissions, review-pass tallies), so the list adds orientation with zero artifact risk.

## What Changes

- `sai-explore` maintains a chat-scoped idea progress list that tracks the explored idea rather than the command's own steps: one research item, and per crystallized slice a slice-crystallization item, a reviewed-sai-1 item, and a reviewed-sai-2 item.
- Per-slice items are added when the slicing assessment identifies each slice, and the slice-crystallization item is marked when that slice's block is emitted; the research item marks at the chat's first block emission.
- The list renders as plain in-conversation text from the first slice identification onward — while it holds only the research item it is not rendered, because a one-item checklist conveys no orientation in a mode that also supports sessions which never crystallize — and a turn renders the list once after all of its additions and state changes. The neutral task-list minimum threshold is not applied: it exists to suppress a harness panel for a trivially short declared plan and does not govern this list.
- Reviewed-sai-1 and reviewed-sai-2 items reflect the most recent completed review: a completed review over an available artifact set reporting no High findings marks the item — the manual review loop's base-form tally (per `sai/policies/artifact-review-contract.md`) and the supervised pipeline's converging pass alike — and a later completed review reporting High findings clears it; a transaction that ends without a completed review (absence report, blocked review, failed or cancelled reviewer) leaves the item unchanged.
- The list is strictly in-conversation: never written to any file and never derived from repository state; it reads no artifacts, so it never goes stale.
- No implementation item exists: implementation is completed by another command in another session, and inferring it from progression would assert more than is known.
- `GLOSSARY.md` gains the **Idea Progress List** term, its relationships, and a flagged ambiguity against **Progress Plan**.

## Capabilities

### New Capabilities

- `explore-idea-list`: the chat-scoped, in-conversation-only idea progress list in `sai-explore` — its item catalog (research; per-slice crystallization; per-slice reviewed sai-1 and sai-2), per-slice items added at slicing-assessment identification and marked at emission, plain in-conversation text rendering from the first slice identification, and research marking from in-session evidence.
- `explore-review-evidence-marking`: reviewed-sai-1 / reviewed-sai-2 list items mark exactly when the most recent completed review over an available artifact set reports no High findings and clear when the most recent completed review reports High findings, per the shared artifact-review finding contract, across both the manual review loop and the supervised pipeline.

### Modified Capabilities

- None

## Impact

- `sai/instructions/explore.md` — the sole instruction file the new behavior is expressed in (consistent with the prior explore-only change pattern).
- `GLOSSARY.md` — appends the **Idea Progress List** term, relationships, and flagged ambiguity (the spec phase's permitted root-glossary update).
- No wrappers (`commands/`), no `AGENTS.md`, no policy, skill, schema, or harness configuration is modified.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/explore.md` — read fully; item 9 manual review loop (tracked set :151, picker :153, tally :162), item 10 supervised pipeline convergence (:236), crystallization protocols (items 5/6)
- `sai/policies/artifact-review-contract.md` — shared severity vocabulary and base-form `Summary:` tally
- `sai/policies/todo-structure.md` — neutral minimum-threshold rule and single-source reference rule
- `openspec/specs/explore-post-crystallization-review-loop/spec.md` — review-loop requirements and the scope-confined-to-explore.md pattern
- `openspec/specs/explore-crystallization-block/spec.md` — `Ready to Propose` block format and emission rules
- `openspec/specs/progress-minimum-threshold/spec.md` — threshold single-sourcing
- `openspec/specs/progress-plan-declaration/spec.md` — the coordinator's Progress Plan (the different species)
- `openspec/specs/explore-context-isolation/spec.md` — explore's read-only coordinator discipline
- `GLOSSARY.md` — existing domain terms (Tracked Crystallized Set, Progress Plan, Review Finding)

**External URLs**: None

## Additional Notes

- The idea list is a different species from the routed **Progress Plan** (GLOSSARY): the plan is declared by a phase adapter, is static, and is marked only from worker progress events; the idea list is grown and marked only from in-session explore evidence, and its length is unknown until slices crystallize.
- Explicit decision — plain in-conversation text and no minimum threshold: the neutral task-list policy (`sai/policies/todo-structure.md`) governs the progress task list of a routed phase whose adapter declares a `progress_plan`; its state vocabulary, canonical step ids, and minimum threshold exist for that panel surface. The idea list has no declared plan, no canonical ids, no `in_progress` state, and an unknown length, so harness-panel semantics cannot be borrowed without redefining a single-sourced surface; rendering stays plain prose, identical on Claude Code and opencode. The threshold's panel-suppression purpose does not apply to prose, so no threshold rule is applied; the list first renders at the first slice identification instead, because a list holding only the research item conveys no orientation and would never move in the sessions the mode explicitly supports that never crystallize.
- Explicit decision — slice items are added at slicing-assessment identification and marked at that slice's block emission; because the assessment runs inside the crystallization turn, the unmarked state is a within-turn transition rather than a separately rendered state, and the list renders no earlier than the first slice identification.
- Explicit decision — review items follow the most recent completed review: a completed review over an available artifact set reporting no High findings marks the item, a later completed review reporting High findings clears it, and a transaction that ends without a completed review — an absence report, a blocked review, or a failed or cancelled reviewer — leaves the item unchanged, so a mark never asserts a set is reviewed against newer evidence to the contrary.
- Review-marking single-sourcing: severity vocabulary, finding shape, and tally form come from `sai/policies/artifact-review-contract.md` by reference; no inline restatement.
- Per-slice items are keyed to the slice's `**Change name**`; duplicate later identification of an already-tracked name adds no items (mirroring the tracked crystallized set discipline at `sai/instructions/explore.md:151`).
- The list is rendered as plain in-conversation text and behaves identically on Claude Code and opencode; no harness-specific task-list tooling is used.
