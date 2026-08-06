# ADR 0103: Retire the inline harness model in favor of two routed harnesses

## Status

Accepted

## Context

`npx shared-ai` currently maintains two routed harnesses and a GitHub Copilot
inline execution surface. The inline surface has one consumer and requires a
second coordination contract, installation inventory, and lifecycle model.

## Decision

`npx shared-ai` supports exactly Claude Code and opencode. Their existing
routed coordinator and worker bindings remain the supported execution model.
The Copilot prompt, agent, skill, installation-guide, and inline invocation
sources are retired rather than replaced by another compatibility layer.

## Alternatives Considered

- Keep the inline adapter without a supported consumer: rejected because it
  preserves maintenance cost without a requirement.
- Port Copilot to routed workers: rejected because no supported Copilot
  surface remains that needs the migration.

## Consequences

The supported harness architecture is smaller and has one coordination model,
but existing Copilot users must migrate before upgrading. Users who do not
uninstall first may retain orphaned files.

## Provenance

User decision recorded in the `retire-inline-harness-model` design.
