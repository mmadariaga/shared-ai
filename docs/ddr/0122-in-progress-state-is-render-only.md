# DDR 0122: The in-progress state is render-only: setting, advancing, or resolving it never marks or clears an item

## Status

Accepted

## Context

The idea progress list's review items are marked and cleared exclusively from review-pass evidence (`explore-review-evidence-marking` requirements `review-item-no-high-pass-marks`, `review-item-per-slice-targeting`, and `review-item-evidence-only-marking`). The new `in_progress` state renders the active review check while the post-crystallization review loop processes a change. A naive reading could treat `in_progress` as a third mark state, coupling render state to the evidence hooks and risking accidental marks or clears.

## Decision

Setting, advancing, or resolving `in_progress` never marks or clears an item; the evidence-based marking hooks apply unchanged and remain the single authority over marks. The supervised pipeline (item 10) never sets the state.

## Alternatives Considered

- **Derive `in_progress` from marking evidence** (rendering the first uncompleted item as in-progress and tying render state to the hooks) — rejected: it couples render state to the evidence hooks and risks accidental marks or clears, which the proposal explicitly excludes.

## Consequences

The marking hooks keep sole authority over item marks; `in_progress` is a pure render-state overlay that can be set, advanced, and resolved without touching the evidence contract. Reversal would undermine the evidence-marking invariant the pipeline depends on. This record is a DDR because render-only-ness is a property that must hold of the idea progress list at all times — stated as a property of the domain, not as the mechanism that upholds it.

## Provenance

User — a user-approved design decision (design.md D2 of `idea-list-review-in-progress`).
