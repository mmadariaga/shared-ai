## MODIFIED Requirements

### Requirement: mirrored wrapper bootstrap fetch
Every active Claude Code and opencode `sai-*` wrapper that loads a per-command card SHALL fetch `@sai/commands/{name}/command-bootstrap.md` exactly once and SHALL preserve the complete invocation envelope.

#### Scenario: both harnesses use the renamed path
- **WHEN** corresponding Claude Code and opencode wrappers are read
- **THEN** both contain the same command-bootstrap fetch path for their command and retain `command_name` and the complete opaque `arguments_value`

### Requirement: unrelated launcher terminology remains unchanged
The rename SHALL not alter historical archived documents or unrelated CLI and historical uses of the term `launcher`.

#### Scenario: unrelated terminology is inspected
- **WHEN** historical or unrelated launcher references are read
- **THEN** they retain their existing terminology outside the active per-command bootstrap surface
