# fetch-resolution-path-scoping Specification

## Purpose
Define how the opencode fetch skill resolves `Fetch @<subpath>` directives to exact file paths without any directory-based existence probe, and the positive path-scope invariant shared by both harness variants. The Claude Code resolution rule is owned by `claude-fetch-resolution` and is not restated here.

## Requirements

### Requirement: Every resolved path begins with sai/, commands/, or skills/ and the root is never named

Both the Claude Code and opencode fetch skills SHALL encode the positive invariant that every path a fetch directive resolves names exactly one file beginning with `sai/`, `commands/`, or `skills/` under the project-local or user-global root, and that the harness root itself is never named: no directory listing of the root, no root-level existence probe, and no glob. Both skills SHALL state that the fetch tool enforces this invariant. A directive names one exact file path, which the fetch tool checks project-local first and user-global second. The invariant is a property of resolved paths, not of the directive's literal token: an absolute user-global directive form (e.g. `Fetch @~/.config/opencode/skills/fetch/SKILL.md`) resolves to a path under `skills/` and therefore satisfies it.

#### Scenario: the invariant is stated in both skill variants
- **WHEN** either the Claude Code or opencode fetch skill is read
- **THEN** it states that every resolved path begins with `sai/`, `commands/`, or `skills/`, that the harness root is never named, and that the fetch tool enforces this scope

#### Scenario: the root is never accessed
- **WHEN** a directive such as `Fetch @sai/policies/prereqs.md` is resolved
- **THEN** the fetch tool checks only the exact file paths `<root>/sai/policies/prereqs.md`
- **AND** neither the harness root directory nor any parent of the resolved file is listed, probed, or globbed

#### Scenario: the absolute user-global directive form stays in the namespace
- **WHEN** `Fetch @~/.config/opencode/skills/fetch/SKILL.md` is resolved
- **THEN** its resolved path begins with `skills/` under the user-global root
- **AND** the directive is not treated as a path-scope violation

#### Scenario: managed opencode agent bootstraps within the skills namespace
- **WHEN** an opencode managed agent projection starts in a cold context
- **THEN** its first post-frontmatter directive is `Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.` before the canonical contract is resolved

### Requirement: Out-of-namespace resolution stops before any filesystem access

When a `Fetch @` directive's subpath does not begin with `sai/`, `commands/`, or `skills/`, names a root directory rather than an exact file, is absolute, or holds a `..` segment, the fetch tool SHALL reject it BEFORE any filesystem access, on both harnesses, and the fetch skill SHALL stop and report the path-scope violation. No read is attempted, so no external-directory permission request can be triggered by directive content. The report SHALL name the directive and the three permitted prefixes.

#### Scenario: a fourth top-level segment is rejected before reading
- **WHEN** a directive such as `Fetch @vendor/notes.md` is encountered, whose resolved path would begin with `vendor/`
- **THEN** the fetch tool rejects it and the skill stops and reports a path-scope violation naming the directive and the permitted prefixes `sai/`, `commands/`, and `skills/`
- **AND** no Read of `.opencode/vendor/notes.md`, `~/.config/opencode/vendor/notes.md`, `.claude/vendor/notes.md`, or `~/.claude/vendor/notes.md` is attempted

#### Scenario: a directive naming the root is rejected before reading
- **WHEN** a directive such as `Fetch @sai/` is encountered, which names a root directory rather than an exact file
- **THEN** the fetch tool rejects it and the skill stops and reports a path-scope violation before any filesystem access

#### Scenario: a traversal directive is rejected before reading
- **WHEN** a directive such as `Fetch @sai/../../notes.md` is encountered
- **THEN** the fetch tool rejects it before any filesystem access and the skill stops and reports the violation

### Requirement: Opencode resolution mirrors the Claude rule without restating it

The opencode resolution rule SHALL match the Claude Code rule owned by `claude-fetch-resolution`. Both SHALL run the same fetch tool, with the same invocation forms (including the multi-subpath form), output header, `too-large` handling, path-mode blocks, batching and parallel-read rule, stop rules, and no-broad-search constraint. They SHALL differ only in the harness name passed to `--harness`, the harness root paths (`.opencode` and the resolved opencode config root vs `.claude` and the resolved Claude Code root), the skill tool name, and the read tool name (`read` vs `Read`). Both user-global roots SHALL come from the one shared resolver `skills/universal/fetch/harness-root.js`: `CLAUDE_CONFIG_DIR`, else `~/.claude`, on Claude Code; the directory `opencode debug paths` reports, else `$XDG_CONFIG_HOME/opencode`, else `~/.config/opencode`, on opencode. This capability SHALL NOT restate the Claude Code mechanics; `claude-fetch-resolution` remains their sole normative owner. A divergence between the two harness rules SHALL be treated as a defect.

