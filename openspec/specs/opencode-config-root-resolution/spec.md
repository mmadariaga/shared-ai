# opencode-config-root-resolution Specification

## Purpose
TBD - created by archiving change opencode-config-root-xdg. Update Purpose after archive.

## Requirements

### Requirement: Authoritative config root resolution
The resolution helper SHALL return the config directory reported by opencode debug paths when the probe succeeds; when the binary is absent, the probe exits non-zero or throws, or no config entry is parsed, it SHALL return `XDG_CONFIG_HOME/opencode` when `XDG_CONFIG_HOME` is set and not blank, and `~/.config/opencode` otherwise. The fetch tool, the installer, `doctor`, uninstall, and the generated permission rules SHALL resolve the opencode root in this one order.

#### Scenario: Custom root reported by the CLI
- **WHEN** the debug paths output contains a config entry pointing outside the default
- **THEN** the helper returns that reported directory as the config root

#### Scenario: Fallback without a usable probe
- **WHEN** the binary is absent or the probe yields no config entry, and `XDG_CONFIG_HOME` is unset
- **THEN** the helper returns ~/.config/opencode and installation proceeds as today

#### Scenario: XDG fallback without a usable probe
- **WHEN** the probe yields no config entry and `XDG_CONFIG_HOME` is set
- **THEN** the helper returns `XDG_CONFIG_HOME/opencode`

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
The shared resolver SHALL be the module `skills/universal/fetch/harness-root.js`, installed beside `fetch.js` for Claude Code and opencode and required from `bin/` in the repository, and it SHALL resolve the global root of both harnesses. The fetch tool, the installer, the permission-rule derivation, model customization, uninstall enumeration, and doctor SHALL consume it and SHALL keep no root resolution of their own, and SHALL honor explicit destBase, opencodeBase, and global agent or command root arguments without pinning tests to the hardcoded value. A caller MAY supply its own home directory, environment, and `opencode debug paths` probe to the resolver.

#### Scenario: Explicit test override wins over resolution
- **WHEN** a caller passes an explicit destination or base for tests
- **THEN** that supplied value is used and the resolver is not consulted for that call

#### Scenario: Supplied probe is honored
- **WHEN** the installer resolves the opencode root with a probe it was given
- **THEN** the resolver uses that probe's reported config directory

#### Scenario: Claude Code never runs the opencode probe
- **WHEN** the resolver resolves the Claude Code root
- **THEN** it does not run `opencode debug paths`

### Requirement: One resolved global root for every component
The fetch tool, the installer, `doctor`, uninstall, and the generated absolute permission rules SHALL work on the same global harness root, the one `skills/universal/fetch/harness-root.js` returns for the running process: on Claude Code the directory `CLAUDE_CONFIG_DIR` names when that variable is set and not blank, and `~/.claude` otherwise; on opencode the root of the authoritative config root resolution. When the resolved root changes (for example `CLAUDE_CONFIG_DIR` is set after an install in `~/.claude`), every component SHALL work only on the newly resolved root: a copy in the previously resolved root SHALL be neither migrated nor removed, `doctor` SHALL report the files missing from the resolved root, and a reinstall SHALL regenerate the permission rules with the resolved root's absolute path. Claude Code and opencode SHALL behave the same.

#### Scenario: Claude Code components honor CLAUDE_CONFIG_DIR
- **WHEN** `CLAUDE_CONFIG_DIR` is set and no explicit base is passed
- **THEN** the installer, `doctor`, uninstall, and the generated permission rules use that directory as the Claude Code root

#### Scenario: Claude Code default root
- **WHEN** `CLAUDE_CONFIG_DIR` is unset or blank
- **THEN** the same components use `~/.claude`

#### Scenario: Resolved root changes after an install
- **WHEN** an install exists in `~/.claude` and `CLAUDE_CONFIG_DIR` is then set to another directory
- **THEN** a reinstall writes only under the resolved root, with that root's absolute path in the permission rules, and leaves the `~/.claude` copy in place
- **AND** `doctor` reports the files missing from the resolved root
