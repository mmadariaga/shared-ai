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
The fetch resolution rules SHALL apply recursively. If a loaded skill or fetched file itself contains `Fetch @` directives, Claude MUST resolve each one whose condition holds with the same rules, except a directive that the `fetch-loaded-copy-reuse` capability lets Claude follow from a copy it already loaded. The directives found in the files and skills of one batch SHALL form the next batch, so Claude resolves nested directives batch by batch rather than one fetch tool call at a time. The fetch tool SHALL NOT follow `Fetch @` directives inside the content it returns, and a file Claude reads from a `path` the tool returned is the same text.

#### Scenario: nested fetch in loaded file
- **WHEN** a fetched file contains `Fetch @sai/policies/glossary-format.md` and that subpath is not already loaded in Claude's context
- **THEN** Claude resolves it in the fetch tool call of the next batch, which checks project `.claude/` first and the user-global root (`CLAUDE_CONFIG_DIR`, else `~/.claude/`) second
- **AND** the output that delivered the outer file does not contain the nested file's content

#### Scenario: nested fetch of an already-loaded subpath
- **WHEN** a fetched file contains `Fetch @sai/policies/cache-warming.md` and the fetch tool already returned that subpath's complete content in this conversation, still in Claude's context
- **THEN** Claude follows the loaded copy and makes no fetch tool call for that directive

#### Scenario: directives of one batch form the next batch
- **WHEN** the files read for one batch contain several unconditional `Fetch @<subpath>` directives that are not already loaded
- **THEN** Claude sends all of their subpaths in one fetch tool call as the next batch

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
When an instruction contains `Fetch @<subpath>` that does not have the form `skills/<name>/SKILL.md`, Claude SHALL resolve it by running the fetch tool `fetch.js`, which the installer places beside the fetch skill's `SKILL.md` for Claude Code and opencode alike, with `--harness claude` and the subpaths of the current batch as the batching requirement defines, except a directive that the `fetch-loaded-copy-reuse` capability lets Claude follow from a complete copy it already loaded in this conversation. When the skill's base directory is the project-local copy `.claude/skills/fetch` under the working directory, Claude SHALL run `node .claude/skills/fetch/fetch.js --harness claude <subpath> [<subpath> ...]` relative to the working directory as written. Otherwise Claude SHALL run `node "<base directory>/fetch.js" --harness claude <subpath> [<subpath> ...]`, with the base directory the harness reported, its backslashes turned into forward slashes and nothing else, double-quoted, so the command matches the generated shell permission rules.

The tool SHALL check `.claude/<subpath>` under the working directory, a worktree included, and then `<subpath>` under the user-global root, on every call, for every subpath, and with no session memory, and SHALL use the first file that exists. The user-global root SHALL be the one the shared resolver `skills/universal/fetch/harness-root.js` (installed beside `fetch.js`) returns: the directory `CLAUDE_CONFIG_DIR` names when that variable is set and not blank, and `~/.claude` otherwise; when `CLAUDE_CONFIG_DIR` is set, `~/.claude` SHALL NOT be consulted. A root or a file reached through a symbolic link SHALL resolve like any other: the scope check SHALL stay lexical and SHALL NOT compare real paths. A file that exists but cannot be read SHALL be a declared error of that subpath, with no stack trace. On a call with exactly one subpath that resolves, it SHALL print `path: <absolute resolved path>` with `/` separators, `root: project` or `root: global`, one blank line, and the unchanged file content. When the header and the content together exceed the 30000-character output cap, it SHALL print the header and a `too-large` line instead of the content, and Claude SHALL Read the exact header path. Claude SHALL use the header path as given and SHALL NOT compose a path itself. When no root has the file on a one-subpath call, the tool SHALL exit with code 1 and the message `File not found: <subpath> (tried <paths>)` on stderr, naming every path it tried; when the file exists but cannot be read, it SHALL exit with code 1 and a `File cannot be read:` message naming the subpath or path and the error code.

