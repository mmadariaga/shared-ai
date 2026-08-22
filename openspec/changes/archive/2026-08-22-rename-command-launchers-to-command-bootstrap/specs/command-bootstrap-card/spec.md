## MODIFIED Requirements

### Requirement: per-command bootstrap naming
Each in-scope command SHALL use `sai/commands/{name}/command-bootstrap.md` as its harness-neutral per-command bootstrap card, and the retired `launcher.md` card SHALL not remain at that active path.

#### Scenario: renamed card is present
- **WHEN** an in-scope command card is resolved
- **THEN** the harness loads `sai/commands/{name}/command-bootstrap.md` and no active `sai/commands/{name}/launcher.md` exists

### Requirement: bootstrap content remains harness-neutral
Each command bootstrap SHALL contain only its command-specific loading directives and SHALL not contain harness-specific tokens or invocation-envelope fields.

#### Scenario: routed bootstrap preserves its binding
- **WHEN** a routed command bootstrap is read
- **THEN** it retains the command's neutral worker-binding load without adding Claude Code or opencode routing data
