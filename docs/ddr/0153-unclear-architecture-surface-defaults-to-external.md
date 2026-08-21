# DDR 0153: Unclear Architecture Snapshot classification defaults to external

## Status

Accepted

## Context

Architecture Snapshot is a review surface ordered by blast radius. When evidence does not establish whether callers of a planned public surface are controlled, classifying it as internal would hide the higher-risk review first. Forcing an Open Question on every unclear surface stalls design for classification noise.

## Decision

When classification is unclear, the surface SHALL default to `External Surfaces`. External means callers, users, or integrations outside the repository's controlled caller boundary may consume or depend on it; internal public means intentionally public callers constrained to the repository or another explicitly controlled part of the change.

## Alternatives Considered

- **Default internal** — rejected: hides higher blast radius from first review.
- **Require blocking Open Question on every unclear surface** — rejected: stalls design for classification noise.

## Consequences

- Design authoring and `design-target-state` require the conservative default.
- Reviewers see ambiguous public promises under the external block first.
- This is a DDR because conservative review ordering is a domain property of the Architecture Snapshot as a review surface.

## Provenance

user — `openspec/changes/split-architecture-snapshot-by-boundary/design.md`, Decision D2.
