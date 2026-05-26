## ADDED Requirements

### Requirement: thin-wrapper-shape
After deduplication, each of the 16 numbered wrapper files (`claude/commands/sai-{1..8}.md` and `opencode/commands/sai-{1..8}.md`) SHALL contain only: frontmatter, a prereqs fetch, a `## Load behaviors (in order)` section, a single `Fetch @.../instructions/sai/<step-instruction>.md and follow those instructions exactly.` line, and a remember.md fetch. No inline REPLACEMENTS blocks, verify blocks, STOP instructions, or user-input passthrough paragraphs SHALL remain in the wrappers.

#### Scenario: sai-3 claude wrapper matches thin shape
- **WHEN** `claude/commands/sai-3-implement.md` is read
- **THEN** the file structure matches: frontmatter → prereqs fetch → load behaviors → `Fetch implement.md and follow those instructions exactly.` → remember.md fetch, with no REPLACEMENTS block

#### Scenario: sai-4 opencode wrapper matches thin shape
- **WHEN** `opencode/commands/sai-4-apply.md` is read
- **THEN** the file matches the thin shape: frontmatter → prereqs fetch → load behaviors → `Fetch apply.md and follow those instructions exactly.` → remember.md fetch

#### Scenario: sai-1 claude wrapper matches thin shape
- **WHEN** `claude/commands/sai-1-spec.md` is read
- **THEN** the file matches the thin shape: frontmatter → prereqs fetch → load behaviors → `Fetch spec.propose.md and follow those instructions exactly.` → remember.md fetch

### Requirement: sai3-replacements-in-implement
The 13-line REPLACEMENTS block that was inline in both sai-3 wrappers SHALL be integrated into `instructions/sai/implement.md` (the renamed `plan.md`) so that no wrapper override is needed.

#### Scenario: REPLACEMENTS absent from sai-3 wrapper
- **WHEN** `claude/commands/sai-3-implement.md` is searched for "REPLACEMENTS"
- **THEN** no match is found

#### Scenario: sai-workflow artifact context present in implement.md
- **WHEN** `instructions/sai/implement.md` is read
- **THEN** it contains guidance directing the agent to read artifacts from `openspec/changes/{change-name}/` and to write output to `openspec/changes/{change-name}/implementation.md`

### Requirement: sai4-replacements-in-apply
The REPLACEMENTS block that was inline in both sai-4 wrappers SHALL be integrated into `instructions/sai/apply.md` (the renamed `implement.md`).

#### Scenario: REPLACEMENTS absent from sai-4 wrapper
- **WHEN** `claude/commands/sai-4-apply.md` is searched for "REPLACEMENTS"
- **THEN** no match is found

#### Scenario: sai-workflow context present in apply.md
- **WHEN** `instructions/sai/apply.md` is read
- **THEN** it contains the reference resolution for `implementation.md` and the openspec change directory path

### Requirement: sai1-shared-body-in-spec-propose
The shared body content of both sai-1 wrappers (user input passthrough, STOP override) SHALL reside in `instructions/sai/spec.propose.md`; the wrappers SHALL contain only the thin shape described above.

#### Scenario: user input passthrough absent from sai-1 wrapper
- **WHEN** `claude/commands/sai-1-spec.md` is read
- **THEN** no "User input:" passthrough paragraph appears in the wrapper body

### Requirement: sai5-through-8-thin
The sai-5 through sai-8 wrappers, which already load individual instruction files (review.md, security.md, performance.md, accessibility.md), SHALL conform to the thin shape. Any load-behavior or fetch lines that are duplicated between the claude and opencode variants (modulo path prefix) SHALL exist only via the delegated instruction file.

#### Scenario: sai-5 wrappers share no duplicate body
- **WHEN** both `claude/commands/sai-5-review.md` and `opencode/commands/sai-5-review.md` are read
- **THEN** neither contains inline blocks beyond the thin shape

### Requirement: no-behavioral-change-from-dedup
Deduplication SHALL NOT alter any behavioral outcome: the same instructions, STOP conditions, and artifact paths that existed before SHALL remain in effect after the refactor, delivered via the instruction file rather than inline overrides.

#### Scenario: STOP condition preserved
- **WHEN** `instructions/sai/implement.md` is read after integration
- **THEN** it contains the STOP condition checking that `tasks.md` has `## Implementation Context`
