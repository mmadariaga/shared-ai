# Opencode Idea-List Render Binding

This harness has a native task panel (`panel: native`), declared here — never runtime-detected. The binding renders the `sai-explore` idea progress list (item 11 of `sai/instructions/explore.md`) on the harness's task panel via `todowrite` with the full `todos` array (full replacement of the panel's current content):

- Each entry's `content` carries the label with the slice's change name.
- `status` is `pending` | `completed` only: a marked item renders `completed`, a cleared item renders back to `pending`; no item carries `in_progress`.
- The machine-readable carrier is the `priority` field, value `sai-idea-list:<change-name>` — the marker prefix `sai-idea-list:` plus the slice's `**Change name**` key (the field is free-form; "high, medium, low" is descriptive guidance, not an enforced enum).
- Every render emits the full array, replacing the panel's current content, so after every render the panel holds exactly the full idea list with no foreign entries.
- The start clear reads the panel's current entries via the session todo surface, classifies by the marker prefix only, and removes exactly the marker-bearing entries. The read covers the marker only and never derives list content.
- Emission originates exclusively from the coordinator session — opencode disables `todowrite` for subagents by default — never from a worker subagent.

The idea-list contract rules (scope, render, ownership, lifecycle, timing) live in `sai/instructions/explore.md`; this binding does not restate them.
