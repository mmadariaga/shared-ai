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
