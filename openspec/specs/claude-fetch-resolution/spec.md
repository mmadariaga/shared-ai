## Purpose

Define how Claude Code resolves `Fetch @<path>` instructions to the correct file or skill, including namespace disambiguation between `@sai/commands/` and `@commands/` paths.

## Requirements

### Requirement: Resolve Fetch @skills to Skill tool
When an instruction contains `Fetch @skills/<name>/SKILL.md` or its marked form, Claude SHALL invoke the `Skill` tool with skill name `<name>` instead of reading a file, unless Claude already loaded that skill through the `Skill` tool in this conversation and its content is still in Claude's own context, in which case Claude SHALL follow the loaded skill with no second `Skill` call, as the `fetch-loaded-copy-reuse` capability defines. A `[skill] <name>` node of the fetch tool's tree SHALL be loaded the same way, and the tool SHALL never descend into a skill's files.

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

#### Scenario: marked skill directive uses the Skill tool
- **WHEN** an instruction carries the marked form of the budget skill directive and its condition holds
- **THEN** Claude calls `Skill("budget")` exactly as for the unmarked form

#### Scenario: a skill node of the tree is loaded with the Skill tool
- **WHEN** the fetch tool's tree lists `[skill] token-efficient-languages`
- **THEN** Claude loads that skill through the `Skill` tool and reads no file under its skill directory

### Requirement: Recursive resolution
The fetch resolution rules SHALL apply recursively. The fetch tool SHALL resolve the closure of the subpaths of one call through the `Fetch @` edges of the files it resolves, so a batch arrives with its required dependencies: a skill SHALL be a terminal node, and a conditional node SHALL be listed but not loaded until its condition holds. Claude MUST load the skills a file names with the `Skill` tool, then apply the same rules to the directives of a skill's own content and of each conditional node whose condition holds, except a directive that the `fetch-loaded-copy-reuse` capability lets Claude follow from a copy it already loaded. The directives of those files SHALL form the next batch. The tool SHALL return no file's content except the single-leaf content shape, and a file Claude reads from a path the tree listed is the same text.

#### Scenario: nested fetch in loaded file
- **WHEN** a fetched file contains `Fetch @sai/policies/glossary-format.md` and that subpath is not already loaded in Claude's context
- **THEN** the tree of the batch lists that node's path, and Claude reads it from the project `.claude/` root or the user-global root (`CLAUDE_CONFIG_DIR`, else `~/.claude/`)
- **AND** the output that delivered the outer file does not contain the nested file's content

#### Scenario: nested fetch of an already-loaded subpath
- **WHEN** a fetched file contains `Fetch @sai/policies/cache-warming.md` and the fetch tool already returned that subpath's complete content in this conversation, still in Claude's context
- **THEN** Claude follows the loaded copy and makes no fetch tool call for that directive

#### Scenario: directives of one batch form the next batch
- **WHEN** the files read for one batch contain several unconditional `Fetch @<subpath>` directives that are not already loaded
- **THEN** the tree of the call lists every required node, and Claude reads their paths in one parallel batch

#### Scenario: a conditional node waits for its condition
- **WHEN** the tree marks a node through a conditional edge and that condition does not hold yet
- **THEN** Claude reads no content for that node until the condition holds

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

The tool SHALL check `.claude/<subpath>` under the working directory, a worktree included, and then `<subpath>` under the user-global root, on every call, for every subpath, and with no session memory, and SHALL use the first file that exists. The user-global root SHALL be the one the shared resolver `skills/universal/fetch/harness-root.js` (installed beside `fetch.js`) returns: the directory `CLAUDE_CONFIG_DIR` names when that variable is set and not blank, and `~/.claude` otherwise; when `CLAUDE_CONFIG_DIR` is set, `~/.claude` SHALL NOT be consulted. A root or a file reached through a symbolic link SHALL resolve like any other: the scope check SHALL stay lexical and SHALL NOT compare real paths. A file that exists but cannot be read SHALL be a declared error of that subpath, with no stack trace. On a call with exactly one subpath whose closure is exactly one file with no edges, it SHALL print `path: <absolute resolved path>` with `/` separators, `root: project` or `root: global`, one blank line, and the unchanged file content. When the header and the content together exceed the 30000-character output cap, it SHALL print the header and a `too-large` line instead of the content, and Claude SHALL Read the exact header path. Claude SHALL use the header path as given and SHALL NOT compose a path itself. Every other call SHALL print the dependency tree the requirements below define. When no root has a file, the tool SHALL print the message `File not found: <subpath> (tried <paths>)` on stderr, naming every path it tried, and SHALL exit with code 1; a requested subpath that did not resolve SHALL print a `! <subpath>` root line, while a nested unresolved path prints `! <subpath>  (unresolved)` and does not change the exit code. When the file exists but cannot be read, it SHALL exit with code 1 and a `File cannot be read:` message naming the subpath or path and the error code.

