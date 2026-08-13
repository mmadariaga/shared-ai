# ADR 0138: Use manifest projections plus hash-gated retirement records

<!-- adr-index: refs 0091; refs 0101; refs 0134; refs ddr:0123 -->

## Status

Accepted

## Context

The installer, doctor, and uninstall flows derive their active and retired inventories from `sai/install-manifest.json`. The existing retirement rules use exact raw Git-blob SHA-256 values, so line-ending normalization or deletion of an edited unknown copy would violate the repository's ownership safeguards. The design therefore treats the relocation as an inventory and source-layout migration, not as a runtime behavior rewrite.

## Decision

Represent the new Claude Code and opencode adapter destinations as active projections in `sai/install-manifest.json`. Add one harness-specific retirement record for the superseded neutral destination `orchestration/workers/bindings/idea-list-render.md` per harness, using the supplied three exact raw-byte SHA-256 variants for that harness. Keep install, doctor, and uninstall consuming the shared manifest expansion; delete a retired copy only when its bytes match a recorded digest, and preserve edited or unknown bytes.

## Alternatives Considered

- **Delete the old destination unconditionally** — simpler, but can destroy user edits or unknown content.
- **Hard-code the new and old paths in each consumer** — duplicates inventory and permits install, doctor, and uninstall to drift.
- **Omit retirement records** — avoids a manifest change, but strands recognized managed historical copies.
- **Use manifest projections plus hash-gated retirements** (chosen) — keeps one deterministic inventory while preserving modified and unknown installed files.

## Consequences

- Fresh installations contain only the harness-matching adapter destination.
- Recognized historical old copies are removed during install/update or uninstall.
- Edited and unknown old copies remain and are reported as hash mismatches by doctor/uninstall safeguards.
- Future managed path migrations must retain exact raw-byte historical hash evidence.

## Related

- `docs/adr/0091-manifest-hash-evidence-for-retired-managed-destinations.md`
- `docs/adr/0101-exact-git-blob-corpus-for-binding-retirements.md`
- `docs/adr/0134-materialize-worker-projections-from-the-manifest-and-retire-by-hash.md`
- `docs/ddr/0123-retirement-records-cover-every-historical-content-variant.md`

## Provenance

User — `openspec/changes/move-idea-list-render-to-adapters/design.md`, Decision 2.