When a one-subpath call exits with an error, Claude SHALL stop the directive and report the tool's message. When the tool cannot run (the permission is rejected, `node` is absent, or the install has no `fetch.js`), Claude SHALL stop the directive and report the failure with the action that fixes it: reinstall shared-ai, or review the shell permission for the fetch tool. Claude SHALL NOT fall back to resolving the path itself, and MUST NOT search the project filesystem broadly (glob/grep) for the file.

#### Scenario: project-local file wins
- **WHEN** an instruction says `Fetch @sai/policies/prereqs.md` and `.claude/sai/policies/prereqs.md` exists under the working directory
- **THEN** the fetch tool prints that file's absolute path with `root: project`, one blank line, and its content, and Claude uses that content without a read of the user-global copy

#### Scenario: global file used when the project has none
- **WHEN** an instruction says `Fetch @sai/policies/prereqs.md`, `.claude/sai/policies/prereqs.md` does not exist, `CLAUDE_CONFIG_DIR` is unset, and `~/.claude/sai/policies/prereqs.md` exists
- **THEN** the fetch tool prints the global file's absolute path with `root: global` and its content

#### Scenario: file missing in both roots
- **WHEN** an instruction says `Fetch @sai/policies/prereqs.md` and neither root holds the file
- **THEN** the fetch tool exits with code 1 and `File not found: sai/policies/prereqs.md (tried <project path>, <global path>)`
- **AND** Claude stops the directive and reports that message

#### Scenario: local root created mid-session is seen on the next call
- **WHEN** a project-local `.claude/sai/` copy is created after an earlier directive of the same session resolved to the global root
- **THEN** the next `Fetch @sai/<subpath>` call finds the project-local file, because the tool keeps no session memory

#### Scenario: file above the output cap
- **WHEN** the resolved file and its header exceed 30000 characters on a one-subpath call
- **THEN** the fetch tool prints the header and a `too-large` line and no content
- **AND** Claude Reads the exact path from the header

#### Scenario: Windows base directory runs with forward slashes
- **WHEN** the harness reports the global fetch skill's base directory as `C:\Users\u\.claude\skills\fetch`
- **THEN** Claude runs `node "C:/Users/u/.claude/skills/fetch/fetch.js" --harness claude <subpath> [<subpath> ...]`

#### Scenario: tool cannot run
- **WHEN** the fetch tool command is rejected by the shell permission, `node` is absent, or the install has no `fetch.js`
- **THEN** Claude stops the directive and reports the failure with the reinstall or permission-review action
- **AND** Claude does not read `.claude/<subpath>` or the user-global copy by itself as a fallback

#### Scenario: CLAUDE_CONFIG_DIR names the global root
- **WHEN** `CLAUDE_CONFIG_DIR` is set to a directory that holds `sai/policies/prereqs.md`, the project has no copy, and `~/.claude/sai/policies/prereqs.md` also exists
- **THEN** the fetch tool prints the file under `CLAUDE_CONFIG_DIR` with `root: global` and does not consult `~/.claude`

#### Scenario: unreadable file is a declared error
- **WHEN** the resolved file exists but cannot be read
- **THEN** the fetch tool exits with code 1 and a `File cannot be read:` message, with no stack trace

#### Scenario: linked root resolves and the scope stays lexical
- **WHEN** the global root or a file under it is reached through a symbolic link
- **THEN** the fetch tool resolves the file like any other
- **AND** a subpath with `..`, an absolute path, or a prefix outside `sai/`, `commands/`, and `skills/` is still rejected

### Requirement: The fetch tool resolves two or more subpaths in path mode
When the fetch tool receives two or more subpath arguments in one call, it SHALL select path mode from the original argument count before deduplicating exact argument strings. It SHALL resolve and print one block per distinct argument in first-occurrence order, entirely on stdout, without file content regardless of file sizes. Deduplication SHALL be limited to that invocation and SHALL NOT normalize paths or merge distinct argument strings that resolve to the same file. A resolved subpath SHALL print a resolution block of the lines `subpath: <argument>`, `path: <absolute resolved path>` with `/` separators, and `root: project` or `root: global`. A subpath that is rejected by the scope check, found in no root, or found as a file that cannot be read SHALL print an error block of the lines `subpath: <argument>` and `error: <message>`, and the other distinct subpaths SHALL still resolve. One blank line SHALL separate the blocks. The tool SHALL exit with code 0 when every distinct subpath resolved and with code 1 when at least one error block was printed. Exactly one original subpath argument SHALL retain the existing content mode and output cap.

