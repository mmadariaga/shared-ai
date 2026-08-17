# Opencode Panel Render Binding

This harness has a native task panel (`panel: native`), declared here — never runtime-detected. A consuming surface uses the session todo surface for panel rendering:

- The machine-readable marker carrier is the todo entry's `priority` field. The consuming surface supplies the marker value; the field is free-form, so descriptive priority guidance is not an enforced enum.
- Each render supplies the full `todos` array to `todowrite`, replacing the panel's current content. The full-array replacement leaves exactly the consuming surface's list and displaces foreign entries.
- A surface start clear reads the panel's current entries through the session todo surface, classifies entries by the carrier only, and removes the entries bearing that surface's marker. The read never derives list content.
- Emission originates exclusively from the coordinator session — opencode disables `todowrite` for subagents by default — never from a worker subagent.
