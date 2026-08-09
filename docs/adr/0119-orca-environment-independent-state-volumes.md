# ADR 0119: Independent named volumes per state boundary with a common Orca parent

## Status

Accepted

## Context

The Orca Environment must persist four disjoint state boundaries across container recreation and image replacement: the workspace (`/workspace`), all Orca state (`/home/orca`), Claude Code state (`/opt/state/claude`), and OpenCode state (`/opt/state/opencode`). Orca's persistent state lives in case-sensitive paths under the service-user home (`~/.config/orca` and `~/.config/Orca` per the vendor's Linux documentation), and its layout varies by release. Operator-injected credentials and ephemeral pairing offers must never persist, while persistent paired-device registrations and device keys deliberately must (protected-backup material).

## Decision

Compose defines four named volumes with disjoint targets — `orca-workspace` → `/workspace`, `orca-state` → `/home/orca` (the entire service-user home, covering every Orca state location of the pinned release including case-sensitive variants), `claude-state` → `/opt/state/claude`, `opencode-state` → `/opt/state/opencode` — so every persistent boundary survives recreation and image replacement independently. Operator-injected credentials arrive as read-only secret mounts under `/opt/state/credentials/` and ephemeral pairing offers/codes live only in the container-ephemeral `/run/orca/` — neither ever enters a volume, image layer, or backup. The tool-state relocation variables (`CLAUDE_CONFIG_DIR`, `XDG_*`) are never exported process-wide or shell-wide: they are applied only inside each tool's launcher, so Orca cannot inherit them and the disjoint boundaries hold.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Four disjoint named volumes with a common Orca home parent (chosen) | Covers every release-specific Orca path without enumerating them; per-boundary lifecycle; credentials never persist; durable pairing material persists by design | Whole-home mount is a deliberately broad parent |
| Single shared `/data` volume | Simpler | Mixes workspace with credentials; defeats the backup/restore distinction; couples ownership |
| Dedicated `orca-credentials` named volume | Isolates injected secrets | Persists injected secrets — removal/rotation of the original could never revoke the copy; backups would contain keys |
| Excluding all pairing material from persistence | Simpler policy | Paired-device registrations and device keys must survive recreation for the "upgraded without re-pairing" scenario |
| Enumerating every release-specific Orca state path | Precise | Fragile — the path set varies by release and case-sensitivity variants are easy to miss |
| Host bind mounts | No named-volume plumbing | Couples the appliance to host paths |
| Exporting `XDG_*`/`CLAUDE_CONFIG_DIR` in the Compose environment or shells | Simpler launchers | Process-wide or shell-wide variables leak into Orca or unrelated commands, which can then store state inside a tool volume, violating the disjoint contract |

## Consequences

- Each state boundary has its own lifecycle: workspace data and tool state can be backed up, restored, and upgraded separately.
- Injected credentials are revoked by removal (per the launcher credential boundary, ADR 0121); durable device state is backed up with the sensitivity it warrants while ephemeral offers are never backed up.
- Orca's configuration and data stay exclusively under the service-user home; neither Orca nor unrelated shell commands ever see the relocation variables.

## Provenance

User — the design records it as Decision 3 with the `adr` family marker; the persistent-state spec mandates independently mounted storage with safe ownership.

## Related

- `openspec/changes/add-orca-agent-container/` — proposal, design (D3), and the six capability deltas.
- `docs/adr/0121-orca-launcher-credential-boundary.md` — the sibling decision on the credential channel.
