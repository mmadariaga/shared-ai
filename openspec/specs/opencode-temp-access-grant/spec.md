# opencode-temp-access-grant Specification

## Purpose
TBD - created by archiving change unify-sai-temp-root. Update Purpose after archive.

## Requirements

### Requirement: opencode external directory grant covers the SAI temp root

`bin/capabilities.js` SHALL generate, for opencode agent permissions, an allowed `external_directory` grant that covers the SAI temp root `temp-root.js` resolves for opencode on the installing platform, written with forward-slash separators and a trailing `/*`. When the literal `/tmp/opencode/*` grant already covers that root, no second grant SHALL be added. Computing the grant SHALL create no folder.

#### Scenario: Linux keeps the literal grant

- **WHEN** opencode permissions are generated on Linux
- **THEN** the `/tmp/opencode/*` grant covers the SAI temp root and no separate SAI temp root grant is added

#### Scenario: Other platforms grant the resolved root

- **WHEN** opencode permissions are generated on Windows or macOS
- **THEN** an allowed `external_directory` grant for `<resolved SAI temp root>/*` with forward-slash separators is present

### Requirement: opencode external directory grant covers the Claude Code SAI temp root

`bin/capabilities.js` SHALL also generate, for opencode agent permissions, an allowed `external_directory` grant for the SAI temp root `temp-root.js` resolves for Claude Code on the installing platform, written with forward-slash separators and a trailing `/*`, so an opencode agent dispatched from Claude Code can save reports in the coordinator's report directory. Claude Code agent permissions SHALL gain no such rule.

#### Scenario: opencode agents may write the Claude Code SAI temp root
- **WHEN** opencode agent permissions are generated
- **THEN** an allowed `external_directory` grant for `<Claude Code SAI temp root>/*` is present

#### Scenario: Claude Code agents gain no grant
- **WHEN** Claude Code agent permissions are generated
- **THEN** no rule for the Claude Code SAI temp root is added by this grant
