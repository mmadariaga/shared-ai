# Opencode Idea-List Render Binding

Fetch @sai/adapters/opencode/panel-render.md and use it for the harness panel mechanics. This binding supplies the `sai-explore` idea progress list's surface policy (item 11 Phase B of `sai/commands/explore/steps/idea-list.md`):

- Each entry's `content` carries the label with the slice's change name.
- Status is `pending | in_progress | completed`: a marked entry renders `completed`, an unmarked entry renders `pending`, and the active route step renders `in_progress`. `reviewed-sai-1`, `reviewed-sai-2`, research, and slice-crystallization references are inert and render nothing.
- The machine-readable carrier is the panel binding's `priority` field, with value `sai-idea-list:<change-name>` — the marker prefix `sai-idea-list:` plus the slice's `**Change name**` key.
- Emission originates exclusively from the coordinator session, never from a worker subagent.

The idea-list contract rules (scope, render, ownership, lifecycle, timing) live in `sai/commands/explore/steps/idea-list.md`; this binding does not restate them.
