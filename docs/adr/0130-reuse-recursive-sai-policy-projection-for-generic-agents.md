# ADR 0130: Reuse the recursive SAI policy projection for generic agents

## Status

Accepted

## Context

The installer already projects the `sai/policies/` tree recursively for both
supported harnesses. The new generic-agent behavior files are ordinary SAI
policy assets and do not require a distinct destination class or per-file
registration.

## Decision

Add the three generic-agent behavior files under `sai/policies/` and rely on
the existing recursive policy projection. Do not add manifest rows, installer
branches, configuration entries, or a separate agent projection for these
policy files.

## Alternatives Considered

- Add one manifest projection per policy: rejected because it duplicates the
  existing recursive policy surface and creates another ownership path.
- Add a dedicated generic-agent projection: rejected because the policies are
  shared SAI documents, not agent entrypoints.

## Consequences

Both supported harnesses receive the exact policy targets through the existing
installation path without installer changes. Future policy files continue to
inherit the recursive projection's ownership and drift behavior.

## Related

- `openspec/changes/canonicalize-opencode-agent-behavior/design.md` — Decision 4
