# ADR 0084: Use a hybrid declarative installation manifest

<!-- adr-index: refs 0055; refs 0057 -->

## Status

Accepted

## Context

Installer, doctor, and uninstall currently maintain overlapping projection inventories. A per-file manifest would be exact but expensive to maintain, while directory-only rules cannot express harness-specific bindings, owner-managed agents, forwarding manifests, or JSONC merges safely.

## Decision

Make `sai/install-manifest.json` the single projection inventory. Use recursive rules for ordinary trees and explicit entries for exceptions. Each rule declares source, destination, harness allowlist, strategy, ownership, and drift policy. Expansion is order-independent: normalize and sort candidates, apply include then exclude, require named overrides for explicit replacement, reject undeclared destination collisions, and sort the final graph deterministically.

## Alternatives Considered

- **One entry per file** - maximally explicit, but creates avoidable maintenance churn.
- **Directory rules only** - compact, but cannot model special ownership and harness exclusions precisely.
- **Hybrid recursive rules plus explicit exceptions** (chosen) - keeps normal trees concise and exceptional surfaces auditable.

## Consequences

- Installer, doctor, and uninstall consume the same per-harness graph.
- Foreign routed bindings and Copilot-inapplicable sources are excluded declaratively.
- Invalid duplicate destinations fail before any managed write occurs.

## Related

- `openspec/changes/extract-sai-orchestration-core/design.md` - Decision D4
- `docs/adr/0055-re-derive-uninstall-deletion-set-verify-by-test.md`
- `docs/adr/0057-doctor-reuses-uninstall-enumeration-as-install-graph.md`