When a one-subpath call exits with an error, Claude SHALL stop the directive and report the tool's message. When the tool cannot run (the permission is rejected, `node` is absent, or the install has no `fetch.js`), Claude SHALL stop the directive and report the failure with the action that fixes it: reinstall shared-ai, or review the shell permission for the fetch tool. Claude SHALL NOT fall back to resolving the path itself, and MUST NOT search the project filesystem broadly (glob/grep) for the file.

#### Scenario: project-local file wins
- **WHEN** an instruction says `Fetch @sai/policies/example.md` and `.claude/sai/policies/example.md` is a leaf file that exists under the working directory
- **THEN** the fetch tool prints that file's absolute path with `root: project`, one blank line, and its content, and Claude uses that content without a read of the user-global copy

#### Scenario: global file used when the project has none
- **WHEN** an instruction says `Fetch @sai/policies/example.md`, `.claude/sai/policies/example.md` does not exist, `CLAUDE_CONFIG_DIR` is unset, and `~/.claude/sai/policies/example.md` is a leaf file that exists
- **THEN** the fetch tool prints the global file's absolute path with `root: global` and its content

#### Scenario: file missing in both roots
- **WHEN** an instruction says `Fetch @sai/policies/missing.md` and neither root holds the file
- **THEN** the fetch tool prints `File not found: sai/policies/missing.md (tried <project path>, <global path>)` on stderr, prints a `! sai/policies/missing.md` root line, and exits with code 1
- **AND** Claude stops the directive and reports that message

#### Scenario: local root created mid-session is seen on the next call
- **WHEN** a project-local `.claude/sai/` copy is created after an earlier directive of the same session resolved to the global root
- **THEN** the next `Fetch @sai/<subpath>` call finds the project-local file, because the tool keeps no session memory

#### Scenario: file above the output cap
- **WHEN** the resolved file and its header exceed 30000 characters on a one-subpath call whose closure is that one file
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
- **WHEN** `CLAUDE_CONFIG_DIR` is set to a directory that holds `sai/policies/example.md`, the project has no copy, and `~/.claude/sai/policies/example.md` also exists
- **THEN** the fetch tool prints the file under `CLAUDE_CONFIG_DIR` with `root: global` and does not consult `~/.claude`

#### Scenario: unreadable file is a declared error
- **WHEN** the resolved file exists but cannot be read
- **THEN** the fetch tool prints a `! <subpath>` root line, exits with code 1, and writes a `File cannot be read:` message on stderr, with no stack trace

#### Scenario: linked root resolves and the scope stays lexical
- **WHEN** the global root or a file under it is reached through a symbolic link
- **THEN** the fetch tool resolves the file like any other
- **AND** a subpath with `..`, an absolute path, or a prefix outside `sai/`, `commands/`, and `skills/` is still rejected

#### Scenario: a call with a dependency prints the tree
- **WHEN** the single requested subpath is a Markdown file that names another file through a `Fetch @` directive
- **THEN** the fetch tool prints the dependency tree instead of the file's content
- **AND** Claude reads the file from its node path only when it needs the text

### Requirement: The fetch skill batches directives and reads returned paths in parallel
The Claude Code fetch skill SHALL instruct the agent to collect the unconditional `Fetch @` directives known at that moment that have no loaded copy, send the subpaths of every `Fetch @<subpath>` directive of that batch in one fetch tool call, load each `Fetch @skills/<name>/SKILL.md` directive of the batch with the `Skill` tool in the same turn, and then Read every node path the tree lists for the required set in parallel, in a single turn. A directive is unconditional when it is unmarked and no condition such as "When ..." or "Before ..." governs it; a marked directive SHALL join a batch only once its condition holds. A one-subpath call whose closure is one leaf returns its content already and needs no Read. The agent SHALL read a resolved subpath from the node path the tree printed and SHALL NOT request that subpath from the fetch tool again within the same load, even when a later tree lists it; it SHALL read only the unconditional nodes, and a conditional node SHALL be read when the condition its parent states holds. The agent SHALL resolve every tool path the load's unconditional steps need in one path-mode call, naming each subpath twice, and SHALL read no tool file's content; a tool that only a conditional branch needs SHALL be resolved when that branch runs. When a call reports a requested subpath unresolved, the agent SHALL stop only that subpath's directive and report the message the tool wrote on stderr, and the other directives of the batch SHALL continue. When the Read of a node path fails (permission rejected or file unreadable), the agent SHALL stop that directive and report the failure, and SHALL NOT compose or guess another path.

