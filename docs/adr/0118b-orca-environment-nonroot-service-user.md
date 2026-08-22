# ADR 0118b: Dedicated non-root service user with a validate-and-fail ownership contract

## Status

Accepted

## Context

The Orca Environment must run Orca's Electron runtime headlessly with its Chromium sandbox intact. Running as root would require `--no-sandbox` (weakening the sandbox) or a root initialization phase that fixes mount ownership at runtime (adding a privileged runtime surface). The persistent-state requirements demand that `/workspace`, the Orca home (`/home/orca`), the tool state directories (`/opt/state/{claude,opencode}`), and the secret directory (`/opt/state/credentials`) be usable by the runtime user, and that fresh named volumes inherit correct ownership.

## Decision

The image defines a dedicated non-root service user `orca` (uid/gid 1000) as the default runtime user. The image build pre-creates every known mount point (`/workspace`, the `/home/orca` seeding for `orca-state`, `/opt/state/{claude,opencode}`, `/opt/state/credentials`, and the ephemeral runtime directory `/run/orca` — uid/gid 1000, mode 0700) owned by `orca`, so fresh named volumes inherit correct ownership and `/run/orca` is writable without runtime privilege. `/run/orca` is container-ephemeral image content — deliberately not a Docker volume, so readiness and pairing files cannot outlive the container in an untracked volume. The runtime entrypoint then only validates that each persistent mount is writable by the service user and that each mounted secret is readable by it, failing with an actionable message naming the affected path and the required condition — it never attempts to repair a root-owned mount, which a non-root process cannot do. The runtime never passes `--no-sandbox`; an unavailable sandbox fails clearly at startup.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Image-time ownership + validate-and-fail runtime (chosen) | No root runtime path; sandbox stays intact; fresh volumes correct by construction; operator bind mounts fail actionably | Operator-supplied bind mounts are the only mounts that can mismatch — exactly the case the actionable failure covers |
| Root runtime with `--no-sandbox` | Simpler permission handling | Weakens the Electron/Chromium sandbox — rejected per spec |
| Root init phase that fixes paths then drops privileges | Works for any mount | Adds a privileged runtime surface to the image — rejected |
| `VOLUME /run/orca` | Automatic clean-up | Anonymous volume can survive container removal and retain pairing credentials outside the documented persistence boundaries — rejected |

## Consequences

- Fresh named volumes are correct by construction; the runtime validates and fails with actionable messages, never repairs.
- `/run/orca` is ephemeral: readiness and pairing artifacts are cleared before each start and cannot outlive the container.
- The non-root runtime preserves the Electron sandbox; an unsupported root/sandbox override fails clearly at startup.

## Provenance

User — the design records it as Decision 2 with the `adr` family marker; the headless-runtime spec mandates the non-root startup with sandbox preservation.

## Related

- `openspec/changes/add-orca-agent-container/` — proposal, design (D2), and the six capability deltas.
- `docs/adr/0117b-orca-appimage-build-time-extraction.md` — the sibling decision on build-time extraction.
