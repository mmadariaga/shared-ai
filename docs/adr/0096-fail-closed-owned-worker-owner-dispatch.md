# ADR 0096: Fail closed when dispatching owned worker sidecars

<!-- adr-index: refs 0084; refs 0085 -->

## Status

Accepted

## Context

The installation manifest declares several Claude Code worker agents with the `owned-copy` strategy. The installer currently chooses between only the implementation owner and a design-owner default, so the spec worker is already assigned the design sidecar and a new `/sai-5-review` worker would inherit the same collision. Owner sidecars persist on user machines and control guarded uninstall behavior, making silent mis-ownership difficult to diagnose and unsafe to extend.

## Decision

Define an explicit agent-to-owner mapping for every `owned-copy` projection declared by the manifest. Resolve the owner through that complete map and throw when an owned agent has no entry. Add dedicated spec and review worker constants, preserve the existing design and implementation mappings, and verify map completeness against the manifest rather than a hard-coded test inventory.

## Alternatives Considered

- **Extend the existing conditional** - produces the smallest code change, but retains a default branch that can silently mis-own the next worker.
- **Derive sidecar names from agent filenames** - removes explicit entries, but silently invents ownership metadata and weakens the audit boundary.
- **Use an explicit complete map and fail closed** (chosen) - requires one entry per owned worker, but turns missing ownership policy into an installation error before user files are claimed.

## Consequences

- Fresh installs assign the spec, design, implementation, and review workers distinct owner sidecars.
- Adding a future `owned-copy` projection without an owner mapping blocks installation instead of defaulting to an unrelated owner.
- Existing upgraded installations with the stale shared spec/design sidecar are not repaired automatically by this decision.
- Manifest-derived tests become the guard that keeps declarative projections and imperative ownership handling synchronized.

## Related

- `openspec/changes/sai-5-review-coordinator-worker-split/design.md` - owner-dispatch decision
- `docs/adr/0084-hybrid-declarative-installation-manifest.md`
- `docs/adr/0085-generic-handlers-for-declared-projection-strategies.md`