#### Scenario: unconditional directives go out in one call
- **WHEN** a loaded file contains three unconditional `Fetch @sai/...` directives with no loaded copy and one `Fetch @skills/budget/SKILL.md` directive
- **THEN** the agent sends the three subpaths in one fetch tool call and calls `Skill("budget")` in the same turn
- **AND** it Reads the three node paths the tree lists in parallel in a single turn

#### Scenario: a conditional directive waits for its condition
- **WHEN** a loaded file contains a marked `Fetch? @` directive whose condition does not hold yet
- **THEN** the agent leaves that directive out of the batch until its condition holds

#### Scenario: an error block stops only its directive
- **WHEN** a batch call prints an unresolved `! <subpath>` root line for one requested subpath and its message on stderr
- **THEN** the agent reports that subpath's message and continues with the other directives of the batch

#### Scenario: a failed read stops the directive without a composed path
- **WHEN** the Read of a node path listed by a batch call is rejected or the file is unreadable
- **THEN** the agent stops that directive and reports the failure without composing or guessing another path

#### Scenario: a resolved subpath is read from its node path
- **WHEN** a later tree of the same load lists a subpath the load already resolved, whose content the agent already read from the printed node path
- **THEN** the agent follows that read content and makes no fetch tool call for the subpath

#### Scenario: tool paths resolve in one path-mode call
- **WHEN** the load's unconditional steps need several tool paths and no tool file's content
- **THEN** the agent resolves every one of those tool paths in one path-mode call, naming each subpath twice, and reads no tool file's content

#### Scenario: a conditional-only tool waits for its branch
- **WHEN** a tool path is needed only by a conditional branch whose condition does not hold yet
- **THEN** the agent resolves that tool path when the branch runs, not in the unconditional call

### Requirement: The fetch tool resolves the closure of a call
The fetch tool SHALL resolve the full closure of its requested subpaths through the `Fetch @` edges of Markdown files, files and skills together, and SHALL deduplicate it by resolved path. A node of any other file type SHALL be a leaf. The closure SHALL contain the requested entries, every file and skill reachable from them, and no other path.

#### Scenario: the closure includes every reachable dependency
- **WHEN** a call names a file that loads two policies and one skill
- **THEN** the tree lists the file, both policies, and the skill as nodes

#### Scenario: payload directives create no edge
- **WHEN** a file holds a `Fetch @` phrase inside a fenced block, inside an inline code span that carries prose around it, as a template path, or as a `next.follow` machine pointer
- **THEN** the tree lists no node and no unresolved entry for it

#### Scenario: a non-Markdown node is a leaf
- **WHEN** a resolved node is a `sai/tools/*.js` tool or a JSON registry
- **THEN** the tree lists no dependency below it

#### Scenario: a cycle prints an already-listed alias
- **WHEN** two resolved files name each other through `Fetch @` directives
- **THEN** the second occurrence prints `~ <path>  (<size>)  (already listed)` with no children

### Requirement: The fetch tool prints every non-single-leaf call as a tree
Every call that is not the single-leaf content call SHALL print, on stdout, a summary line, the fixed legend line, and one root line per requested subpath followed by its dependencies, indented two spaces per level. A requested subpath repeated on the command line SHALL print one root line and SHALL count once in the `entries` figure. The call SHALL exit 0 when every requested subpath resolved, 1 when at least one did not, and 2 on a usage error.

#### Scenario: two entries print the tree shape
- **WHEN** two leaf files are requested in one call
- **THEN** the output starts with the summary and legend lines and lists one root line for each file
- **AND** no file content is printed

#### Scenario: a repeated entry prints one root line
- **WHEN** the same subpath is named twice in one call
- **THEN** the tree prints one root line for it and the summary counts one entry

#### Scenario: an unresolved entry fails the call
- **WHEN** one requested subpath resolves in neither root while another resolves
- **THEN** the unresolved entry prints its `!` root line and its message on stderr, the other entry still resolves, and the call exits with code 1

