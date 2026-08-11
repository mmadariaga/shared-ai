# ADR 0127: Keep one ordered edge-case list and partition it at sliced handoff

## Status

Accepted

## Context

The `sai-explore` edge-case review records scope-boundary behaviors for one
stable idea before crystallization. A sliced idea produces several ordered
`Ready to Propose` blocks, but the edge-case review is intentionally performed
once for the whole idea. Reviewing or rewriting cases independently per slice
could lose global identifiers, duplicate a boundary, or make the slices
disagree about the agreed scope.

## Decision

Maintain one ordered, agreed `E1` through `En` edge-case list for the whole
idea. At crystallization time, mechanically assign each item to the one slice
whose user-facing behavior owns that scope boundary, preserving the item's
identifier, wording, and global order. Emit `- None` for a slice with no
attributed items. Do not start a new review or rewrite the list per slice.

## Alternatives Considered

- Review each slice independently — rejected because it duplicates interaction
  state and can produce inconsistent scope decisions.
- Copy the complete list into every slice — rejected because it repeats cases
  and obscures which slice owns each boundary.

## Consequences

- Whole-idea agreement is recorded once and remains stable across every
  crystallized slice.
- Each edge case has exactly one slice owner while retaining a globally stable
  identifier and wording.
- The handoff renderer must maintain deterministic ownership attribution and an
  explicit empty-list marker for slices without cases.
- Changing this boundary model later would require revising the review and
  handoff interaction contracts together.

## Related

- `openspec/changes/explore-edge-case-review/design.md` — Decision 2
- `openspec/changes/explore-edge-case-review/specs/explore-handoff-edge-cases/spec.md`
