**Complexity**: high

## Why

The project needs a reproducible remote development appliance that runs Orca and both supported agent CLIs without installing or exposing host development tools. A persistent, headless container now establishes a secure workspace boundary while leaving future remote Docker execution as an optional external capability.

## What Changes

- Add a self-contained Ubuntu 24.04-based Orca Environment under `docker/orca/` with Orca, Claude Code, OpenCode, Git, Node.js, Xvfb, software-rendering support, and required Electron runtime libraries.
- Pin and extract a release-specific Orca AppImage during image construction so runtime operation does not require FUSE, privileged mode, or a Docker daemon.
- Verify downloaded Orca and agent runtime artifacts using pinned checksums, signatures, or package-manager integrity metadata before they are installed.
- Start Orca headlessly as a non-root service user with explicit port and pairing-address configuration, structured readiness output, and container-appropriate signal and restart handling.
- Persist repositories, Git worktrees, Orca state, agent configuration, authentication, and pairing state in independently mounted storage; keep secrets and pairing credentials out of the image.
- Add environment-variable, secret, and mounted-configuration inputs for ports, advertised pairing address, Orca and agent-tool versions, and authentication.
- Add a local Compose definition for build, start, stop, logs, health inspection, and volume management without mounting `/var/run/docker.sock`, enabling privileged mode, or bundling Docker-in-Docker.
- Document installation, authentication, pairing, persistence, upgrades, resource expectations, network exposure, backups, and the future `DOCKER_HOST` path to an external rootless or remote Docker daemon.

## Capabilities

### New Capabilities

- `orca-container-image`: Build a pinned Ubuntu 24.04 image containing Orca, both agent CLIs, Git, Node.js, Xvfb, and required runtime dependencies under a non-root service account.
- `orca-headless-runtime`: Run Orca in server mode with Xvfb, software rendering, readiness reporting, and container-safe process handling.
- `orca-persistent-state`: Preserve workspaces, worktrees, Orca state, agent configuration, authentication, and pairing state across image replacement or container recreation.
- `orca-runtime-configuration`: Configure ports, pairing advertisement, tool versions, and credentials through environment variables, secrets, and mounted configuration without baking sensitive values into the image.
- `orca-compose-operations`: Provide a local Compose lifecycle with explicit network and privilege boundaries and no host Docker socket or embedded Docker daemon.
- `orca-operational-guidance`: Document setup, authentication, pairing, persistence, upgrades, resource expectations, network exposure, backups, and external Docker integration.

### Modified Capabilities

None.

## Impact

- New infrastructure and documentation: `docker/orca/Dockerfile`, `docker/orca/compose.yaml`, `docker/orca/entrypoint.sh`, `docker/orca/README.md`, and supporting files required by the image and Compose setup.
- New runtime dependencies: an explicit Orca Linux AppImage release, Claude Code, OpenCode, Node.js, Git, Xvfb, and Ubuntu/Electron runtime libraries.
- New persistent volume contracts for `/workspace`, Orca profile/state, Claude Code state, OpenCode state, and separately managed credentials or configuration.
- New network surface: the Orca server port and WebSocket pairing path, which must be reachable only through a trusted network, VPN, or secured proxy.
- No existing application API or host Docker daemon integration is changed. Future child-container execution can target a separate daemon through `DOCKER_HOST` without changing `/workspace` or the state layout.

## Proposal Research Documentation

**Local files**: `AGENTS.md`; `README.md`; `GLOSSARY.md`; `openspec/config.yaml`; `openspec/specs/artifact-only-scope/spec.md`; `openspec/specs/tasks-routing-metadata/spec.md`; `openspec/specs/adr-creation-decision/spec.md`; `configs/opencode.jsonc`; `.gitignore`; `docs/adr/0000-INDEX.md`; `INSTALL.claude.md`; `INSTALL.opencode.md`.

**External URLs**:

- `https://raw.githubusercontent.com/stablyai/orca/main/docs/reference/headless-linux-server.md`
- `https://www.onorca.dev/docs/remote-servers`
- `https://www.onorca.dev/docs/cli/overview`
- `https://raw.githubusercontent.com/stablyai/orca/main/docs/reference/linux-glibc-compatibility.md`

## Additional Notes

- Orca's documented Linux distribution is a release-tagged x86_64 or arm64 AppImage. The image should extract it with `--appimage-extract`, record the selected tag in `/opt/orca/VERSION`, and run the extracted `AppRun` rather than depending on FUSE.
- The documented headless contract uses `orca serve`, an explicit port such as `6768`, `--pairing-address`, and optional JSON readiness output. Pairing URLs and embedded device credentials are secrets and need the same handling as passwords.
- Claude Code and OpenCode authentication is operator-supplied runtime material; Orca pairing offers and device credentials are generated at runtime, retrieved through a protected channel, and preserved through Orca's protected state.
- The repository currently has no Docker or Compose convention to extend. Docker paths are infrastructure/configuration work under the repository's existing routing vocabulary.
- The spec phase creates only this proposal and its capability specs; Dockerfiles, Compose files, scripts, and other infrastructure definitions belong to downstream implementation and apply phases.
