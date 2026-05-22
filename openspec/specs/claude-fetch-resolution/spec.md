## ADDED Requirements

### Requirement: Resolve Fetch @subpath to Claude config directories
When an instruction contains `Fetch @<subpath>` (where `<subpath>` does not start with `skills/`), Claude SHALL resolve the path using this lookup order:
1. Read `.claude/<subpath>` (project-level config)
2. If not found, Read `~/.claude/<subpath>` (global user config)
3. If neither exists, report the missing file and stop.

Claude MUST NOT search the project filesystem broadly (glob/grep) for the file. It MUST use the two fixed paths above.

#### Scenario: path found in project config
- **WHEN** instruction says `Fetch @sai/instructions/prereqs.md`
- **THEN** Claude reads `.claude/sai/instructions/prereqs.md`; if that file exists, uses its content without checking global config

#### Scenario: path not in project, found in global config
- **WHEN** instruction says `Fetch @sai/instructions/prereqs.md` and `.claude/sai/instructions/prereqs.md` does not exist
- **THEN** Claude reads `~/.claude/sai/instructions/prereqs.md` and uses its content

#### Scenario: path missing in both locations
- **WHEN** instruction says `Fetch @sai/instructions/prereqs.md` and neither `.claude/` nor `~/.claude/` path exists
- **THEN** Claude stops and reports: "File not found: sai/instructions/prereqs.md (checked .claude/ and ~/.claude/)"

### Requirement: Resolve Fetch @skills to Skill tool
When an instruction contains `Fetch @skills/<name>/SKILL.md`, Claude SHALL invoke the `Skill` tool with skill name `<name>` instead of reading a file.

If the instruction also says "and follow those instructions exactly", Claude MUST follow the loaded skill's instructions after loading it.

#### Scenario: skills path triggers Skill tool
- **WHEN** instruction says `Fetch @skills/budget/SKILL.md`
- **THEN** Claude calls `Skill("budget")` — does NOT attempt to read any file path

#### Scenario: skills path with follow directive
- **WHEN** instruction says `Fetch @skills/openspec-propose/SKILL.md and follow those instructions exactly.`
- **THEN** Claude calls `Skill("openspec-propose")` then follows the returned instructions

### Requirement: Recursive resolution
The fetch resolution rules SHALL apply recursively. If a loaded skill or fetched file itself contains `Fetch @` directives, Claude MUST resolve them using the same rules.

#### Scenario: nested fetch in loaded file
- **WHEN** a fetched file contains `Fetch @sai/instructions/glossary-format.md`
- **THEN** Claude resolves it the same way (project `.claude/` first, global `~/.claude/` fallback)

### Requirement: Skill frontmatter declares Claude compatibility
The SKILL.md file MUST include frontmatter with `compatibility: claude` so it is recognized as a Claude Code skill.

#### Scenario: frontmatter present
- **WHEN** the SKILL.md file is authored
- **THEN** its YAML frontmatter contains `compatibility: claude` and a `name: fetch` field
