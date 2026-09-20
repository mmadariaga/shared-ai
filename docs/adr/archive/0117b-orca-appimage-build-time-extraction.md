# ADR 0117b: Orca AppImage is extracted at build time (no FUSE)

## Status

Accepted

## Context

The Orca Environment (`docker/orca/`) ships a pinned Orca Linux AppImage release. The AppImage format normally mounts its embedded squashfs via FUSE at first run, which requires a `/dev/fuse` device and usually privileged mode in containers — both rejected by the change's constrained Compose posture. The alternative of extracting inside the container at first start moves a write-heavy, failure-prone step into the runtime path, after the container is already committed to an untested image. The vendor provides no `.deb` packaging for this distribution.

## Decision

The image build downloads the pinned AppImage release asset (`orca-linux.AppImage` for `x86_64`, `orca-linux-arm64.AppImage` for `arm64`, selected by the committed `ORCA_ARCH` pin), verifies it against the pinned SHA-256 in `checksums.env`, extracts it with `--appimage-extract`, and installs the extracted tree at `/opt/orca/` with `AppRun` preserved. The release tag is recorded in `/opt/orca/VERSION`. The fixed production server command is the extracted `/opt/orca/AppRun serve` (with fixed argv entries) — no `orca` wrapper is installed on `PATH`, and the runtime never requires FUSE, a FUSE device, or privileged mode.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Build-time `--appimage-extract` (chosen) | Self-contained layer; no FUSE or privileged devices at runtime; deterministic `/opt/orca/AppRun` path; reproducible from the pinned tag | Build-time extraction layout could change in a future release (mitigated by the pin, the `/opt/orca/AppRun` existence assertion, and the Step 3 smoke) |
| FUSE mount at runtime | No extraction step | Requires `/dev/fuse` and usually privileged mode — rejected by the Compose posture |
| First-run extraction inside the container | Smaller image build | Runtime write + failure surface after startup; container could serve stale or broken state |
| Vendor `.deb` packaging | Native packaging | Not provided by the vendor for this distribution |

## Consequences

- The runtime path is deterministic (`/opt/orca/AppRun`), reproducible from `checksums.env`, and free of FUSE/privilege dependencies.
- The build fails before extraction when `ORCA_ARCH` does not match the build target's `TARGETARCH` mapping (`amd64 → x86_64`, `arm64 → arm64`), so a non-runnable AppImage can never enter an image.
- The first-build promise is explicitly scoped to the committed default architecture (`x86_64`/amd64); arm64 builds require the documented `ORCA_ARCH=arm64` + matching `ORCA_SHA256` pin update.
- Upgrades are deliberate: an operator edits `checksums.env` (Orca) or `package.json`/lockfile (agent CLIs) and rebuilds.

## Provenance

User — the proposal constrains the shape to a pinned, checksum-verified AppImage extracted at build time (no FUSE, no privileged mode, no Docker daemon); the design records it as Decision 1 with the `adr` family marker.

## Related

- `openspec/changes/add-orca-agent-container/` — proposal, design (D1), and the six capability deltas.
- `docs/adr/0118b-orca-environment-nonroot-service-user.md` — the sibling decision on the runtime user and mount ownership.
