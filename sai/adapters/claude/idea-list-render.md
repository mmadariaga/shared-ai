# Claude Idea-List Render Binding

Fetch @sai/adapters/claude/panel-render.md and use it for the harness panel mechanics. This binding supplies the `sai-explore` panel surface policy for both phases of the panel-ownership lifecycle (item 11 of `sai/commands/explore/instructions.md` and `sai/commands/explore/steps/idea-list.md`).

## Phase A — pre-crystallization stage TODO

- Each stage-TODO entry's label (`subject`) carries the stage label (`Explore change`, `Review edge cases`, `Implementation details`, `Crystallize`).
- The machine-readable carrier is the panel binding's `description` field, with value `sai-explore-stage:<stage-id>` (stage ids `explore-change`, `review-edge-cases`, `implementation-details`, `crystallize`).
- The stage TODO clears at block emission and never re-renders afterward; the panel stays empty until the deferred route choice resolves.

## Phase B — idea progress list

- Each idea-list entry's label (`subject`) carries the slice's change name.
- Status is `pending | in_progress | completed`: a marked entry renders `completed`, an unmarked entry renders `pending`, and the active route step renders `in_progress`. `reviewed-sai-1`, `reviewed-sai-2`, research, and slice-crystallization references are inert and render nothing.
- The machine-readable carrier is the panel binding's `description` field, with value `sai-idea-list:<change-name>` — the marker prefix `sai-idea-list:` plus the slice's `**Change name**` key.
- Emission originates exclusively from the coordinator session, never from a worker subagent.

## Chat-start clear

A new `sai-explore` chat's start clear removes exactly the entries bearing either marker prefix (`sai-explore-stage:` or `sai-idea-list:`) in the `description` field, leaving other surfaces' entries in place. The read covers the markers only and never derives list content.

The stage-TODO contract rules (Phase A) live in `sai/commands/explore/steps/common.md`, and the idea-list contract rules (Phase B) live in `sai/commands/explore/steps/idea-list.md`; this binding does not restate them.
