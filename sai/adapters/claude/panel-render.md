# Claude Panel Render Binding

This harness has a native task panel (`panel: native`), declared here — never runtime-detected. It serves routed progress plans, the `sai-explore` stage TODO and idea list, and the `sai-merge` adaptive TODO; each surface's list, ownership, and timing rules live in its own contract.

- **Marker carrier.** The machine-readable marker carrier is the task's `description` field. The task `metadata` field stays unused because `TaskList` and `TaskGet` do not show it.
- **Render.** Each render converges the panel to the surface's full list: update existing entries in place with `TaskUpdate`, create new entries, and delete entries absent from the list with `TaskUpdate` `{"status": "deleted"}`. Updating in place keeps task ids stable, preserving each entry's identity.
- **Start clear.** A surface start clear reads task entries with `TaskList` for ids and `TaskGet` per id, and removes the entries bearing that surface's marker in `description` with `TaskUpdate`. The read never derives list content.
- **Emission.** Task-list emission is coordinator session only: Claude Code's task tools are used only by the coordinator.
- **Order.** Complete the render, or the degradation decision below, before the next worker dispatch or surface continuation.
- **Degradation.** If a panel tool call is rejected because the tool is unavailable at runtime, record exactly one visible notice — `> Panel rendering unavailable; continuing without task-panel updates.` — stop panel calls for the rest of the invocation, and continue without rendering, keeping the logical list state. The coordinator does not retry or runtime-detect another mechanism and does not activate a plain-text fallback. Other tool or contract errors remain failures.