#### Scenario: the opencode rule mirrors the Claude rule
- **WHEN** the opencode resolution rule is compared with the `claude-fetch-resolution` requirement, element by element: (1) the fetch tool invocation forms (project-local relative, otherwise the reported base directory with forward slashes, double-quoted, each with `<subpath> [<subpath> ...]`), (2) the no-probe constraint (no Glob/LS/directory-based existence check), (3) the positive invariant sentence (resolved paths begin with `sai/`, `commands/`, or `skills/`; the root is never named; the tool enforces it), (4) the stop rules (a tool error is reported; an error block stops only its directive; a failed read of a returned path stops that directive with no composed path; a tool that cannot run stops the directive with a remediation and no prose fallback), and (5) the batching rule (unconditional directives in one call, skill directives in the same turn, returned paths read in parallel in one turn, nested directives forming the next batch)
- **THEN** each compared element is identical between the two harness rules, differing only in the harness name, the harness-specific root paths (`.opencode` and the resolved opencode config root vs `.claude` and the resolved Claude Code root), the skill tool name, and the read tool name
- **AND** the comparison is performed as a direct structural read of the two harness skill files against each other, and of the opencode rule against the `claude-fetch-resolution` requirement text — the Claude Code mechanics appear only in `claude-fetch-resolution`, never in a restated copy here
- **AND** a divergence in any compared element is a defect

### Requirement: Opencode skills path resolution uses the skill tool

When the opencode fetch skill encounters `Fetch @skills/<name>/SKILL.md` — with or without the "and follow those instructions exactly" suffix — it SHALL resolve the directive through the `skill` tool with skill name `<name>`, not through a file Read of `skills/<name>/SKILL.md`; the Read-then-Read rule SHALL NOT apply to skills paths. When that skill is already loaded through the `skill` tool in this conversation and its content is still in the agent's own context, the agent SHALL follow the loaded skill with no second `skill` call, as the `fetch-loaded-copy-reuse` capability defines. The Claude Code skill-tool mapping remains owned by `claude-fetch-resolution` and is not restated here.

#### Scenario: skills path triggers skill tool
- **WHEN** `Fetch @skills/budget/SKILL.md` is encountered by the opencode fetch skill and the `budget` skill is not already loaded in the agent's context
- **THEN** the `skill` tool is invoked with name `budget`
- **AND** no file path under `~/.config/opencode/skills/` is read

#### Scenario: skills path with follow directive
- **WHEN** `Fetch @skills/openspec-propose/SKILL.md and follow those instructions exactly.` is encountered by the opencode fetch skill
- **THEN** the `skill` tool is invoked with name `openspec-propose`, then its instructions are followed

#### Scenario: skill already loaded and still in context
- **WHEN** `Fetch @skills/budget-explorer/SKILL.md` is encountered by the opencode fetch skill and the agent already loaded that skill through the `skill` tool in this conversation, with its content still in context
- **THEN** the agent follows the loaded skill and makes no second `skill` call

### Requirement: Opencode fetch resolution runs the same deterministic tool

The opencode fetch skill SHALL resolve every `Fetch @<subpath>` directive that does not have the form `skills/<name>/SKILL.md` by running the same fetch tool `fetch.js` as Claude Code, with `--harness opencode` and the subpaths of the current batch, batching unconditional directives into one call as the Claude Code rule defines, except a directive that the `fetch-loaded-copy-reuse` capability lets the agent follow from a complete copy it already loaded in this conversation. When the skill's base directory is the project-local copy `.opencode/skills/fetch` under the working directory, the skill SHALL run `node .opencode/skills/fetch/fetch.js --harness opencode <subpath> [<subpath> ...]` relative to the working directory as written. Otherwise it SHALL run `node "<base directory>/fetch.js" --harness opencode <subpath> [<subpath> ...]`, with the base directory the harness reported, its backslashes turned into forward slashes and nothing else, double-quoted. One source file, `skills/universal/fetch/fetch.js`, SHALL be installed beside the fetch `SKILL.md` of both harnesses by the `fetch-tool` projection of `sai/install-manifest.json`, together with the shared resolver `skills/universal/fetch/harness-root.js`, both as managed, content-tracked files covered by `doctor` and `uninstall`.

The tool SHALL check `.opencode/<subpath>` under the working directory and then `<subpath>` under the one user-global root the shared resolver returns, on every call and with no session memory, and SHALL use the first file that exists. That root SHALL be the directory printed on the `config` line of `opencode debug paths`; when that command is absent, fails, or prints no `config` line, it SHALL be `$XDG_CONFIG_HOME/opencode` when `XDG_CONFIG_HOME` is set and not blank, and `~/.config/opencode` otherwise. The tool SHALL run `opencode debug paths` at most once per call and reuse its outcome for every subpath of that call. A file that exists but cannot be read SHALL be a declared error of that subpath. When no root holds the file, a one-subpath call SHALL exit with code 1 and `File not found: <subpath> (tried <paths>)`, naming every path it tried, and a multi-subpath call SHALL print that message in the subpath's error block. Its output header, its path-mode blocks, its `too-large` handling, its handling of symbolic links and unreadable files, the agent's use of the returned path, and the stop on an error or on a tool that cannot run SHALL match the Claude Code rule, with no prose fallback. The opencode output cap SHALL be 30000 characters until a measured value replaces it. The resolution SHALL NOT use Glob, LS, or any directory listing.

