# orca-persistent-state Specification

## Purpose
TBD - created by archiving change add-orca-agent-container. Update Purpose after archive.

## Requirements

### Requirement: Workspace is a persistent mount

The Compose environment SHALL mount a named or explicitly provisioned persistent volume at `/workspace`. Repositories, Git worktrees, and files created by either agent CLI SHALL remain at that path across container recreation and image upgrades.

#### Scenario: Container is recreated with a new image
- **WHEN** an operator removes and recreates the Orca service without removing the workspace volume
- **THEN** all repositories and Git worktrees under `/workspace` remain available
- **AND** both agent CLIs can reopen the same paths

### Requirement: Orca state is stored independently from the image

The environment SHALL persist Orca user data, profile data, pairing registrations, device keys, and other Orca state under the service user's configuration home through one or more mounts independent of the image filesystem.

#### Scenario: Orca is upgraded without re-pairing
- **WHEN** the image is rebuilt with a different pinned Orca release while Orca state mounts are retained
- **THEN** the existing Orca profile and paired-device state are available to the new image
- **AND** the binary layer can be replaced without copying state into it

### Requirement: Agent state and authentication have durable storage boundaries

The environment SHALL persist Claude Code and OpenCode configuration and authentication independently from the image, using separate named volumes or explicitly documented mounted paths. Authentication material SHALL be readable by the non-root service user and SHALL remain outside version-controlled source and image layers.

#### Scenario: Agent configuration survives recreation
- **WHEN** the container is recreated with its agent state mounts intact
- **THEN** each CLI sees its prior configuration and authentication state
- **AND** Claude Code state is isolated from OpenCode state

### Requirement: State mounts enforce safe ownership

The startup path SHALL establish or validate ownership and permissions for writable persistent mounts without making the service root-owned at runtime. It SHALL fail with an actionable message when a supplied mount cannot be safely used.

#### Scenario: Incorrect mount permissions are detected
- **WHEN** a persistent mount is not writable by the service user
- **THEN** startup reports the affected mount and required ownership or permission condition
- **AND** Orca is not started against a partially writable state directory

### Requirement: Persistent state can be backed up and restored

Operational guidance SHALL identify every persistent volume or mount, distinguish workspace data from credentials and pairing state, and document a stop-consistent backup and restore procedure before image upgrades.

#### Scenario: Operator prepares an upgrade backup
- **WHEN** an operator follows the documented backup procedure
- **THEN** the workspace, Orca state, Claude Code state, OpenCode state, and credential mounts can be identified separately
- **AND** the procedure does not require embedding secrets in an image
