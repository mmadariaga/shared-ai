## ADDED Requirements

### Requirement: OpenSpec skill staleness detection

For each project-local OpenSpec skill (an `openspec-*` skill directory under a harness's project-local skills location such as `.claude/skills/`, `.opencode/skills/`, or `.github/skills/`), the doctor SHALL read the skill's `generatedBy` frontmatter value and compare it against the installed OpenSpec CLI version (as reported by `openspec --version`). A skill whose `generatedBy` does not match the CLI version SHALL be flagged as stale, with a recommendation to re-run `openspec init`.

#### Scenario: version match is not stale
- **WHEN** a project-local OpenSpec skill's `generatedBy` equals the installed OpenSpec CLI version
- **THEN** the doctor reports that skill as current and does not flag it

#### Scenario: version mismatch is flagged stale
- **WHEN** a project-local OpenSpec skill's `generatedBy` differs from the installed OpenSpec CLI version
- **THEN** the doctor flags the skill as stale, naming the skill and both versions, and recommends re-running `openspec init`

#### Scenario: missing generatedBy is reported
- **WHEN** a project-local OpenSpec skill has no `generatedBy` frontmatter
- **THEN** the doctor reports that the skill's `generatedBy` could not be read rather than silently passing it

### Requirement: staleness check tolerates absent CLI or skills

The staleness check SHALL degrade gracefully: when no project-local OpenSpec skill exists, it SHALL report nothing to check rather than failing; when the OpenSpec CLI version cannot be determined, it SHALL report the comparison as indeterminate rather than flagging every skill as stale.

#### Scenario: no skills present
- **WHEN** the project contains no project-local `openspec-*` skill directory
- **THEN** the doctor reports there are no OpenSpec skills to check

#### Scenario: CLI version unavailable
- **WHEN** the OpenSpec CLI version cannot be determined
- **THEN** the doctor reports the staleness comparison as indeterminate rather than flagging skills as stale
