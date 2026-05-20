## ADDED Requirements

### Requirement: Skill file location

The skill SHALL be created as a single file at `skills/universal/token-efficient-languages/SKILL.md`. No harness split — content is identical for Claude Code and OpenCode.

#### Scenario: Cross-platform reuse

- **WHEN** the skill is loaded by either a Claude Code command or an OpenCode command
- **THEN** the same file at the universal path is fetched; no platform-specific variant exists

### Requirement: Frontmatter fields

The skill file SHALL contain a YAML frontmatter block with:
- `name: token-efficient-languages`
- `description:` — a single line that includes the trigger keywords: "token efficient", "english reasoning", "language efficiency", "think in english"
- `license: MIT`
- `metadata.author: shared-ai`
- `metadata.version: "1.0"`

#### Scenario: Frontmatter completeness

- **WHEN** the file is read by an agent
- **THEN** all five frontmatter fields are present and non-empty

### Requirement: Three-rule language contract

The skill body SHALL define exactly three rules:

1. **Reason in English** — The agent MUST think and reason internally in English unless the user explicitly requests otherwise.
2. **Respond in user's language** — The agent SHALL respond to the user in the language they write in (default to English if unclear).
3. **Artifacts in English** — All artifacts (documents, code, technical explanations) SHALL be written in English unless the user explicitly requests otherwise.

Each rule SHALL be stated as a normative sentence using MUST or SHALL.

#### Scenario: Rule completeness

- **WHEN** an agent loads the skill
- **THEN** all three rules are present with no additional language policy rules added

### Requirement: No harness-specific content

The skill SHALL NOT contain any Claude Code– or OpenCode–specific bindings, model tier selections, tool-call caps, or subagent spawn parameters.

#### Scenario: Universal portability

- **WHEN** the skill content is read in either Claude Code or OpenCode context
- **THEN** no harness-specific syntax errors or irrelevant directives are present
