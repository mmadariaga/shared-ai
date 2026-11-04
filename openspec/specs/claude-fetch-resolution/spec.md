## Purpose

Define how Claude Code resolves `Fetch @<path>` instructions to the correct file or skill, including namespace disambiguation between `@sai/commands/` and `@commands/` paths.

## Requirements

### Requirement: Resolve Fetch @skills to Skill tool
When an instruction contains `Fetch @skills/<name>/SKILL.md`, Claude SHALL invoke the `Skill` tool with skill name `<name>` instead of reading a file, unless Claude already loaded that skill through the `Skill` tool in this conversation and its content is still in Claude's own context, in which case Claude SHALL follow the loaded skill with no second `Skill` call, as the `fetch-loaded-copy-reuse` capability defines.

If the instruction also says "and follow those instructions exactly", Claude MUST follow the loaded skill's instructions after loading it.

#### Scenario: skills path triggers Skill tool
- **WHEN** instruction says `Fetch @skills/budget/SKILL.md` and the `budget` skill is not already loaded in Claude's context
- **THEN** Claude calls `Skill("budget")` — does NOT attempt to read any file path

#### Scenario: skills path with follow directive
- **WHEN** instruction says `Fetch @skills/openspec-propose/SKILL.md and follow those instructions exactly.`
- **THEN** Claude calls `Skill("openspec-propose")` then follows the returned instructions

#### Scenario: managed agent bootstraps the fetch skill
- **WHEN** a Claude Code managed agent projection is dispatched
- **THEN** its first post-frontmatter directive is `Fetch @skills/fetch/SKILL.md` before the canonical policy or worker-contract Fetch

#### Scenario: skill already loaded and still in context
- **WHEN** instruction says `Fetch @skills/budget-explorer/SKILL.md` and Claude already loaded that skill through the `Skill` tool in this conversation, with its content still in context
- **THEN** Claude follows the loaded skill and makes no second `Skill` call

### Requirement: Recursive resolution
The fetch resolution rules SHALL apply recursively. If a loaded skill or fetched file itself contains `Fetch @` directives, Claude MUST resolve each one whose condition holds with the same rules, one fetch tool call per directive, except a directive that the `fetch-loaded-copy-reuse` capability lets Claude follow from a copy it already loaded. The fetch tool SHALL NOT follow `Fetch @` directives inside the content it returns.

#### Scenario: nested fetch in loaded file
- **WHEN** a fetched file contains `Fetch @sai/policies/glossary-format.md` and that subpath is not already loaded in Claude's context
- **THEN** Claude resolves it with its own fetch tool call, which checks project `.claude/` first and global `~/.claude/` second
- **AND** the output that delivered the outer file does not contain the nested file's content

#### Scenario: nested fetch of an already-loaded subpath
- **WHEN** a fetched file contains `Fetch @sai/policies/cache-warming.md` and the fetch tool already returned that subpath's complete content in this conversation, still in Claude's context
- **THEN** Claude follows the loaded copy and makes no fetch tool call for that directive

### Requirement: Skill frontmatter declares Claude compatibility
The SKILL.md file MUST include frontmatter with `compatibility: claude` so it is recognized as a Claude Code skill.

#### Scenario: frontmatter present
- **WHEN** the SKILL.md file is authored
- **THEN** its YAML frontmatter contains `compatibility: claude` and a `name: fetch` field

### Requirement: The fetch skill SHALL include a file disambiguation section that prevents confusion between `@sai/commands/` and `@commands/` namespaces

The disambiguation table MUST document that these two patterns resolve to different directories and instruct the agent to treat two references as the same file only when their full resolved paths match.

#### Scenario: Agent encounters both @sai/commands/ and @commands/ references
- **WHEN** an instruction contains `@sai/commands/X.md` and `@commands/X.md`
- **THEN** the agent SHALL resolve them to `~/.claude/sai/commands/X.md` and `~/.claude/commands/X.md` respectively, treating them as distinct files

