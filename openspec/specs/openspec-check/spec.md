## ADDED Requirements

### Requirement: path-check
`bin/setup.js` SHALL verify that the `openspec` binary is resolvable in the system PATH before proceeding with any other setup step. The check MUST use `which` (Unix) or `where` (Windows) via `child_process.execSync`, or equivalent cross-platform detection, without spawning a full process unnecessarily.

#### Scenario: openspec found
- **WHEN** `openspec` binary is present in PATH
- **THEN** the check passes silently and setup continues to the next step

#### Scenario: openspec not found
- **WHEN** `openspec` binary is not in PATH
- **THEN** prints to stderr:
    openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec
  and exits with code 1; no further setup steps are executed

### Requirement: failure-message-exact
The error message on PATH-check failure MUST be exactly:

    openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec

No additional context, no color codes in the core message (color wrapper acceptable).

#### Scenario: exact message
- **WHEN** openspec is missing from PATH
- **THEN** stderr contains the exact string above

## MODIFIED Requirements

## REMOVED Requirements
