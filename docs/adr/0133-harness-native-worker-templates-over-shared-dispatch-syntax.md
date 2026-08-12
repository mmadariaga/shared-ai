# ADR 0133: Keep harness-native worker templates over shared dispatch syntax

## Status

Accepted

## Context

The Worker Matrix removes duplicated phase data, but Claude Code and opencode do not share a dispatch primitive or frontmatter contract. A single conditional prompt language would become a compatibility layer used by every installed worker and would hide harness-specific lifecycle behavior.

## Decision

Keep one parameterized binding template and one parameterized managed-agent template per supported harness. Share phase parameters through `bin/worker-matrix.js`, but render Claude Code `Agent(...)`/tunable frontmatter and opencode `task(...)`/permission frontmatter independently. Do not invent a common harness syntax.

## Alternatives Considered

- One cross-harness conditional template — rejected because it obscures validation and makes dispatch drift harder to detect.
- Fourteen complete hand-maintained files — rejected because it preserves the duplication this change removes.

## Consequences

The matrix owns shared phase identity and behavior data while each harness retains a small native rendering surface. Future lifecycle changes must update both templates and their parity tests, but neither harness pays for a fake compatibility language.
