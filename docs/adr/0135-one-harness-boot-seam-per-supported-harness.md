# ADR 0135: One harness boot seam per supported harness

## Status

Accepted

## Context

Wrapper files currently know both command-card paths and harness dispatch details. Duplicating that glue across every wrapper makes parity difficult to audit and allows neutral command content to acquire harness-specific behavior.

## Decision

Add exactly one adapter boot at `sai/adapters/claude/boot.md` and one at `sai/adapters/opencode/boot.md`. Each wrapper enters its own harness boot; the boot loads the neutral command-runner protocol, selects the requested command card, and owns only the harness-specific fetch and dispatch mechanics.

## Alternatives Considered

- Keep dispatch in every wrapper — rejected because it duplicates harness glue across all commands.
- Add one boot per phase — rejected because it multiplies harness-specific entry points and weakens parity checks.

## Consequences

The neutral root protocols and command cards remain harness-independent, while wrappers and projections must be kept mirrored at the boot boundary. A new supported harness requires one new boot and its explicit manifest projection.

## Provenance

User — the adapter seam is an explicit architecture decision for this change.
