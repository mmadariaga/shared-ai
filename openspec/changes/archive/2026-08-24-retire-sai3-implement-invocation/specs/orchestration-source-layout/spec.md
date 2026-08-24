## MODIFIED Requirements

### Requirement: Active references exclude retired implementation invocation

Active sources, fixtures, tests, specifications, and maintained documentation SHALL reference the live routed implementation coordinator, worker, and step surfaces. They SHALL NOT treat the deleted `sai/commands/implement/invocation.md` as an available authority. Archived OpenSpec changes and ADRs MAY retain their original historical references.

#### Scenario: Active implementation references are audited

- **WHEN** maintained implementation references are audited
- **THEN** they point to the live coordinator, worker, and step-owned surfaces without requiring the deleted invocation source.

### Requirement: Retired managed implementation cleanup is ownership-safe

Install, update, doctor, and uninstall SHALL treat `commands/implement/invocation.md` as a retired managed destination. The manifest SHALL record both supported harnesses and every known managed SHA-256 variant, and lifecycle tooling SHALL remove the destination only when its content matches a registered hash.

#### Scenario: Fresh projection excludes the retired implementation invocation

- **WHEN** a Claude Code or opencode projection is expanded from the manifest
- **THEN** it omits `commands/implement/invocation.md` while retaining the active implementation coordinator and worker surfaces.
