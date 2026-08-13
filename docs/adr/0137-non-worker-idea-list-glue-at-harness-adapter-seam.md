# ADR 0137: Put non-worker idea-list glue at the harness adapter seam

<!-- adr-index: refs 0077; refs 0088; refs 0116 -->

## Status

Accepted

## Context

The idea-list render binding is harness-specific install-time runtime glue. It currently sits beside routed worker bindings although it does not participate in worker lifecycle, dispatch, continuation, or progress-plan behavior. Claude Code and opencode already have harness-qualified adapter seams and projections through which boot adapters are installed. The change must move the two current bindings to those seams, update the matching wrapper fetches and manifest projections, and retire only recognized managed copies of the old installed destination.

## Decision

Keep the routed worker-binding tree limited to worker contracts and place the Claude Code and opencode idea-list render bindings at `sai/adapters/claude/idea-list-render.md` and `sai/adapters/opencode/idea-list-render.md`. Project each source to its matching harness-qualified `adapters/{harness}/idea-list-render.md` destination, and have each `sai-explore` wrapper fetch the matching adapter path. The binding behavior, native-panel ownership, lifecycle semantics, and coordinator-only emission remain unchanged.

## Alternatives Considered

- **Keep the source under `sai/orchestration/workers/bindings/{harness}/`** — smaller path-only change, but it preserves a misleading worker-ownership boundary.
- **Place the binding in a shared neutral worker destination** — keeps the old inventory shape, but obscures the harness-specific runtime mechanism and does not align source ownership with the adapter seam.
- **Move the binding to the harness adapter seam** (chosen) — makes the source and installed ownership match the non-worker runtime-glue role without changing behavior.

## Consequences

- Harness-specific non-worker runtime glue has a canonical adapter location alongside each boot adapter.
- Worker Matrix counts and routed worker bindings remain limited to the seven worker phases.
- Wrapper fetches and manifest projections must stay paired per harness.
- The source relocation is a coordinated inventory migration rather than a rendering-behavior rewrite.

## Related

- `docs/adr/0077-harness-specific-worker-bindings.md`
- `docs/adr/0088-implementation-harness-projection-boundaries.md`
- `docs/adr/0116-idea-progress-list-expressed-in-explore-md.md`

## Provenance

User — `openspec/changes/move-idea-list-render-to-adapters/design.md`, Decision 1.