#### Scenario: a usage error prints no tree
- **WHEN** the harness is missing or unknown, an option is unknown, or no subpath is named
- **THEN** the call exits with code 2 and reads no file

### Requirement: The tree summary and legend lines carry the counts and symbols
The tree's first line SHALL read `graph: <entries> entries, <nodes> nodes, <conditional> conditional, <skills> skills, <unresolved> unresolved, <chars>k chars`, and its second line SHALL be a fixed legend naming the `?`, `~`, `[skill]`, and `!` symbols. The counts SHALL describe the closure: distinct entries, resolved files, conditional nodes, skills, unresolved paths, and total file characters in thousands with one decimal.

#### Scenario: the summary reports the closure's counts
- **WHEN** a call resolves two files, one skill, and one nested unresolved path, with one conditional node
- **THEN** its first line reports those entries, nodes, conditional, skills, unresolved, and characters figures

#### Scenario: the legend is always present in the tree shape
- **WHEN** any call prints the tree
- **THEN** its second line is exactly `legend: ? conditional (not now) | ~ already listed | [skill] load with the skill tool | ! unresolved`

### Requirement: A tree node line names the resolved path and its size
A resolved file node SHALL print on its own line the absolute resolved path with `/` separators and its size in thousands of characters with one decimal. A node resolved in the project-local root SHALL carry ` (project)`; a user-global node SHALL carry no suffix. The tree SHALL print each resolved node once and SHALL render a node listed earlier as `~ <path>  (<size>)  (already listed)` with no children, and a skill listed earlier as `~ [skill] <name>  (already listed)`.

#### Scenario: a project-local node carries its marker
- **WHEN** a node resolves in the project-local root
- **THEN** its line carries the absolute path, its size, and ` (project)`

#### Scenario: a user-global node carries no suffix
- **WHEN** a node resolves in the user-global root
- **THEN** its line carries the absolute path and its size and no root suffix

#### Scenario: a repeated node is an alias
- **WHEN** a node reachable from two parents is printed a second time
- **THEN** the second line reads `~ <path>  (<size>)  (already listed)` and has no children

### Requirement: A single-leaf call keeps the content shape
A call with exactly one requested subpath whose closure is exactly one file with no edges SHALL print `path: <absolute resolved path>`, `root: project|global`, one blank line, and the unchanged content, or the header and the `too-large` line when the header and content exceed the output cap. Naming a subpath twice SHALL print a tree with one root line and no content, which is how a tool's location is obtained.

#### Scenario: one leaf keeps the content shape
- **WHEN** one requested subpath resolves to a file with no `Fetch @` edges and fits the cap
- **THEN** the call prints the header, one blank line, and the unchanged content

#### Scenario: one leaf above the cap keeps the too-large line
- **WHEN** the one resolved leaf and its header exceed the cap
- **THEN** the call prints the header and the `too-large` line and no content

#### Scenario: a repeated subpath returns its root line only
- **WHEN** a tool subpath is named twice in one call
- **THEN** the call prints a tree whose single root line carries the absolute resolved path and no file content

### Requirement: The tree marks conditional edges, skills, and unresolved paths
The tree SHALL NOT print a `§ <heading>` section line; a conditional directive's gate is read in the parent's prose. The tree SHALL prefix a node reached only through marked edges with `? `. A skill SHALL render as `[skill] <name>` and SHALL never be descended into. A requested subpath that did not resolve SHALL print a `! <subpath>` root line, its message on stderr, and fail the call; a nested unresolved path SHALL render as `! <subpath>  (unresolved)` with no exit-code change.

#### Scenario: no section line is printed
- **WHEN** a parent file's `##` section names several directives
- **THEN** the tree prints no `§ <heading>` line above them, and a reader takes a conditional directive's gate from the parent's prose

#### Scenario: a conditional edge is prefixed
- **WHEN** a node is reached only through a marked edge
- **THEN** its line starts with `? ` and the summary counts it as conditional

#### Scenario: a skill is terminal
- **WHEN** a file names a `skills/<name>/SKILL.md` directive
- **THEN** the tree prints `[skill] <name>` and lists none of the skill's files

#### Scenario: a nested unresolved path does not fail the call
- **WHEN** a resolved file names a path that resolves in neither root
- **THEN** the tree prints `! <subpath>  (unresolved)` at its position and the call keeps exit code 0
