# DDR 0121: The post-setup customization result stays in memory and never touches agent files

## Status

Accepted

## Context

The post-setup agent customizer (`bin/agent-customization.js`) lets the user pick a harness, confirm a subset of managed agents, select settings once, and receive a per-agent override for every selected agent. The OpenCode half of the customizer runs a dependent provider → model → optional variant discovery flow against the installed opencode CLI. The customization result must stay in memory: no agent file is created, modified, or deleted, and no sidecar, selection record, or configuration is persisted — at all times, not merely by the current implementation.

## Decision

The per-agent local-override operation is the sole constructor of the final per-agent override shape, and the customization result stays in memory and non-persistent at all times: the override carries `agent`, `model`, the conditional `variant` key, and `persistent: false`, writes no file, and never touches agent bodies or frontmatter. The settings selector itself never constructs overrides, and no operation in the flow persists a selection or invites later persistence.

## Alternatives Considered

- **Write per-agent frontmatter overrides** — rejected: violates the zero-write contract.
- **Persist a sidecar selection record** — rejected: same zero-write violation.
- **Return a persistent-capable override shape** — rejected: would invite later persistence.

## Consequences

Every customization run — completed, cancelled, or failed — leaves the working tree untouched; correctness is verified by snapshotting the agents tree before and after a full traversal. This record is a DDR because the in-memory, non-persistent property must hold of the customization result at all times, stated as a property of the domain rather than as the mechanism that upholds it.

## Provenance

Derived — design.md Decision 9 of change discover-opencode-model-settings.
