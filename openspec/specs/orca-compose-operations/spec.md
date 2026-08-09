# orca-compose-operations Specification

## Purpose
TBD - created by archiving change add-orca-agent-container. Update Purpose after archive.

## Requirements

### Requirement: Compose defines the local lifecycle

The Compose configuration SHALL support building, starting, stopping, restarting, viewing logs, inspecting health, and removing the service while retaining named persistent volumes unless an operator explicitly removes them. The default service command SHALL start the headless Orca runtime.

#### Scenario: Operator starts the environment locally
- **WHEN** an operator runs the documented Compose build and start commands
- **THEN** the image is built and the Orca service starts with its persistent mounts
- **AND** the service health status reflects the headless readiness contract

#### Scenario: Operator stops without deleting data
- **WHEN** an operator stops or recreates the Compose service without an explicit volume deletion action
- **THEN** the service stops cleanly
- **AND** workspace, tool state, credentials, and pairing state remain in their volumes

### Requirement: Compose has a constrained privilege and network posture

The Compose service SHALL run without `privileged: true`, without host PID or host network mode, and without a mount of `/var/run/docker.sock`. Host-side port publication SHALL be configurable through `ORCA_PUBLISH_ADDRESS` and `ORCA_PUBLISH_PORT`, and SHALL default to `ORCA_PUBLISH_ADDRESS=127.0.0.1` for a non-public local setup.

#### Scenario: Compose configuration is inspected
- **WHEN** an operator reviews the Compose service definition
- **THEN** no Docker socket, privileged flag, or embedded Docker daemon is present
- **AND** the published Orca port is bound according to the documented safe default

### Requirement: Compose exposes operational diagnostics

The Compose configuration SHALL provide a health check, restart behavior appropriate for a long-running appliance, access to sanitized logs that identify startup, pairing availability, selected endpoint, and failure reasons, and a documented narrowly scoped command to retrieve the complete generated pairing offer from `/run/orca/pairing.json` without printing it to normal logs.

#### Scenario: Orca cannot create a pairing offer
- **WHEN** Orca reports that pairing is unavailable
- **THEN** health or logs expose the non-secret reason and operator guidance
- **AND** the service does not claim a usable paired endpoint

#### Scenario: Operator inspects a healthy service
- **WHEN** an operator requests Compose health and logs
- **THEN** they can distinguish image startup, Xvfb startup, Orca readiness, and pairing status
- **AND** credentials, pairing codes, and tokens are redacted

### Requirement: Compose documents future external Docker connectivity

The Compose configuration and its documentation SHALL describe `DOCKER_HOST` as an optional external capability and SHALL state that enabling it does not grant the container host-level Docker socket access or require privileged mode.

#### Scenario: External Docker option is reviewed
- **WHEN** an operator evaluates future child-container execution
- **THEN** the documentation identifies the external daemon boundary and required network configuration
- **AND** it does not direct the operator to mount the host Docker socket
