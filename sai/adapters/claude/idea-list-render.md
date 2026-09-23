# Claude Idea-List Render Binding

Fetch @sai/adapters/claude/panel-render.md and use it for the panel mechanics.

This binding maps the `sai-explore` panel surfaces onto Claude Code task fields. The surface rules live in `sai/commands/explore/steps/common.md` (chat-start clear and Phase A stage TODO, loaded at invocation start) and `sai/commands/explore/steps/idea-list.md` (Phase B idea list, loaded later).

| Surface | Label field | Marker carrier |
|---|---|---|
| Phase A stage TODO | `subject` = stage label | `description` field, with value `sai-explore-stage:<stage-id>` |
| Phase B idea list | `subject` = entry label with the slice's change name | `description` field, with value `sai-idea-list:<change-name>` |
