# ADR 0100: Neutral installed worker-binding destinations with harness-specific sources

<!-- adr-index: refs 0077; refs 0084; refs 0088 -->

## Status

Accepted

## Context

Claude Code and opencode require different worker dispatch and continuation instructions, so their routed worker bindings remain separate repository sources. Preserving that harness identity in each installed destination, however, forces otherwise shared forwarding instructions to select a harness-qualified path and can route a worker to the wrong binding.

## Decision

Keep the Claude Code and opencode worker-binding source trees separate, but project all seven routed phase bindings for each harness to the same relative destination shape: `orchestration/workers/bindings/<worker-filename>.md` within that harness's own SAI installation root.

Forwarding skills use the neutral installed path. The install manifest remains the sole active and retirement graph, and Copilot remains an inline adapter with no routed worker-binding projection.

## Alternatives Considered

- **Keep harness-qualified installed destinations** - preserves the current layout, but requires shared forwarding instructions to choose a harness identity.
- **Merge the binding sources** - removes path duplication, but erases real dispatch and continuation differences.
- **Use neutral destinations with harness-specific sources** (chosen) - removes harness selection from installed references while retaining the required source boundary.

## Consequences

- Claude Code and opencode install identical relative worker-binding destination graphs from different source trees.
- Forwarding references become harness-neutral without changing worker lifecycle behavior.
- Legacy harness-qualified destinations require hash-protected retirement records.
- Copilot continues to receive no routed binding projection.

## Related

- `openspec/changes/neutral-worker-binding-paths/design.md`
- `docs/adr/0077-harness-specific-worker-bindings.md`
- `docs/adr/0084-hybrid-declarative-installation-manifest.md`
- `docs/adr/0088-implementation-harness-projection-boundaries.md`
