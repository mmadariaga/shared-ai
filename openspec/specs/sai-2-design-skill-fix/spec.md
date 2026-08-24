# sai-2-design-skill-fix Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.
## Requirements
### Requirement: no-dead-skill-reference

The supported design wrappers SHALL reference only existing routed worker, coordinator, and step surfaces and SHALL contain no dead legacy design-skill or retired-source fetch. Every design-related fetched path SHALL resolve to an active routed surface; the deleted monolithic design instruction, deleted invocation body, and any `.claude/skills/openspec-continue/SKILL.md` path SHALL not be treated as available authorities.

#### Scenario: sai-2-design loads without missing-file warning

- **WHEN** `/sai-2-design` is invoked
- **THEN** no "file not found" or equivalent error is produced for a design-related path; all referenced worker, coordinator, and step paths resolve to existing active files

#### Scenario: no-retired-design-fetch-remains

- **WHEN** either supported design wrapper is invoked
- **THEN** every design-related fetched path resolves to an active routed surface.
