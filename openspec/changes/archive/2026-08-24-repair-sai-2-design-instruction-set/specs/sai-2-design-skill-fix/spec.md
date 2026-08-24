## MODIFIED Requirements

### Requirement: no-dead-skill-reference
The supported design wrappers SHALL reference only existing routed worker, coordinator, and step surfaces and SHALL contain no dead legacy design-skill or retired-source fetch. Every design-related fetched path SHALL resolve to an active routed surface; the deleted monolithic design instruction, deleted invocation body, and any `.claude/skills/openspec-continue/SKILL.md` path SHALL not be treated as available authorities.

#### Scenario: sai-2-design loads without missing-file warning
- **WHEN** `/sai-2-design` is invoked
- **THEN** no "file not found" or equivalent error is produced for a design-related path; all referenced worker, coordinator, and step paths resolve to existing active files

#### Scenario: no-retired-design-fetch-remains
- **WHEN** either supported design wrapper is invoked
- **THEN** every design-related fetched path resolves to an active routed surface.

## REMOVED Requirements

### Requirement: embedded-design-generation
**Reason:** Generation is no longer embedded in the wrapper and the old invocation core is runtime-dead.
**Migration:** Use the routed design worker and its coordinator-selected step instructions for design, tasks, and interfaces generation.
#### Scenario: embedded-wrapper-generation-is-retired
- **WHEN** design generation is dispatched through the active route
- **THEN** the wrapper does not carry or execute the former embedded generation body.

