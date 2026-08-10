**Complexity**: medium (4 files, no breaking change)

## Why

In a long `sai-explore` session the idea progress list shows each slice's review items only as `pending` or `completed`, so while the user is actively reviewing a slice's artifacts the list gives no visual indication of where the review stands. Adding a render-only `in_progress` state for the two review items surfaces the current review check without touching the evidence-based marking hooks.

## What Changes

- The idea progress list's panel status vocabulary extends from `pending|completed` to `pending|in_progress|completed`, scoped to the reviewed-sai-1 and reviewed-sai-2 items only — no new item kind, and the research and slice-crystallization items never carry `in_progress`.
- While the post-crystallization review loop (item 9 of `sai/instructions/explore.md`) processes a change, the slice's first not-completed review check renders `in_progress`: it persists across review transactions and per-change picker re-shows; it advances to the slice's next not-completed review check when marked `completed` by a `High=0` tally (from a sai-1, sai-2, or change-overview review); a High-finding review leaves the active item unmarked and it stays the active item; and selecting `Skip` for the change or closing the loop resolves the state back to `pending`.
- `in_progress` is render state only: setting, advancing, or resolving it never marks or clears an item, and the `explore-review-evidence-marking` hooks stay intact. The supervised pipeline (item 10) never sets it.
- Not breaking: no change to the item catalog, the marking evidence rule, panel ownership, or panel lifecycle.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `explore-idea-list`: the render contract (`idea-list-rendering`) extends the panel status vocabulary with `in_progress` for the active review item, extends the re-render triggers to cover in-progress state set/resolve, and renders the active item as `- [~]` in the plain-text fallback; a new requirement `idea-list-review-in-progress-state` governs the trigger, persistence, advance, clear-keeps-active, and resolution semantics of the state.

## Impact

- `sai/instructions/explore.md` — item 9 (review loop: set the active review check at processing start, advance/keep it after each completed review, resolve it at `Skip` and loop close) and item 11 (render contract vocabulary, re-render triggers, fallback glyph, and a new review-in-progress state paragraph).
- `sai/orchestration/workers/bindings/claude/idea-list-render.md` — status vocabulary `pending | in_progress | completed` with `in_progress` scoped to the review items.
- `sai/orchestration/workers/bindings/opencode/idea-list-render.md` — same vocabulary change (mirror discipline).
- `openspec/specs/explore-idea-list/spec.md` — updated via this change's delta spec (synced at archive).

Explicitly not touched: `openspec/specs/explore-review-evidence-marking/spec.md` and item 10 of `sai/instructions/explore.md` (marking hooks and supervised pipeline unchanged), `sai/policies/todo-structure.md` (the neutral task-list policy is not applied to the idea list), and every routed worker binding.

## Proposal Research Documentation

**Local files**:
- `openspec/specs/explore-idea-list/spec.md` — the capability being amended (`idea-list-rendering` render contract)
- `openspec/specs/explore-review-evidence-marking/spec.md` — the marking hooks that must stay intact
- `sai/instructions/explore.md` — item 9 (post-crystallization review loop) and item 11 (Idea Progress List)
- `sai/orchestration/workers/bindings/claude/idea-list-render.md` and `sai/orchestration/workers/bindings/opencode/idea-list-render.md` — the two render bindings with mirror discipline
- `openspec/changes/archive/2026-08-09-explore-idea-list-native-panel/` — prior idea-list change for delta spec and binding patterns
- `GLOSSARY.md` — Idea Progress List terminology

**External URLs**: none.

## Additional Notes

- Both supported harnesses' native panels already expose an `in_progress` status (Claude Code task status, opencode todo status), so the extended vocabulary maps to existing harness mechanisms — the bindings only lift the previous prohibition.
- The plain in-conversation Markdown fallback renders the active review item as `- [~]`; this is the declared extension-point rendering, exercised by no supported harness today.
- The active review check is selected in fixed order (reviewed-sai-1 first, else reviewed-sai-2) at the moment the loop begins processing a change, and advance is forward-only: clearing a non-active review item does not move the active.
