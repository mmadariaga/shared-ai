# orca-headless-runtime Specification

## Purpose
TBD - created by archiving change add-orca-agent-container. Update Purpose after archive.

## Requirements

### Requirement: Orca runs as a headless server

The runtime SHALL launch the extracted Orca application in server mode using `orca serve` or its equivalent extracted launcher, with the configured listen port and advertised pairing address. The advertised pairing address SHALL describe the client-reachable endpoint and SHALL NOT be used as an implicit bind-address override.

#### Scenario: Server starts with explicit endpoint settings
- **WHEN** the container starts with a valid port and pairing address
- **THEN** Orca starts in server mode without opening a desktop window
- **AND** it advertises the configured endpoint to pairing clients

### Requirement: Headless display uses Xvfb and software rendering

The runtime SHALL provide a container-local X display through Xvfb and SHALL force software rendering with `LIBGL_ALWAYS_SOFTWARE=1`. It SHALL operate without host `DISPLAY` access, a host GPU, or a D-Bus session.

#### Scenario: Container starts without host display access
- **WHEN** the container has no `DISPLAY` value and no GPU device
- **THEN** the entrypoint starts Xvfb on the configured display
- **AND** Orca reaches server readiness using software rendering

### Requirement: Readiness and process lifecycle are observable

The runtime SHALL capture Orca's one-time structured readiness output atomically in `/run/orca/readiness.json`, clear stale readiness and pairing artifacts before each start, and expose a repeatable health check that validates the current process and probes Orca's container-local bound endpoint. Host publication and externally advertised pairing reachability SHALL be separate operator diagnostics. The entrypoint SHALL forward termination signals, reap child processes, and return the server exit status.

#### Scenario: Health does not pass before Orca is ready
- **WHEN** Xvfb is running but Orca has not emitted its ready contract
- **THEN** the container health check remains unhealthy
- **AND** readiness becomes healthy only after the current Orca process is accepting its container-local bound endpoint

#### Scenario: Restart cannot reuse stale readiness
- **WHEN** Orca is restarted after a prior process wrote `/run/orca/readiness.json`
- **THEN** the stale readiness record is removed or invalidated before the new process starts
- **AND** health remains unhealthy until the new process emits readiness and accepts its container-local bound endpoint

#### Scenario: Host and advertised reachability are diagnosed separately
- **WHEN** the container-local Orca endpoint is healthy but a published or advertised endpoint cannot be reached
- **THEN** the container health check remains healthy for the Orca process
- **AND** operator diagnostics identify publication, proxy, DNS, or firewall reachability separately

#### Scenario: Stop terminates the complete process tree
- **WHEN** the container receives a normal termination signal
- **THEN** the entrypoint forwards the signal to Orca and Xvfb
- **AND** the container exits after child processes terminate without leaving an orphaned server

### Requirement: Normal operation does not bypass the Electron sandbox

The headless runtime SHALL run as the non-root service user and SHALL NOT require `--no-sandbox` for normal operation. Any unsupported root override SHALL fail clearly rather than silently weakening the sandbox.

#### Scenario: Non-root startup preserves sandboxing
- **WHEN** the standard Compose service starts
- **THEN** Orca runs as the non-root user without a `--no-sandbox` override
- **AND** the startup logs identify a clear failure if required sandbox permissions are unavailable

### Requirement: Pairing offers are retrievable without log leakage

When Orca generates a pairing offer, the entrypoint SHALL capture the complete structured offer in an owner-readable `/run/orca/pairing.json` file with restrictive permissions and SHALL expose a documented, narrowly scoped retrieval command for that file. Normal Compose logs SHALL contain only sanitized pairing status and non-secret failure reasons; they SHALL NOT contain pairing codes, device credentials, or encryption material.

#### Scenario: Operator retrieves a generated offer
- **WHEN** Orca reports an available pairing offer
- **THEN** the operator can use the documented retrieval command to read the complete offer as the non-root service user
- **AND** ordinary startup and health logs contain only sanitized status

#### Scenario: Pairing is unavailable
- **WHEN** Orca cannot generate a pairing offer
- **THEN** `/run/orca/pairing.json` is absent or reports only a sanitized unavailable status
- **AND** logs expose the documented non-secret reason and guidance

#### Scenario: Restart cannot return a prior pairing offer
- **WHEN** Orca restarts before the new process has generated a pairing offer
- **THEN** the previous `/run/orca/pairing.json` is removed or atomically invalidated before startup
- **AND** the retrieval command cannot return a prior-process offer while the new process is starting or pairing is unavailable