### Requirement: Resolve Fetch @subpath through one deterministic tool
When an instruction contains `Fetch @<subpath>` that does not have the form `skills/<name>/SKILL.md`, Claude SHALL resolve it by running the fetch tool `fetch.js`, which the installer places beside the fetch skill's `SKILL.md` for Claude Code and opencode alike, once per directive with `--harness claude` and the subpath, except a directive that the `fetch-loaded-copy-reuse` capability lets Claude follow from a complete copy it already loaded in this conversation. When the skill's base directory is the project-local copy `.claude/skills/fetch` under the working directory, Claude SHALL run `node .claude/skills/fetch/fetch.js --harness claude <subpath>` relative to the working directory as written. Otherwise Claude SHALL run `node "<base directory>/fetch.js" --harness claude <subpath>`, with the base directory the harness reported, its backslashes turned into forward slashes and nothing else, double-quoted, so the command matches the generated shell permission rules.

The tool SHALL check `.claude/<subpath>` under the working directory, a worktree included, and then `~/.claude/<subpath>`, on every call and with no session memory, and SHALL use the first file that exists. On success it SHALL print `path: <absolute resolved path>` with `/` separators, `root: project` or `root: global`, one blank line, and the unchanged file content. When the header and the content together exceed the 30000-character output cap, it SHALL print the header and a `too-large` line instead of the content, and Claude SHALL Read the exact header path. Claude SHALL use the header path as given and SHALL NOT compose a path itself. When no root has the file, the tool SHALL exit with code 1 and the message `File not found: <subpath> (tried <paths>)`, naming every path it tried.

When the tool exits with an error, Claude SHALL stop the directive and report the tool's message. When the tool cannot run (the permission is rejected, `node` is absent, or the install has no `fetch.js`), Claude SHALL stop the directive and report the failure with the action that fixes it: reinstall shared-ai, or review the shell permission for the fetch tool. Claude SHALL NOT fall back to resolving the path itself, and MUST NOT search the project filesystem broadly (glob/grep) for the file.

#### Scenario: project-local file wins
- **WHEN** an instruction says `Fetch @sai/policies/prereqs.md` and `.claude/sai/policies/prereqs.md` exists under the working directory
- **THEN** the fetch tool prints that file's absolute path with `root: project`, one blank line, and its content, and Claude uses that content without a read of `~/.claude/sai/policies/prereqs.md`

#### Scenario: global file used when the project has none
- **WHEN** an instruction says `Fetch @sai/policies/prereqs.md`, `.claude/sai/policies/prereqs.md` does not exist, and `~/.claude/sai/policies/prereqs.md` exists
- **THEN** the fetch tool prints the global file's absolute path with `root: global` and its content

#### Scenario: file missing in both roots
- **WHEN** an instruction says `Fetch @sai/policies/prereqs.md` and neither root holds the file
- **THEN** the fetch tool exits with code 1 and `File not found: sai/policies/prereqs.md (tried <project path>, <global path>)`
- **AND** Claude stops the directive and reports that message

#### Scenario: local root created mid-session is seen on the next call
- **WHEN** a project-local `.claude/sai/` copy is created after an earlier directive of the same session resolved to the global root
- **THEN** the next `Fetch @sai/<subpath>` call finds the project-local file, because the tool keeps no session memory

#### Scenario: file above the output cap
- **WHEN** the resolved file and its header exceed 30000 characters
- **THEN** the fetch tool prints the header and a `too-large` line and no content
- **AND** Claude Reads the exact path from the header

#### Scenario: Windows base directory runs with forward slashes
- **WHEN** the harness reports the global fetch skill's base directory as `C:\Users\u\.claude\skills\fetch`
- **THEN** Claude runs `node "C:/Users/u/.claude/skills/fetch/fetch.js" --harness claude <subpath>`

#### Scenario: tool cannot run
- **WHEN** the fetch tool command is rejected by the shell permission, `node` is absent, or the install has no `fetch.js`
- **THEN** Claude stops the directive and reports the failure with the reinstall or permission-review action
- **AND** Claude does not read `.claude/<subpath>` or `~/.claude/<subpath>` by itself as a fallback
