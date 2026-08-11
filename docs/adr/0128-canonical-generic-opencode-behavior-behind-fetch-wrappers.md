# ADR 0128: Keep generic OpenCode behavior in canonical SAI policies behind Fetch wrappers

## Status

Accepted

## Context

The managed generic OpenCode agent files currently embed complete behavior
contracts. Each installed entrypoint therefore carries a frozen copy, so a
later SAI policy correction does not reach an existing agent until the body is
manually replaced. The repository already provides an exact-file Fetch
namespace for shared SAI policies.

## Decision

Store the `budget`, `executor`, and `explore` behavior contracts in
`sai/policies/{name}-agent.md`. Keep each managed OpenCode entrypoint as a
thin wrapper whose body contains exactly `Fetch @sai/policies/{name}-agent.md`.
Use the existing Fetch boundary rather than native OpenCode imports or copied
behavior bodies.

## Alternatives Considered

- Keep full behavior bodies in the managed agents: rejected because each
  entrypoint becomes a stale duplicate of the canonical contract.
- Use native OpenCode imports: rejected because it would move behavior
  ownership out of the harness-neutral SAI policy namespace.

## Consequences

The three generic agents resolve one current behavior source and later global
policy updates become visible through the established Fetch mechanism. The
entrypoints are intentionally incomplete when read without Fetch resolution,
so their exact policy targets must remain stable and independently available.

## Related

- `openspec/changes/canonicalize-opencode-agent-behavior/design.md` — Decision 1
