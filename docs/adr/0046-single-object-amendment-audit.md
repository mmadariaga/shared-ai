# ADR 0046: Single-object amendment audit with overwrite-latest semantics

## Status

Accepted

## Context

The `spec-amendment-audit` capability requires recording in-place amendments in `.openspec.yaml`. Two shapes were possible: a single sub-object that overwrites on each amendment, or an array accumulating every amendment.

## Decision

Use a single sub-object `approval.specs.amendment.{at, notes}` that overwrites on each new amendment in the same session. The `notes` string SHOULD summarise the cumulative amended state where practical, but the normative contract is only that the sub-object reflects the latest amendment.

## Alternatives Considered

- **Array shape** (`approval.specs.amendments: [{at, notes}, ...]`). Rejected for now: adds consumer-parsing complexity for a rarely-multi-amendment case. The spec explicitly permits future evolution to an array; consumers MUST treat the single-object shape as a minimum, not a ceiling.

## Consequences

- Downstream consumers read exactly one sub-object; no array-walking required.
- A second amendment in the same session overwrites the prior audit entry rather than appending.
- Forward-compatibility to an array is preserved because the spec already documents the possible future evolution.

## Related

- `openspec/changes/add-sai-2-in-place-amendment/design.md` — Decision D3
- `openspec/changes/add-sai-2-in-place-amendment/specs/spec-amendment-audit/spec.md` — audit requirements
- `sai/instructions/design.md` — merge-preserve write pattern reused for the audit entry
