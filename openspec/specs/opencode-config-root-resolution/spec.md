# opencode-config-root-resolution Specification

## Purpose
TBD - created by archiving change opencode-config-root-xdg. Update Purpose after archive.
## Requirements
### Requirement: Authoritative config root resolution
The resolution helper SHALL return the config directory reported by opencode debug paths when the probe succeeds and SHALL return ~/.config/opencode when the binary is absent, the probe exits non-zero, or no config entry is parsed.

#### Scenario: Custom root reported by the CLI
- **WHEN** the debug paths output contains a config entry pointing outside the default
- **THEN** the helper returns that reported directory as the config root

#### Scenario: Fallback without a usable probe
- **WHEN** the binary is absent or the probe yields no config entry
- **THEN** the helper returns ~/.config/opencode and installation proceeds as today

### Requirement: Install and permission derivation from the resolved root
The install, merge, and messaging logic SHALL derive the install target, the sai permission pattern and probe, the agents display path, and config prefix rewriting from the resolved root and SHALL preserve the ~/.config/opencode/sai/** literal only for the default root.

#### Scenario: XDG install writes under the reported root
- **WHEN** the resolved root is a custom directory and no explicit destination override is given
- **THEN** commands, sai content, skills, agents, and the merged permission entry land under that directory

### Requirement: Harness detection on the resolved root
detectInstalledEditors and the doctor harness inventory SHALL check the resolved opencode base instead of the hardcoded default while still honoring explicit base overrides for tests.

#### Scenario: XDG opencode reported as installed
- **WHEN** the resolved root exists on disk under a custom location
- **THEN** detection reports Opencode as installed instead of absent

### Requirement: Shared resolver consumption with preserved injection
Model customization, uninstall enumeration, and doctor SHALL consume the shared resolver and SHALL honor explicit destBase, opencodeBase, and global agent or command root arguments without pinning tests to the hardcoded value.

#### Scenario: Explicit test override wins over resolution
- **WHEN** a caller passes an explicit destination or base for tests
- **THEN** that supplied value is used and the resolver is not consulted for that call

