## ADDED Requirements

### Requirement: thin-dispatcher
`bin/install.js` SHALL be reduced to a dispatcher that reads `process.argv[2]` and routes to the appropriate flow module. It MUST NOT contain any install logic itself.

#### Scenario: default route
- **WHEN** `process.argv[2]` is `undefined` or `"install"`
- **THEN** dispatcher requires and runs `bin/install-flow.js`

#### Scenario: setup route
- **WHEN** `process.argv[2]` is `"setup"`
- **THEN** dispatcher requires and runs `bin/setup.js`

#### Scenario: unknown subcommand
- **WHEN** `process.argv[2]` is any other value
- **THEN** dispatcher prints `"Unknown subcommand: <value>. Usage: npx shared-ai [install|setup]"` to stderr and exits with code 1

### Requirement: install-flow-module
All existing install logic from `bin/install.js` SHALL be extracted verbatim into `bin/install-flow.js`. The extraction MUST NOT change any behavior, logic, or exported symbols.

#### Scenario: export preservation
- **WHEN** `bin/install-flow.js` is required
- **THEN** it exports the same symbols as the original `install.js` (`ensureDir`, `copy`, `copyWithWarn`, `copySkipIfExists`, `listMdFiles`, `installClaude`, `installOpencode`, `copyOpencodeConfig`)

#### Scenario: entrypoint preservation
- **WHEN** `bin/install-flow.js` is executed directly (not required)
- **THEN** it runs the same interactive checklist as the original `install.js` did

### Requirement: no-behavioral-change
The refactor MUST be a pure extraction. Any test or invocation that worked against the original `bin/install.js` install flow MUST produce identical results when routed through the dispatcher to `bin/install-flow.js`.

#### Scenario: install parity
- **WHEN** user runs `npx shared-ai` (no args) after the refactor
- **THEN** behavior is identical to `npx shared-ai` before the refactor

## MODIFIED Requirements

## REMOVED Requirements
