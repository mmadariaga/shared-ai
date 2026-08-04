# ADR 0098: Register the performance worker through managed projections

<!-- adr-index: refs 0084; refs 0085; refs 0096 -->

## Status

Accepted

## Context

The performance split adds a coordinator, invocation core, worker contract, two harness bindings, two forwarding skills, and a Claude Code managed agent. These files are installed outside the repository, where deterministic ownership, collision handling, doctor inventory, and guarded uninstall behavior depend on the shared manifest and managed-worker registry remaining synchronized.

## Decision

Register `sai-7-performance-worker` once in `MANAGED_WORKERS` and project every routed performance asset through `sai/install-manifest.json`. Continue deriving Claude owner and opencode managed-agent maps from the registry. Use the existing `owned-copy` sidecar contract for the Claude agent and fail closed if its owner mapping is unavailable.

Switch the Claude Code and opencode wrappers to routed entrypoints only in the same repository boundary that registers all dependencies. Leave the generic GitHub Copilot command projections and both Copilot exclude arrays unchanged so the inline command and prompt remain installed.

## Alternatives Considered

- **Copy routed assets with installer special cases** - avoids manifest records but splits ownership and inventory logic across sources.
- **Rely only on recursive projections** - reduces explicit records but cannot express managed Claude-agent ownership and collision behavior.
- **Use registry plus explicit manifest projections** (chosen) - adds synchronized records but preserves deterministic install, doctor, and uninstall behavior.

## Consequences

- Every routed performance surface has one deterministic source, destination, ownership policy, and uninstall target.
- Incompatible user-owned Claude agents block installation without overwrite or partial ownership.
- Registry, projection fixtures, and uninstall enumeration must change atomically.
- GitHub Copilot keeps both generic inline projections and receives no routed performance worker asset.

## Related

- `docs/adr/0084-hybrid-declarative-installation-manifest.md`
- `docs/adr/0085-generic-handlers-for-declared-projection-strategies.md`
- `docs/adr/0096-fail-closed-owned-worker-owner-dispatch.md`
- `openspec/changes/sai-7-performance-coordinator-worker-split/design.md`
