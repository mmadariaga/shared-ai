# Opencode Panel Render Binding

This harness has a native task panel (`panel: native`), declared here — never runtime-detected. A consuming surface uses the session todo surface for panel rendering. The declaration is static, but a tool can still be unavailable in a particular runtime:

- The machine-readable marker carrier is the todo entry's `priority` field. The consuming surface supplies the marker value; the field is free-form, so descriptive priority guidance is not an enforced enum.
- Each render supplies the full `todos` array to `todowrite`, replacing the panel's current content. The full-array replacement leaves exactly the consuming surface's list and displaces foreign entries.
- A surface start clear reads the panel's current entries through the session todo surface, classifies entries by the carrier only, and removes the entries bearing that surface's marker. The read never derives list content.
- Emission originates exclusively from the coordinator session — opencode disables `todowrite` for subagents by default — never from a worker subagent.
- If a panel tool call is rejected because the declared tool is unavailable at runtime, the coordinator records exactly one visible notice — `> Panel rendering unavailable; continuing without task-panel updates.` — disables panel calls for the rest of that invocation, and continues the lifecycle without rendering. It preserves the logical list state, does not retry or runtime-detect another mechanism, and does not activate a plain-text fallback. This degradation applies to routed progress plans and the `sai-explore` idea list; other tool or contract errors remain failures.
- The render attempt, or this recorded degradation decision when the tool is unavailable, is still completed before a routed worker dispatch or other consuming-surface continuation.
