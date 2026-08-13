# DDR 0130: Change Overview uses an exact approval-oriented nine-section surface

## Status

Accepted

## Context

The Change Overview is a derived approval projection of five authoritative OpenSpec artifacts. Its former ten-section organization projected Target State and repeated audit-oriented detail, making approval-relevant decisions harder to locate. The change needs a stable surface that downstream contract tests and reviewers can rely on without changing the authoritative source artifacts.

## Decision

The Change Overview uses exactly these nine top-level sections, in order: Change Proposal, Scope, Capabilities, Target Architecture, Key Contracts, File Manifest, Review Scenarios, Implementation Approach, and Approval Summary. Editorial subsections remain permitted beneath any of those sections, while the overview no longer emits Target State or the former audit-oriented top-level sections.

## Alternatives Considered

- **Preserve the ten-section projection** — rejected: it retains detail but buries approval-relevant information in duplicated audit content.
- **Use an open-ended section set** — rejected: it weakens the stable structural contract consumed by reviewers and tests.

## Consequences

The approval surface is stable and concern-oriented, while detailed normative wording remains in the five authoritative sources. Any future structural change must update the generation contract, schema scaffold, capability specification, and focused contract tests together. This is a DDR because the exact section surface is a domain property of the Change Overview artifact.

## Provenance

User — the change proposal and delta capability specification mandate the exact nine-section approval surface.
