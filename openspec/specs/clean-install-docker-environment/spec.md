# clean-install-docker-environment Specification

## Purpose
TBD - created by archiving change fix-installer-bugs. Update Purpose after archive.

## Requirements

### Requirement: Clean end-user Docker image
The repository SHALL provide `docker/Dockerfile`, which builds a clean end-user environment for testing shared-ai installs. The image SHALL be based on `ubuntu:26.04`, SHALL install `ca-certificates`, `curl`, `git`, `gnupg`, and Node.js of the major version given by the `NODE_MAJOR` build argument (default `24`), and SHALL upgrade npm to its latest release. It SHALL run as an unprivileged `dev` user whose global npm installs go to `/home/dev/.npm-global`, with that prefix's `bin` directory on `PATH`, and SHALL start `bash` by default.

#### Scenario: Global installs need no root
- **WHEN** a user in the container runs a global `npm i -g` install
- **THEN** the package installs under `/home/dev/.npm-global` as the `dev` user and its binaries are on `PATH`

#### Scenario: Install from GitHub in a fresh container
- **WHEN** a user runs `npx github:mmadariaga/shared-ai` in a fresh container
- **THEN** the installer runs on a machine with no prior shared-ai, opencode, openspec, or CodeGraph state

### Requirement: Disposable container launcher
The repository SHALL provide `docker/run.sh`, which builds the `sai-clean` image from `docker/` and runs a container that is removed on exit, with the repository checkout mounted read-only at `/src`. Without arguments it SHALL open an interactive shell; extra arguments SHALL run as the container command instead of `bash`.

#### Scenario: Shell in a throwaway container
- **WHEN** a user runs `docker/run.sh` with no arguments
- **THEN** an interactive shell opens in a fresh `sai-clean` container with the checkout at `/src`, and the container is discarded on exit

#### Scenario: Command passed through
- **WHEN** a user runs `docker/run.sh sai-local-install-test`
- **THEN** the container runs `sai-local-install-test` instead of `bash`

### Requirement: Local checkout install helper
The image SHALL provide `sai-local-install-test`, which packs the read-only checkout at `/src` into a tarball under `/tmp` with `npm pack` and runs it with `npx -y file:/tmp/<tarball>`, forwarding its arguments to shared-ai. It SHALL pass the tarball as the npx package spec, not through `--package`, so that `npm_config_package` does not leak into the installer's nested `npx skills@latest` call.

#### Scenario: Install the checkout as npm would ship it
- **WHEN** a user runs `sai-local-install-test` in the container
- **THEN** the checkout at `/src` is packed and the packed shared-ai installer runs, leaving `/src` unmodified

#### Scenario: Arguments reach shared-ai
- **WHEN** a user runs `sai-local-install-test setup <dir>`
- **THEN** the packed shared-ai runs its `setup` subcommand on `<dir>`

### Requirement: Local project setup helper
The image SHALL provide `sai-local-setup-test [dir]`, which runs `sai-local-install-test setup <dir>` on the given directory, defaulting to `~/project`. When the directory does not exist, the helper SHALL create it as an empty git repository first.

#### Scenario: Default project is created
- **WHEN** a user runs `sai-local-setup-test` and `~/project` does not exist
- **THEN** the helper creates `~/project`, initializes an empty git repository in it, and runs shared-ai setup on it

#### Scenario: Existing directory is used as is
- **WHEN** a user runs `sai-local-setup-test <dir>` for an existing directory
- **THEN** the helper runs shared-ai setup on that directory without re-initializing it
