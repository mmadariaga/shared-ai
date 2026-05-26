## ADDED Requirements

### Requirement: caveman skill file is absent from repository
`skills/universal/caveman/SKILL.md` SHALL NOT exist in the repository. The file MUST be deleted, not left empty or stubs.

#### Scenario: skill file checked
- **WHEN** `skills/universal/caveman/SKILL.md` is checked for existence
- **THEN** the file does not exist

#### Scenario: caveman directory checked
- **WHEN** `skills/universal/caveman/` is checked for existence
- **THEN** the directory may be absent or empty — it MUST NOT contain `SKILL.md`

### Requirement: no sai command file references the deleted skill path
After deletion, no file in `sai/commands/` or `commands/claude/` or `commands/opencode/` SHALL reference `@skills/caveman/SKILL.md`.

#### Scenario: grep for skill path
- **WHEN** all command files are searched for `@skills/caveman/SKILL.md`
- **THEN** no matches are found
