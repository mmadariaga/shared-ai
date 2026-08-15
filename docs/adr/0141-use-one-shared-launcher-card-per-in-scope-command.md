# ADR 0141: Use one shared launcher card per in-scope command

## Status

Accepted

## Context

The command wrappers are user-owned files whose frontmatter may be retuned while their bodies remain frozen. Keeping shared library wiring in both harness wrappers therefore allows an already materialized copy to retain stale behavior. The repository already projects the harness-neutral `sai/commands/` tree recursively to both supported harnesses.

## Decision

Use one harness-neutral `sai/commands/{name}/launcher.md` card for each of the 15 in-scope `sai-*` commands. Keep the launcher shared across Claude Code and opencode, and leave harness-divergent directives at the wrapper boundary. Have each thin wrapper load its harness fetch skill, boot adapter, and mapped launcher while retaining its invocation envelope and required harness-specific fields.

## Alternatives Considered

- **Keep all behavior in both wrappers** — rejected because it retains duplicated library wiring in frozen user-owned files.
- **Create separate per-harness launchers** — rejected because it duplicates shared content and creates two launcher sources of truth.
- **Use one shared launcher card per command** (chosen) — reuses the recursive `sai/commands/` projection while isolating harness-specific loads in the wrappers.

## Consequences

- Shared command behavior has one projected source of truth outside the model-customization command inventory.
- Both harnesses must preserve the same launcher mapping and load parity.
- Harness-specific explore loads remain small explicit wrapper exceptions.

## Provenance

User — `openspec/changes/thin-command-wrappers/design.md`, Decision: Use one shared launcher card per in-scope command.
