## Purpose

Define how Claude Code resolves `Fetch @<path>` instructions to the correct file or skill, including namespace disambiguation between `@sai/commands/` and `@commands/` paths.

## Requirements

### Requirement: Resolve Fetch @subpath to Claude config directories
When an instruction contains `Fetch @<subpath>` (where `<subpath>` does not start with `skills/`), Claude SHALL resolve the path against the two fixed paths `.claude/<subpath>` (project-level config) and `~/.claude/<subpath>` (global user config). A once-per-session probe of the project-local `sai/` root gates this resolution:

1. The probe SHALL run exactly once per session, on the first `Fetch @<subpath>` directive whose path begins with `sai/`. It checks the project-local `sai/` root through that directive's own Read of `.claude/<subpath>`, never through the harness root `.claude/` itself. A project without a local SAI copy can still have `.claude/skills/` from `openspec init`. A successful Read records the project-local `sai/` root as present. A failed Read records it as absent.
2. While the probe has not run, or after it recorded the project-local `sai/` root as present, Claude SHALL Read `.claude/<subpath>`. If that file is not found, Claude SHALL Read `~/.claude/<subpath>` directly. If neither exists, Claude SHALL report the missing file and stop.
3. After the probe recorded the project-local `sai/` root as absent, Claude SHALL resolve every later `Fetch @<subpath>` directive whose path begins with `sai/` by reading `~/.claude/<subpath>` directly with no project-local Read attempt; other prefixes keep the local-first read of item 2. If that Read fails, Claude SHALL report the missing file and stop.

The probe result is session-scoped: a project-local `sai/` root created after the probe is not seen until the next session.

Claude MUST NOT search the project filesystem broadly (glob/grep) for the file. It MUST use the two fixed paths above, and the probe MUST stay Read-based, with no Glob or LS.

#### Scenario: path found in project config
- **WHEN** instruction says `Fetch @sai/policies/prereqs.md` and the project-local `sai/` root has not been probed yet or was found present
- **THEN** Claude reads `.claude/sai/policies/prereqs.md`; if that file exists, uses its content without checking global config

#### Scenario: path not in project, found in global config
- **WHEN** instruction says `Fetch @sai/policies/prereqs.md` and `.claude/sai/policies/prereqs.md` does not exist
- **THEN** Claude reads `~/.claude/sai/policies/prereqs.md` and uses its content
- **AND** when this was the first `sai/`-prefixed directive of the session, Claude records the project-local `sai/` root as absent for the rest of the session

#### Scenario: path missing in both locations
- **WHEN** instruction says `Fetch @sai/policies/prereqs.md` and neither `.claude/` nor `~/.claude/` path exists
- **THEN** Claude stops and reports: "File not found: sai/policies/prereqs.md (checked .claude/ and ~/.claude/)"

#### Scenario: project-local sai root found absent skips the local Read
- **WHEN** the session probe has recorded the project-local `sai/` root as absent and a later instruction says `Fetch @sai/orchestration/worker-core.md` or `Fetch @commands/X.md`
- **THEN** Claude reads `~/.claude/<subpath>` directly with no Read of `.claude/<subpath>`
- **AND** if that Read fails, Claude stops and reports: "File not found: <subpath> (checked .claude/ and ~/.claude/)"

#### Scenario: probe targets the sai directory, not the harness root
- **WHEN** a project has `.claude/skills/` from `openspec init` but no `.claude/sai/` copy
- **THEN** the probe runs on the first `sai/`-prefixed directive's Read under `.claude/sai/`, and records the project-local `sai/` root as absent
- **AND** neither `.claude/` nor `.claude/sai/` is listed or globbed

#### Scenario: local sai root created mid-session
- **WHEN** a project-local `sai/` root is created after the session probe recorded it as absent
- **THEN** Claude keeps resolving directly against `~/.claude/` for the rest of the session, and the new root is seen only in the next session

### Requirement: Resolve Fetch @skills to Skill tool
When an instruction contains `Fetch @skills/<name>/SKILL.md`, Claude SHALL invoke the `Skill` tool with skill name `<name>` instead of reading a file.

If the instruction also says "and follow those instructions exactly", Claude MUST follow the loaded skill's instructions after loading it.

#### Scenario: skills path triggers Skill tool
- **WHEN** instruction says `Fetch @skills/budget/SKILL.md`
- **THEN** Claude calls `Skill("budget")` — does NOT attempt to read any file path

#### Scenario: skills path with follow directive
- **WHEN** instruction says `Fetch @skills/openspec-propose/SKILL.md and follow those instructions exactly.`
- **THEN** Claude calls `Skill("openspec-propose")` then follows the returned instructions

#### Scenario: managed agent bootstraps the fetch skill
- **WHEN** a Claude Code managed agent projection is dispatched
- **THEN** its first post-frontmatter directive is `Fetch @skills/fetch/SKILL.md` before the canonical policy or worker-contract Fetch

### Requirement: Recursive resolution
The fetch resolution rules SHALL apply recursively. If a loaded skill or fetched file itself contains `Fetch @` directives, Claude MUST resolve them using the same rules, including the session's project-local `sai/` root probe state.

#### Scenario: nested fetch in loaded file
- **WHEN** a fetched file contains `Fetch @sai/policies/glossary-format.md`
- **THEN** Claude resolves it the same way: project `.claude/` first with global `~/.claude/` fallback, or global `~/.claude/` directly once the session probe has recorded the project-local `sai/` root as absent

### Requirement: Skill frontmatter declares Claude compatibility
The SKILL.md file MUST include frontmatter with `compatibility: claude` so it is recognized as a Claude Code skill.

#### Scenario: frontmatter present
- **WHEN** the SKILL.md file is authored
- **THEN** its YAML frontmatter contains `compatibility: claude` and a `name: fetch` field

### Requirement: The fetch skill SHALL include a file disambiguation section that prevents confusion between `@sai/commands/` and `@commands/` namespaces

The disambiguation table MUST document that these two patterns resolve to different directories and instruct the agent to always read the full resolved path.

#### Scenario: Agent encounters both @sai/commands/ and @commands/ references
- **WHEN** an instruction contains `@sai/commands/X.md` and `@commands/X.md`
- **THEN** the agent SHALL resolve them to `~/.claude/sai/commands/X.md` and `~/.claude/commands/X.md` respectively, treating them as distinct files
