## MODIFIED Requirements

### Requirement: sai-payload-directory

The repository SHALL contain a `sai/` top-level directory with `sai/commands/` holding command cards. Routed cards SHALL provide `coordinator.md` and `worker.md`, plus a retained `invocation.md` only when that routed phase uses a separate invocation card. The implementation command SHALL use its coordinator, worker, and step library without requiring `sai/commands/implement/invocation.md`.

#### Scenario: Implementation command-card layout reflects retirement

- **WHEN** the implementation command directory is inspected
- **THEN** it contains the active coordinator, worker, templates, instructions, and step library without `invocation.md`.
