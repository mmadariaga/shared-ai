# orca-container-image Specification

## Purpose
TBD - created by archiving change add-orca-agent-container. Update Purpose after archive.

## Requirements

### Requirement: Ubuntu image contains the complete agent runtime

The image SHALL be based on Ubuntu 24.04 and SHALL include Git, Node.js, Claude Code, OpenCode, Xvfb, software-rendering support, and the Linux libraries required by the Orca Electron runtime. The image SHALL expose both agent CLIs on `PATH` for the non-root service user.

#### Scenario: Built image provides required executables
- **WHEN** the image build completes successfully
- **THEN** the image contains runnable `git`, `node`, `claude`, `opencode`, and Xvfb executables
- **AND** the Orca runtime libraries are installed without requiring host display libraries

### Requirement: Orca release is explicit and extracted without FUSE

The image build SHALL require an explicit Orca release tag and architecture-specific AppImage asset rather than resolving a moving `latest` release. The build SHALL extract the AppImage into the image and SHALL record the selected release tag in `/opt/orca/VERSION`; runtime SHALL NOT require FUSE, a FUSE device, or privileged mode.

#### Scenario: Missing or moving Orca version is rejected
- **WHEN** the image build has no explicit Orca release tag or attempts to use `latest`
- **THEN** the build fails before producing an image
- **AND** no unpinned Orca binary is accepted

#### Scenario: Extracted Orca version is inspectable
- **WHEN** an operator inspects a successfully built image
- **THEN** `/opt/orca/VERSION` identifies the exact Orca release tag
- **AND** the extracted Orca launcher is available for the headless runtime

### Requirement: Downloaded runtime artifacts are integrity verified

The image build SHALL verify the Orca AppImage against a pinned checksum or trusted release signature before extraction, and SHALL use pinned checksum or package-manager integrity metadata for Claude Code and OpenCode artifacts before installation. A verification mismatch or missing verification input SHALL fail the build; successful verification SHALL record the resolved version and architecture without recording secrets.

#### Scenario: Artifact verification fails
- **WHEN** a downloaded artifact does not match its pinned checksum or trusted signature, or an integrity input is missing
- **THEN** the image build fails before the artifact is installed
- **AND** no unverified runtime binary is included in the image

#### Scenario: Verified artifacts are inspectable
- **WHEN** an operator inspects a successfully built image
- **THEN** the selected Orca version, architecture, and verification record are available
- **AND** no credential or secret is included in that record

### Requirement: Image defaults to a non-root service user

The image SHALL define a dedicated non-root service user as its default runtime user, with ownership or permissions sufficient for `/workspace`, the Orca profile, and both agent CLIs. The image SHALL NOT depend on root-only Chromium sandbox bypasses for normal operation.

#### Scenario: Container starts without root
- **WHEN** the container is started without an overriding user
- **THEN** its main process runs as the dedicated non-root service user
- **AND** the service user can create files in the persistent workspace and state mounts

### Requirement: Sensitive runtime material is absent from the image

The image build SHALL NOT embed API keys, OAuth tokens, SSH private keys, pairing URLs or credentials, or authenticated CLI configuration. Build logs and image metadata SHALL not require secret values to install the runtime.

#### Scenario: Image is rebuilt from clean inputs
- **WHEN** an operator inspects image layers and build arguments after a successful build
- **THEN** no credential or pairing state is present
- **AND** authentication is still supplied through runtime mounts or secrets
