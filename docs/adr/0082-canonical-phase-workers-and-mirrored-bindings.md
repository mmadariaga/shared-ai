# ADR 0082: Keep canonical phase workers and bindings in mirrored orchestration subtrees

<!-- adr-index: refs 0077; refs 0078 -->

## Status

Accepted

## Context

Design and implementation share lifecycle mechanics but retain different policy, notices, gates, reconstruction state, and completion behavior. Claude Code and opencode also require different dispatch and continuation mechanisms, while GitHub Copilot remains inline.

## Decision

Keep canonical phase contracts at `sai/orchestration/workers/design-worker.md` and `sai/orchestration/workers/implementation-worker.md`. Mirror routed bindings under `workers/bindings/claude/` and `workers/bindings/opencode/`, each with explicit design and implementation files. Runtime skills and Claude agents remain thin forwarding surfaces.

## Alternatives Considered

- **Merge both phases into one conditional worker** - centralizes files, but couples unrelated phase policy.
- **Keep bindings inside runtime skills** - avoids forwarding files, but leaves canonical harness behavior duplicated at installed surfaces.
- **Use mirrored canonical worker and binding subtrees** (chosen) - isolates phase policy and harness mechanics while preserving runtime entry points.

## Consequences

- Claude Code keeps agent-ID continuation and opencode keeps task-ID continuation.
- Copilot receives no routed binding and continues through its inline adapter.
- Runtime skills and agents contain resolution metadata rather than canonical contract prose.

## Related

- `openspec/changes/extract-sai-orchestration-core/design.md` - Decision D2
- `docs/adr/0077-harness-specific-worker-bindings.md`
- `docs/adr/0078-design-workflow-selects-routed-or-inline-entry.md`
