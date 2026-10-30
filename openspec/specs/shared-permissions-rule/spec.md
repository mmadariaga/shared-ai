# shared-permissions-rule Specification

## Purpose
TBD - created by archiving change shared-tool-execution-permissions. Update Purpose after archive.

## Requirements

### Requirement: Shared Permission Source

The change SHALL provide one policy file that authorizes the closed sets of permitted `node` invocations per role, and wrappers SHALL carry their role entries directly instead of duplicating allowlists.

#### Scenario: Single source resolves grants
- **WHEN** a wrapper needs its permitted `node` set
- **THEN** the policy file names exactly that role set and the wrapper carries those entries verbatim

### Requirement: Copy Selection Verbatim

Copy selection SHALL stay first-existing (project-local first, then user-global, XDG fallback last) and SHALL never compose paths by joining root strings. A project-local candidate SHALL run exactly as written; a user-global or XDG fallback candidate SHALL run as the absolute path the existence check returned, with backslashes turned into forward slashes and double-quoted, so the command runs a path a tool returned and never a path the agent composed.

#### Scenario: Verbatim resolution
- **WHEN** resolving a tool path
- **THEN** the first existing candidate is used with no string-joined composition, as written when project-local and as the returned absolute path when global

### Requirement: Closed Set Evolution

A future tool SHALL require a policy update to the closed set before any wrapper gains it.

#### Scenario: New tool gated by policy
- **WHEN** a new `node` tool is needed
- **THEN** no wrapper permits it until the policy closed set is updated
