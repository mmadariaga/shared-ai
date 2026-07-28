# ADR 0085: Implement declared projection strategies with generic handlers

<!-- adr-index: pair-with 0084; refs 0029; refs 0055; refs 0057 -->

## Status

Accepted

## Context

Moving path classification into a manifest does not remove inventory drift if JavaScript still decides strategy from filenames or harness-specific branches. Existing code already contains reusable copy, hash, owner, retention, and JSONC merge behavior that must remain intact.

## Decision

Admit exactly four manifest strategies: `copy`, `owned-copy`, `merge-jsonc`, and `forwarding-manifest`. JavaScript implements one generic handler per strategy and receives all path, harness, ownership, and drift classification from the expanded manifest. It does not classify a projection by filename.

## Alternatives Considered

- **Keep filename-specific branches** - minimizes initial edits, but leaves a second implicit inventory in code.
- **Use one universal copy handler** - simplifies dispatch, but cannot preserve owner and JSONC merge semantics.
- **Use generic handlers for declared strategies** (chosen) - separates declarative classification from reusable execution behavior.

## Consequences

- Adding or moving a projection changes the manifest rather than three command inventories.
- Existing locally-modified retention, owner metadata, and JSONC augmentation remain strategy behavior.
- Strategy tests can run independently of specific managed filenames.

## Related

- `openspec/changes/extract-sai-orchestration-core/design.md` - Decision D5
- `docs/adr/0084-hybrid-declarative-installation-manifest.md`
- `docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md`
