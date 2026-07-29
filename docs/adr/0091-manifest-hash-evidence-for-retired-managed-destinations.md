# ADR 0091: Manifest hash evidence for retired managed destinations

<!-- adr-index: refs 0084; refs 0085; refs 0055; refs 0057 -->

## Status

Accepted

## Context

Removing a source from a recursive managed projection prevents future installation, but historical installations may retain the former destination. Unconditionally deleting that destination can destroy user-modified content, while relying only on current ownership metadata misses copies created by older installer versions.

## Decision

Record retired destinations and every known repository-published SHA-256 content hash in the installation manifest. Install/update and uninstall may delete a retired destination only when its current bytes match one of those hashes. Doctor reports recognized cleanup candidates and unrecognized copies separately; modified or unknown content is preserved for manual cleanup.

The shared manifest expander validates and resolves the retirement inventory for each harness. Install, doctor, and uninstall consume that inventory rather than defining independent paths or hash tables.

## Alternatives Considered

- **Delete former destinations unconditionally** - simple, but can destroy user work.
- **Require a current ownership sidecar** - safe for current installs, but misses historical recursively projected copies.
- **Use manifest-owned historical hashes** (chosen) - provides positive ownership evidence across installer versions while preserving unknown content.

## Consequences

- Historical managed copies are removed automatically during install/update or uninstall.
- Modified and unrecognized copies survive and are visible in doctor diagnostics.
- Published historical byte variants must be appended to the manifest when discovered.
- Retirement behavior remains deterministic and shared across Claude Code, opencode, and GitHub Copilot.

## Related

- `openspec/changes/remove-legacy-inline-command-loaders/design.md`
- `docs/adr/0084-hybrid-declarative-installation-manifest.md`
- `docs/adr/0085-generic-handlers-for-declared-projection-strategies.md`
- `docs/adr/0055-re-derive-uninstall-deletion-set-verify-by-test.md`
- `docs/adr/0057-doctor-reuses-uninstall-enumeration-as-install-graph.md`
