# ADR 0161: Capability deltas stay change-local until archive sync

<!-- adr-index: refs 0158 -->

## Status

Accepted

## Context

This change authors seven capability deltas under `openspec/changes/remove-cold-artifact-reviewer/specs/**`. The repository convention is that `/sai-archive` performs delta sync into baseline `openspec/specs/**`. Applying deltas during implementation would leave archive-time sync replaying REMOVED/ADDED against an already-mutated baseline.

This is change `remove-cold-artifact-reviewer`, Decision D6.

## Decision

Do not edit baseline `openspec/specs/**` during apply. The seven capability deltas under the change directory are the sole authored composition/spec source until `/sai-archive` syncs them into the main tree. Tests that must pin post-change capability text assert against those change deltas, not against baseline main specs.

## Alternatives Considered

- **Apply deltas into `openspec/specs/**` during implementation** — rejected; archive-time sync would replay against a mutated baseline and risk failure or corruption.
- **Change-local deltas until archive** (chosen) — preserves the archive-sync convention.

## Consequences

- Step 6 test retargeting points pre-archive capability pins at change deltas where needed.
- Instruction/policy/`GLOSSARY.md` sources still change in apply; only baseline capability specs wait for archive.

## Provenance

Codebase-forced — `openspec/changes/remove-cold-artifact-reviewer/design.md`, Decision D6.
