# orca-runtime-configuration Specification

## Purpose
TBD - created by archiving change add-orca-agent-container. Update Purpose after archive.

## Requirements

### Requirement: Non-secret versions and endpoints are configurable

The environment SHALL accept explicit non-secret configuration for the Orca release, its integrity verification value, Claude Code version, OpenCode version, Orca listener port, Compose host publication address and port, and advertised pairing address through documented Compose variables or build arguments. The canonical variables SHALL distinguish `ORCA_PORT`, `ORCA_PUBLISH_ADDRESS`, `ORCA_PUBLISH_PORT`, and `ORCA_PAIRING_ADDRESS`; Orca's internal listener behavior SHALL not be represented as a configurable host bind address. Defaults SHALL be safe and SHALL not silently select a moving Orca release.

#### Scenario: Operator selects pinned tool versions
- **WHEN** an operator supplies the documented version variables before building
- **THEN** the image records and installs those exact Orca and agent-tool versions
- **AND** the selected values are inspectable without exposing credentials

#### Scenario: Operator selects distinct listener and publication settings
- **WHEN** an operator supplies `ORCA_PORT`, `ORCA_PUBLISH_ADDRESS`, `ORCA_PUBLISH_PORT`, and a client-reachable `ORCA_PAIRING_ADDRESS`
- **THEN** Orca receives the listener port and Compose maps the listener through the configured host address and port
- **AND** the pairing address is passed as an advertisement rather than treated as a listener bind override

### Requirement: Credentials enter only through runtime secrets or mounts

Authentication for Claude Code and OpenCode SHALL be supplied through Compose secrets, runtime secret files, or documented configuration mounts. Orca pairing SHALL NOT be a required startup credential: Orca SHALL generate its pairing offer and device credential at runtime, while resulting registrations and device keys SHALL persist through the Orca state mount. The image build SHALL not accept credentials as required build inputs, and startup diagnostics SHALL redact secret values.

#### Scenario: Authenticated tools start from mounted credentials
- **WHEN** valid credentials are provided through the documented runtime mechanism
- **THEN** both agent CLIs can authenticate as the service user
- **AND** Orca can generate a pairing offer without a preexisting pairing credential
- **AND** no credential is copied into an image layer or printed in startup output

### Requirement: Pairing advertisement rejects unusable endpoints

Configuration validation SHALL reject wildcard advertised values, `*`, `0.0.0.0`, and `::`. It SHALL reject a loopback advertised address when the configured topology is remote, while allowing loopback for an explicitly local-only setup. It SHALL allow a trusted hostname, IP address, or explicitly configured `http(s)` reverse-proxy URL that clients can actually reach.

#### Scenario: Unsafe pairing address is supplied
- **WHEN** the advertised pairing address is a wildcard, or is loopback while remote pairing is configured
- **THEN** startup fails with a remediation message
- **AND** no unusable pairing offer is published

#### Scenario: Local-only pairing address is supplied
- **WHEN** the operator explicitly selects a local-only topology and advertises a loopback address
- **THEN** configuration validation accepts the address
- **AND** the documentation states that remote clients cannot use that offer

#### Scenario: Reverse proxy address is supplied
- **WHEN** the advertised address is a valid trusted HTTPS or WSS-capable proxy endpoint
- **THEN** Orca advertises that endpoint while retaining the container's configured listener
- **AND** the operator can pair through the proxy rather than through an internal container address

### Requirement: External Docker execution is opt-in and socket-free

The environment MAY accept `DOCKER_HOST` for a separately managed rootless or remote Docker daemon, but SHALL not create or require a Docker daemon inside the image and SHALL not mount `/var/run/docker.sock`. The workspace and state mount paths SHALL remain unchanged when `DOCKER_HOST` is configured.

#### Scenario: No Docker execution is configured
- **WHEN** `DOCKER_HOST` is absent
- **THEN** the Orca Environment starts without a Docker daemon and without a Docker socket mount
- **AND** Orca and both agent CLIs remain usable for non-container work

#### Scenario: Remote Docker is configured later
- **WHEN** a trusted external `DOCKER_HOST` is supplied
- **THEN** the agent tools can use that endpoint according to their own configuration
- **AND** the container image, `/workspace` path, and persistent state layout do not change
