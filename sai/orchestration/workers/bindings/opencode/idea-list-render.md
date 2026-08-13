# Opencode Idea-List Render Binding

This harness has a native task panel (`panel: native`), declared here — never runtime-detected. The binding renders the `sai-explore` panel lists (items 4 and 11 of `sai/commands/explore/instructions.md`) on the harness's task panel via `todowrite` with the full `todos` array (full replacement of the panel's current content):

- Phase A (pre-crystallization): each stage-TODO entry's `content` carries the stage label; status is `pending | in_progress | completed` with the current stage `in_progress`, completed stages `completed`, and remaining stages `pending`; the machine-readable carrier is the `priority` field, value `sai-explore-stage:<stage-id>`.
- Phase B (from the idea list's first render): each entry's `content` carries the label with the slice's change name; status is `pending | in_progress | completed`: a marked item renders `completed`, a cleared item renders back to `pending`, and the slice's active review item (reviewed-sai-1 or reviewed-sai-2, per `idea-list-review-in-progress-state`) renders `in_progress` while the post-crystallization review loop processes that slice — the research item and slice-crystallization items never carry `in_progress`; the machine-readable carrier is the `priority` field, value `sai-idea-list:<change-name>`.
- Every render emits the full array, replacing the panel's current content, so after every render the panel holds exactly the full current list with no foreign entries. The phase-B first render replaces the phase-A stage TODO wholesale — the two never coexist.
- The start clear reads the panel's current entries via the session todo surface, classifies by the marker prefixes only (`sai-explore-stage:` and `sai-idea-list:`), and removes exactly the marker-bearing entries. The read covers the markers only and never derives list content.
- Emission originates exclusively from the coordinator session — opencode disables `todowrite` for subagents by default — never from a worker subagent.

The idea-list and stage-TODO contract rules (scope, render, ownership, lifecycle, timing) live in `sai/commands/explore/instructions.md`; this binding does not restate them.
