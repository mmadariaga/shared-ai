# DDR 0129: Routed and utility command-card classes

## Status

Accepted

## Context

Routed commands own coordinator and worker lifecycles, while utility commands own only their command body. A uniform folder shape would hide that lifecycle distinction and imply routed behavior for commands that do not have a worker.

## Decision

Use routed command folders with `coordinator.md`, `worker.md`, and any retained `invocation.md`; use utility command folders with only `body.md`. The two card classes remain distinct in the command-card inventory and neither class is required to contain the other class's surfaces.

## Alternatives Considered

- Give every command the same folder shape — rejected because empty routed files would obscure ownership and invite accidental lifecycle expansion.
- Keep all command content flat — rejected because it hides the complete source surface for one command.

## Consequences

Maintainers can locate a command's complete source from its card folder, and a new command can be added without copying the shared protocols. Manifest projection and adapter selection must preserve the routed-versus-utility distinction.

## Provenance

User — the card-class boundary is an explicit design decision for this change.
