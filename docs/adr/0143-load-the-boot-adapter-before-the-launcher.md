# ADR 0143: Load the boot adapter before the launcher

## Status

Accepted

## Context

The thin-wrapper skeleton must retain only harness fetching, boot routing, launcher loading, and the opaque invocation envelope. The existing wrappers load behavior directives inline, so moving those directives to a launcher necessarily changes their relative position around the boot adapter.

## Decision

Order every ordinary wrapper as harness fetch skill, harness boot adapter, and mapped launcher, followed by the invocation envelope. Keep the boot adapter as the routing-only seam and preserve all behavior directives in the launcher or, where presence diverges, in the harness wrapper. Treat directive-set parity and focused runtime/projection tests as the guard against an outcome change.

## Alternatives Considered

- **Resolve the launcher before boot routing** — rejected because it defeats the launcher boundary and makes the wrapper responsible for behavior loading before card selection.
- **Preserve the historical full wrapper order** — rejected because it retains the duplicated frozen wiring the change is intended to remove.
- **Load the boot adapter before the launcher** (chosen) — produces the fixed thin skeleton while keeping routing and behavior ownership separate.

## Consequences

- The boot adapter now loads before the behavior directives for every command.
- The wrapper/launcher union must be checked against the pre-change directive inventory.
- A launcher resolution failure must stop the command before later behavior loads.

## Provenance

Codebase-forced — `openspec/changes/thin-command-wrappers/design.md`, Decision: Load the boot adapter before the launcher.
