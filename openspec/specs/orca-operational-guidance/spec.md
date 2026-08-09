# orca-operational-guidance Specification

## Purpose
TBD - created by archiving change add-orca-agent-container. Update Purpose after archive.

## Requirements

### Requirement: README provides an installation and first-run path

`docker/orca/README.md` SHALL document host prerequisites, required environment variables and secret mounts, Compose build/start/stop/inspection commands, the default service user, and the expected health/readiness transition for a first run.

#### Scenario: New operator follows the setup guide
- **WHEN** an operator has Docker Compose and the required secret material but no prior Orca Environment
- **THEN** the README provides enough steps to build and start the service
- **AND** the operator can verify that Orca and both agent CLIs are available without modifying the image manually

### Requirement: README explains authentication and pairing as secrets

The guide SHALL explain how to authenticate Claude Code and OpenCode through runtime configuration, that Orca generates pairing offers and device credentials at runtime rather than requiring them as startup inputs, how to retrieve the complete offer through the protected runtime file, how to configure a trusted pairing address or secured proxy, and why pairing URLs, device credentials, OAuth tokens, API keys, and SSH keys must be protected.

#### Scenario: Operator pairs a trusted remote client
- **WHEN** the service is healthy and the operator follows the pairing instructions through a trusted network or secured proxy
- **THEN** the operator can complete pairing without exposing the offer on an untrusted public interface
- **AND** the guide identifies the pairing offer as revocable secret material

### Requirement: README documents persistence and lifecycle maintenance

The guide SHALL document the workspace, Orca, Claude Code, OpenCode, credential, and pairing storage boundaries; backup and restore procedures; image upgrades; version pinning; and the requirement to preserve state mounts during recreation.

#### Scenario: Operator upgrades Orca
- **WHEN** an operator selects a new explicit Orca release tag
- **THEN** the guide directs them to back up state, rebuild the image, recreate the service while retaining volumes, and verify readiness
- **AND** it explains how to roll back the image and corresponding profile backup if needed

### Requirement: README states resource and network expectations

The guide SHALL describe that the image is large, software rendering may be slower than a native GPU-backed desktop, resource sizing depends on concurrent agent and browser workloads, and the Orca port must be exposed only through a trusted network, VPN, or secured WebSocket proxy.

#### Scenario: Operator plans remote exposure
- **WHEN** an operator wants to make the appliance reachable remotely
- **THEN** the guide requires a trusted network, VPN, or appropriately secured proxy
- **AND** it warns against direct unauthenticated public exposure of the Orca WebSocket endpoint

### Requirement: README documents the external Docker path without changing layout

The guide SHALL document `DOCKER_HOST` as a future opt-in connection to a separately managed rootless or remote Docker daemon, including the trust and network implications, and SHALL state that the initial environment does not run child containers locally.

#### Scenario: Operator adopts remote Docker later
- **WHEN** a separately managed Docker endpoint becomes available
- **THEN** the operator can configure `DOCKER_HOST` using the documented path
- **AND** repositories remain under `/workspace` while the image continues to run without privileged mode or a host Docker socket
