# setup-cli-version-check Specification

## Purpose
TBD - created by archiving change setup-checks-cli-min-versions. Update Purpose after archive.

## Requirements

### Requirement: Setup compares installed CLI versions with the supported minimum

Setup SHALL read the version of the `openspec` and `codegraph` binaries the PATH resolves before its install offers, as the first `X.Y.Z` of their `--version` output (a suffix such as `-beta` is ignored), and SHALL compare it with the minimum SAI supports: OpenSpec 1.13.1 and CodeGraph 1.6.4. A version equal to or above the minimum SHALL pass with no message. A CLI that was not installed at that read SHALL get no version comparison, so a CLI setup has just installed is never compared. When the version output holds no `X.Y.Z`, setup SHALL print one line saying it cannot verify the version and continue with no offer. The minimum versions SHALL be constants in one shared `bin/` module, with no maximum version and no automatic raise. `bin/install.js`, the install flow of `bin/install-flow.js`, and `sai/tools/prereqs.js` SHALL NOT run this check.

#### Scenario: Version at or above the minimum
- **WHEN** setup reads an installed `openspec` or `codegraph` version equal to or above its minimum
- **THEN** setup prints nothing about that CLI's version and offers no upgrade

#### Scenario: CLI not installed before setup
- **WHEN** a CLI is absent at the read taken before the install offers
- **THEN** setup keeps its existing install offer for it and does not compare the version of the CLI it installs

#### Scenario: Unreadable version
- **WHEN** the version output of an installed CLI holds no `X.Y.Z`
- **THEN** setup prints one line saying it cannot verify that CLI's version and continues with no upgrade offer

#### Scenario: Install flow is unchanged
- **WHEN** the install flow offers CodeGraph outside setup
- **THEN** no version comparison or upgrade offer runs

### Requirement: Setup offers an upgrade for a CLI below the minimum

When an installed CLI is below its minimum, setup SHALL report the installed and the minimum version and offer the upgrade: `codegraph upgrade` for CodeGraph and `npm i -g @fission-ai/openspec@latest` for OpenSpec. With a TTY, setup SHALL ask a `[y/n]` question and run the upgrade command after a yes; without a TTY it SHALL print the upgrade command and continue. The offer SHALL never block setup.

#### Scenario: Below the minimum without a TTY
- **WHEN** an installed CLI is below its minimum and stdin is not a TTY
- **THEN** setup prints the upgrade command and continues

#### Scenario: Upgrade declined
- **WHEN** the user answers no to the upgrade question
- **THEN** setup prints the upgrade command, does not ask again, does not offer `codegraph index`, and continues

#### Scenario: Upgrade command fails
- **WHEN** the upgrade command exits with a non-zero code
- **THEN** setup reports the failure, prints the manual command (`npm i -g @colbymchenry/codegraph@latest` for CodeGraph, `npm i -g @fission-ai/openspec@latest` for OpenSpec), and continues

#### Scenario: PATH still resolves an older binary after the upgrade
- **WHEN** the upgrade succeeds and the version read again from the PATH binary is still below the minimum
- **THEN** setup warns that the PATH resolves another, older binary, shows its path, and does not offer `codegraph index`

### Requirement: Setup offers a CodeGraph index rebuild after an upgrade

After a successful CodeGraph upgrade whose new read reaches the minimum, setup SHALL offer `codegraph index` only when the project already has `.codegraph/`, before the existing `codegraph init` index bootstrap. With a TTY it SHALL ask a `[y/n]` question and run `codegraph index` at the project root after a yes, printing the command when the user declines or the rebuild fails. Without a TTY, when CodeGraph is below the minimum and `.codegraph/` exists, setup SHALL print `codegraph upgrade` and then `codegraph index` and continue. Without `.codegraph/`, no rebuild offer SHALL follow, because the index bootstrap builds the index.

#### Scenario: Successful upgrade with an existing index
- **WHEN** the CodeGraph upgrade succeeds, the new read reaches the minimum, the project has `.codegraph/`, and the user answers yes
- **THEN** setup runs `codegraph index` at the project root

#### Scenario: Successful upgrade without an index
- **WHEN** the CodeGraph upgrade succeeds and the project has no `.codegraph/`
- **THEN** setup offers no rebuild and the existing `codegraph init` bootstrap builds the index

#### Scenario: Below the minimum with an index and no TTY
- **WHEN** CodeGraph is below the minimum, the project has `.codegraph/`, and stdin is not a TTY
- **THEN** setup prints `codegraph upgrade` and then `codegraph index`, and continues

#### Scenario: Rebuild fails
- **WHEN** `codegraph index` exits with a non-zero code
- **THEN** setup reports the failure, prints `codegraph index`, and continues
