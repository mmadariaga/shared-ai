# Claude Idea-List Render Binding

This harness has a native task panel (`panel: native`), declared here — never runtime-detected. The binding renders the `sai-explore` idea progress list (item 11 of `sai/commands/explore/instructions.md`) on the harness's task panel through the harness's task tools, by whatever mechanism they provide:

- Each idea-list entry's label (`subject`) carries the slice's change name.
- Status is `pending | in_progress | completed`: a marked item renders `completed`, a cleared item renders back to `pending`, and the slice's active review item (reviewed-sai-1 or reviewed-sai-2, per `idea-list-review-in-progress-state`) renders `in_progress` while the post-crystallization review loop processes that slice — the research item and slice-crystallization items never carry `in_progress`.
- The machine-readable carrier is the task's `description` field, value `sai-idea-list:<change-name>` — the marker prefix `sai-idea-list:` plus the slice's `**Change name**` key. The task `metadata` field is NOT used: a live probe proved it write-only, invisible to `TaskList` and `TaskGet`.
- Every render converges the panel to the full idea list — the required outcome is that the panel holds exactly the full list with no foreign entries: update existing marker-bearing entries in place via `TaskUpdate` (task ids stay stable across renders, preserving the carrier's stable item identity), create entries that are new, and delete via `TaskUpdate` `{"status": "deleted"}` only entries that are no longer in the list (foreign entries displaced at first render, stale idea entries removed when the list shrinks).
- The start clear reads the panel's task entries (`TaskList` for ids, `TaskGet` per id), classifies by the description marker only, and removes exactly the marker-bearing entries. The read covers the marker only and never derives list content.
- Emission originates exclusively from the coordinator session, never from a worker subagent.

The idea-list contract rules (scope, render, ownership, lifecycle, timing) live in `sai/commands/explore/instructions.md`; this binding does not restate them.