#### Scenario: two subpaths print resolution blocks only
- **WHEN** the fetch tool runs with `--harness claude sai/a.md sai/b.md` and both files exist
- **THEN** it prints a resolution block for `sai/a.md` and then one for `sai/b.md`, separated by one blank line, with no file content, and exits with code 0

#### Scenario: a failing subpath prints an error block and the others resolve
- **WHEN** the fetch tool runs with two or more subpath arguments and one distinct argument is out of scope, found in no root, or found as a file that cannot be read
- **THEN** that distinct argument prints one error block on stdout in first-occurrence order, every other distinct argument prints its resolution block, and the tool exits with code 1

#### Scenario: a repeated subpath prints one block per occurrence
- **WHEN** the fetch tool runs with the same existing subpath twice
- **THEN** the former per-occurrence output is replaced by exactly one resolution block for that argument, the subpath is resolved once, no file content is printed, and the tool exits with code 0

#### Scenario: adjacent and separated duplicates preserve stable order
- **WHEN** existing subpath arguments are supplied as A A B C C or A B A C B
- **THEN** the tool emits exactly the three path-only blocks A B C in that order

#### Scenario: distinct spellings remain distinct
- **WHEN** `sai/a.md` and `sai\a.md` resolve to the same file and the first argument is repeated
- **THEN** the tool emits one block for each of the two distinct argument strings without merging them by resolved path

#### Scenario: repeated errors retain batch failure
- **WHEN** missing and out-of-scope subpaths are repeated alongside an existing valid subpath
- **THEN** each distinct failing argument emits one error block, the valid argument still resolves, and the tool exits with code 1

#### Scenario: a single original argument retains content mode
- **WHEN** exactly one existing subpath argument is supplied
- **THEN** the tool emits its location and unchanged content, subject to the existing output cap, rather than a path-mode block

### Requirement: The fetch skill batches directives and reads returned paths in parallel
The Claude Code fetch skill SHALL instruct the agent to collect the unconditional `Fetch @` directives known at that moment that have no loaded copy, send the subpaths of every `Fetch @<subpath>` directive of that batch in one fetch tool call, load each `Fetch @skills/<name>/SKILL.md` directive of the batch with the `Skill` tool in the same turn, and then Read every `path` the call returned in parallel, in a single turn. A directive is unconditional when no condition such as "When ..." or "Before ..." governs it; a conditional directive SHALL join a batch only once its condition holds. A one-subpath call returns its content already and needs no Read. When a call returns an error block, the agent SHALL stop only that subpath's directive and report the tool's message, and the other directives of the batch SHALL continue. When the Read of a returned `path` fails (permission rejected or file unreadable), the agent SHALL stop that directive and report the failure, and SHALL NOT compose or guess another path.

#### Scenario: unconditional directives go out in one call
- **WHEN** a loaded file contains three unconditional `Fetch @sai/...` directives with no loaded copy and one `Fetch @skills/budget/SKILL.md` directive
- **THEN** the agent sends the three subpaths in one fetch tool call and calls `Skill("budget")` in the same turn
- **AND** it Reads the three returned paths in parallel in a single turn

#### Scenario: a conditional directive waits for its condition
- **WHEN** a loaded file contains a `Fetch @` directive governed by "When ..." whose condition does not hold yet
- **THEN** the agent leaves that directive out of the batch until its condition holds

#### Scenario: an error block stops only its directive
- **WHEN** a batch call returns an error block for one subpath and resolution blocks for the others
- **THEN** the agent reports that subpath's message and continues with the other directives of the batch

#### Scenario: a failed read stops the directive without a composed path
- **WHEN** the Read of a `path` returned by a batch call is rejected or the file is unreadable
- **THEN** the agent stops that directive and reports the failure without composing or guessing another path