#### Scenario: project-local file exists
- **WHEN** `Fetch @sai/policies/prereqs.md` is executed and `.opencode/sai/policies/prereqs.md` exists under the working directory
- **THEN** the fetch tool prints that file's absolute path with `root: project` and its content, with no read of the user-global path

#### Scenario: global file exists
- **WHEN** `Fetch @sai/policies/prereqs.md` is executed, the project-local file is absent, `opencode debug paths` reports no `config` directory, `XDG_CONFIG_HOME` is unset, and `~/.config/opencode/sai/policies/prereqs.md` exists
- **THEN** the fetch tool prints the global file's absolute path with `root: global` and its content

#### Scenario: config directory from opencode debug paths
- **WHEN** the project-local file is absent and `opencode debug paths` prints a `config` directory that holds the subpath
- **THEN** the fetch tool prints that file's absolute path with `root: global` and its content, and does not consult `~/.config/opencode`

#### Scenario: file missing everywhere
- **WHEN** neither the project-local root nor the resolved user-global root holds the file
- **THEN** the fetch tool exits with code 1 and a `File not found` message that names the subpath and every path it tried
- **AND** the agent stops the directive and reports that message

#### Scenario: fetch tool installed for both harnesses
- **WHEN** the installer projects the `fetch-tool` entry for Claude Code and opencode
- **THEN** `fetch.js` and `harness-root.js` sit beside `skills/fetch/SKILL.md` under each harness root, and `doctor` reports them when missing or drifted

#### Scenario: already-loaded subpath is followed without a tool run
- **WHEN** an opencode agent meets `Fetch @sai/policies/cache-warming.md` after the fetch tool already returned that subpath's complete content in this conversation, still in its context
- **THEN** the agent follows the loaded copy and runs no fetch tool for that directive

#### Scenario: opencode debug paths runs once per call
- **WHEN** a multi-subpath call with `--harness opencode` holds several subpaths that `.opencode/` does not hold
- **THEN** the fetch tool runs `opencode debug paths` once and checks every one of those subpaths under the one resolved user-global root

#### Scenario: XDG config root without a reported directory
- **WHEN** `opencode debug paths` reports no `config` directory and `XDG_CONFIG_HOME` is set
- **THEN** the fetch tool looks for the subpath under `$XDG_CONFIG_HOME/opencode`

### Requirement: The fetch tool enforces the path scope before any filesystem access

The fetch tool SHALL reject, before any filesystem access, a subpath that is empty, holds a NUL character, is absolute (a drive letter, or a leading `/`, `\`, or `~`), holds an empty, `.`, or `..` segment, does not begin with `sai/`, `commands/`, or `skills/`, or names only a prefix. The message SHALL name the directive and the three permitted prefixes. A subpath of the form `skills/<name>/SKILL.md` SHALL be rejected with a message that names the harness skill tool (`Skill` on Claude Code, `skill` on opencode) and the skill name. On a one-subpath call a rejection SHALL exit with code 1. On a call with two or more subpaths, every subpath SHALL pass the scope check before any of them touches the filesystem or runs `opencode debug paths`; a rejected subpath SHALL print an error block carrying its message while the others still resolve, and the call SHALL exit with code 1. A missing `--harness`, a value other than `claude` or `opencode`, an unknown option, or a call with no subpath SHALL exit with code 2, print no block, and read nothing.

#### Scenario: traversal is rejected
- **WHEN** the fetch tool receives `sai/../secrets.md`
- **THEN** it exits with code 1 and a message naming the permitted prefixes, with no filesystem access

#### Scenario: absolute subpath is rejected
- **WHEN** the fetch tool receives `/etc/passwd`, `C:/Windows/win.ini`, or `~/.claude/sai/x.md`
- **THEN** it exits with code 1 before any filesystem access

#### Scenario: skill path is pointed to the skill tool
- **WHEN** the fetch tool receives `skills/budget/SKILL.md` with `--harness claude`
- **THEN** it exits with code 1 and a message saying to load skill `budget` with the `Skill` tool

#### Scenario: usage error reads nothing
- **WHEN** the fetch tool runs without `--harness`, with `--harness copilot`, or with no subpath
- **THEN** it exits with code 2, prints no block, and reads no file

#### Scenario: a batch is scope-checked before any filesystem access
- **WHEN** the fetch tool receives two or more subpaths and one of them is out of scope
- **THEN** every subpath is scope-checked before any filesystem access or `opencode debug paths` call
- **AND** the out-of-scope subpath prints an error block while the others resolve
