# Claude Idea-List Render Binding

Fetch @sai/adapters/claude/panel-render.md and use it for the harness panel mechanics. This binding supplies the `sai-explore` idea progress list's surface policy (item 11 of `sai/commands/explore/instructions.md`):

- Each idea-list entry's label (`subject`) carries the slice's change name.
- Status is `pending | in_progress | completed`: a marked item renders `completed`, a cleared item renders back to `pending`, and the slice's active review item (reviewed-sai-1 or reviewed-sai-2, per `idea-list-review-in-progress-state`) renders `in_progress` while the post-crystallization review loop processes that slice — the research item and slice-crystallization items never carry `in_progress`.
- The machine-readable carrier is the panel binding's `description` field, with value `sai-idea-list:<change-name>` — the marker prefix `sai-idea-list:` plus the slice's `**Change name**` key.
- Emission originates exclusively from the coordinator session, never from a worker subagent.

The idea-list contract rules (scope, render, ownership, lifecycle, timing) live in `sai/commands/explore/instructions.md`; this binding does not restate them.
