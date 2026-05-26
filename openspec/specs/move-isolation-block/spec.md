## ADDED Requirements

### Requirement: Isolation block removed from instruction files

The `# Isolation Mode` block (a 5-line block consisting of the heading and four bullet points) SHALL be removed from the top of each of the 9 `.claude/instructions/sai/*.md` files: `accessibility.md`, `apply.md`, `commit.md`, `design.md`, `implement.md`, `performance.md`, `pr.md`, `review.md`, `security.md`. No other content in those files MUST change.

#### Scenario: instruction file no longer starts with Isolation Mode

- **WHEN** any of the 9 instruction files is read after the change
- **THEN** the file MUST NOT begin with `# Isolation Mode`

#### Scenario: instruction file content beyond the block is preserved

- **WHEN** any of the 9 instruction files is read after the change
- **THEN** all content that was below the Isolation Mode block MUST be present and unchanged

### Requirement: Isolation block prepended to sai/commands body files

The exact verbatim text of the `# Isolation Mode` block SHALL be prepended as the first content of each of the 9 `.claude/commands/sai/sai-*.md` body files: `sai-8-accessibility.md`, `sai-4-apply.md`, `sai-commit.md`, `sai-2-design.md`, `sai-3-implement.md`, `sai-7-performance.md`, `sai-pr.md`, `sai-5-review.md`, `sai-6-security.md`. A blank line MUST separate the block from the existing first line of each file.

#### Scenario: command body file starts with Isolation Mode block

- **WHEN** any of the 9 sai/commands body files is read after the change
- **THEN** the file MUST begin with `# Isolation Mode` followed by the 4 bullet points

#### Scenario: existing command body content is preserved

- **WHEN** any of the 9 sai/commands body files is read after the change
- **THEN** all content that previously existed in that file MUST appear after the Isolation Mode block, separated by a blank line

### Requirement: Excluded files unchanged

`sai-explore.md`, `sai-archive.md`, all vendor wrapper files in `.claude/commands/claude/` and `.claude/commands/opencode/`, and all harness entry files MUST NOT be modified.

#### Scenario: sai-explore unchanged

- **WHEN** `.claude/commands/sai/sai-explore.md` is read after the change
- **THEN** its content MUST be identical to its pre-change content

#### Scenario: sai-archive unchanged

- **WHEN** `.claude/commands/sai/sai-archive.md` is read after the change
- **THEN** its content MUST be identical to its pre-change content
