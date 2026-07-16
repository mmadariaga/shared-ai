## ADDED Requirements

### Requirement: path-check
`bin/setup.js` SHALL verify that the `openspec` binary is resolvable before proceeding with any other setup step. The check MUST probe the binary via `openspec --version` through `child_process.spawnSync` (exit-code semantics: `!error && status === 0`), consistent with the opencode and CodeGraph probes in `bin/install-flow.js`.

#### Scenario: openspec found
- **WHEN** the `openspec` binary is present
- **THEN** the check passes silently and setup continues to the next step

#### Scenario: openspec not found
- **WHEN** the `openspec` binary is not resolvable
- **THEN** setup offers to install it (see `install-offer`) instead of failing immediately

### Requirement: install-offer
Because openspec is **required** for the SAI workflow, `bin/setup.js` SHALL offer to install it when missing, via `offerOpenspecInstall()` in `bin/install-flow.js`. The offer function SHALL NOT call `process.exit` itself (it returns a boolean); the fatal exit lives in `main()`. This deliberately differs from the CodeGraph offer, which is non-blocking because CodeGraph is optional.

#### Scenario: absent, TTY, accepted, install succeeds
- **WHEN** openspec is missing, stdin is a TTY, the user accepts, and `npm i -g @fission-ai/openspec` succeeds
- **THEN** the offer returns true and setup continues to the next step

#### Scenario: absent, TTY, declined
- **WHEN** openspec is missing, stdin is a TTY, and the user declines
- **THEN** the install command is printed, the offer returns false, and `main()` exits with code 1 without running further setup steps

#### Scenario: absent, TTY, install fails
- **WHEN** openspec is missing, the user accepts, but the install command fails
- **THEN** the install command is printed, the offer returns false, and `main()` exits with code 1

#### Scenario: absent, no TTY
- **WHEN** openspec is missing and stdin is not a TTY
- **THEN** the install command is printed without prompting, the offer returns false, and `main()` exits with code 1

### Requirement: install-command-exact
The printed install command MUST be exactly:

    npm i -g @fission-ai/openspec

#### Scenario: exact command
- **WHEN** openspec is missing and the command is printed
- **THEN** stdout contains the exact string above

## MODIFIED Requirements

## REMOVED Requirements
