# ADR 0101: Exact Git-blob corpus for binding retirement ownership

<!-- adr-index: refs 0091 -->

## Status

Accepted

## Context

Moving routed worker bindings leaves 14 legacy harness-qualified destinations. A retirement record containing only each current source hash would miss older managed versions installed from prior releases, while unconditional deletion or line-ending-normalized hashing could misclassify edited content.

## Decision

For each legacy destination, derive `managedHashes` from every exact binding blob that a shipped manifest revision projected to that destination. Follow source history and correlate it with manifest revisions, hash the raw Git blob bytes with SHA-256, retain distinct lowercase digests per destination, and do not normalize line endings.

The resulting retirement corpus contains 22 hash occurrences and 22 globally distinct digests: two for each design destination, three for each implementation destination, two for each accessibility destination, and one for each remaining destination.

## Alternatives Considered

- **Hash only current sources** - simple, but strands older managed installations.
- **Delete every legacy destination** - complete cleanup, but can destroy user-edited files.
- **Preserve every legacy destination** - protects edits, but leaves all managed obsolete files behind.
- **Use the exact shipped Git-blob corpus** (chosen) - proves historical ownership while preserving unknown bytes.

## Consequences

- Install and uninstall can retire all recognized shipped variants safely.
- Edited and unrecognized legacy files remain protected and are reported as managed-hash mismatches.
- Historical hash evidence must be audited whenever another managed destination moves.
- Tests pin both per-destination cardinality and global digest uniqueness.

## Related

- `openspec/changes/neutral-worker-binding-paths/design.md`
- `docs/adr/0091-manifest-hash-evidence-for-retired-managed-destinations.md`
