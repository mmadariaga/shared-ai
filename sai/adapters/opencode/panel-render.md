# Opencode Panel Render Binding

This harness has a native task panel (`panel: native`), declared here — never runtime-detected. It serves routed progress plans, the `sai-explore` stage TODO and idea list, and the `sai-merge` adaptive TODO; each surface's list, ownership, and timing rules live in its own contract.

- **Marker carrier.** The machine-readable marker carrier is the todo entry's `priority` field. It accepts any string, so the consuming surface's marker value takes the place of `high`/`medium`/`low`.
- **Render.** Each render sends the surface's full `todos` array to `todowrite`, replacing the panel's current content.
- **Start clear.** A surface start clear reads the current entries through the session todo surface, removes the entries bearing that surface's marker in `priority`, and writes the remaining array back in one `todowrite`. The read never derives list content.
- **Emission.** Task-list emission is coordinator session only: opencode disables `todowrite` for subagents by default.
- **Order.** Complete the render, or the degradation decision below, before the next worker dispatch or surface continuation.
- **Degradation.** If a panel tool call is rejected because the tool is unavailable at runtime, record exactly one visible notice — `> Panel rendering unavailable; continuing without task-panel updates.` — stop panel calls for the rest of the invocation, and continue without rendering, keeping the logical list state. The coordinator does not retry or runtime-detect another mechanism and does not activate a plain-text fallback. Other tool or contract errors remain failures.
