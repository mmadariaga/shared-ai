# ADR 0203: Fetch resolution runs through a deterministic tool granted to every profile

<!-- adr-index: refs 0009 -->

## Status

Accepted

Refs [ADR 0009](./0009-claude-specific-fetch-skill.md), which split the fetch skill per harness. Both fetch skills keep their per-harness roots; what changes is who resolves a `Fetch @<subpath>` directive.

## Context

The model resolved every `Fetch @` directive in prose: read the project-local root, read the global root, keep a once-per-session memo of whether the project-local `sai/` root exists, compose paths, and apply the path-scope rule. That prose is the source of a documented failure (a worker in a worktree composed `C:\Projects\mine\sai\commands` and dropped a path segment), and it leaves the `opencode debug paths` fallback and the scope rule as unenforced text.

Moving resolution into code makes it deterministic, but a tool that returns only the path adds a tool call to every fetch (the tool, then a `Read`). Claude Code also persists shell output above about 30000 characters and shows the agent only an excerpt, and several SAI cards exceed that size. The tool has to be runnable by every capability profile, restricted explorers included, because the fetch skill is global; a global shell permission for a tool that reads files would make that tool a general file reader for those profiles.

## Decision

1. **One tool resolves the directive and returns the content.** `skills/universal/fetch/fetch.js` is one source for both harnesses and is installed beside each harness's `fetch/SKILL.md`. `node fetch.js --harness claude|opencode <subpath>` looks in the project-local root of the working directory (`.claude/` or `.opencode/`, a worktree included) and then in the global root (`~/.claude/` or `~/.config/opencode/`), uses the first file that exists, and prints a header (the absolute resolved path with `/` separators and the root, `project` or `global`), one blank line, and the unchanged content. Plain text, not JSON, so the content is neither escaped nor costlier. It checks each subpath on every call and keeps no session memory. On opencode, when neither root has the file, it runs `opencode debug paths` and looks inside the config directory that command prints.
2. **One subpath per call.** There is no batch mode. The tool never follows `Fetch @` directives inside the content it returns; the agent resolves them one at a time when their condition holds.
3. **A file above the output cap returns the header only.** The tool prints the header and a `too-large` marker and never truncated content; the agent reads the exact path from the header. The cap is a per-harness constant inside the tool: 30000 characters, header included, for Claude Code, and the same provisional value for opencode until it is measured.
4. **The tool enforces the path scope.** A subpath that does not begin with `sai/`, `commands/`, or `skills/`, that names only a prefix, that is absolute, or that holds `..`, `.`, or an empty segment is rejected before any filesystem access, with a message naming the three prefixes. A `skills/<name>/SKILL.md` subpath is rejected with a pointer to the harness skill tool (`Skill` on Claude Code, `skill` on opencode); the fetch skill sends those directives to the skill tool without calling the fetch tool. A missing or unknown `--harness` is a usage error (exit 2) that reads nothing.
5. **No prose fallback; every profile may run the tool.** `capabilities.universal.shell` in `sai/install-manifest.json` holds `node {skills}/fetch/fetch.js *`, and `bin/capabilities.js` adds it to the shell grants of every profile of both harnesses, in the home, project-local, and quoted absolute forms, unless the profile already has a wildcard shell. When the tool cannot run (permission rejected, `node` absent, an older install without the script), the agent stops the directive and reports the fix (reinstall or review the permission); it never resolves the path itself.
6. **The invocation matches the generated rules.** The skill tells the agent to run the project-local copy relative to the working directory as written (`node .claude/skills/fetch/fetch.js ...`, `node .opencode/skills/fetch/fetch.js ...`), and any other copy by the absolute base directory the harness reported, with backslashes turned into forward slashes and nothing else, double-quoted. A backslash path or an absolute path into the project-local copy would match none of the generated shell rules and would make every restricted profile refuse the tool. `sai/policies/explore-agent.md` admits the tool to the explorer's shell list in the same form, and `sai/policies/tool-resolution.md` carries the path-composition guidance that the fetch skill no longer states.
7. **The installation covers the script from the same manifest.** A `fetch-tool` projection installs `fetch.js` into `skills/fetch/` for both harnesses as a managed, content-tracked file, so `doctor` and `uninstall` follow it. `Fetch @skills/<name>/SKILL.md` directives keep loading through the harness skill tool.

## Alternatives Considered

- **A path-only resolver** — rejected: it adds a tool call to every fetch, where returning the content keeps the common case at one call.
- **Batch resolution or batch read of several subpaths in one call** — not chosen; one subpath per call.
- **Keeping the prose resolution as a fallback for profiles without the permission** — rejected: it keeps two resolution paths to maintain and brings back the prose resolution that produced the dropped segment.
- **A permission only for the profiles that need it** — rejected: the fetch skill is global, so a profile without the permission could not load any instruction.

## Consequences

- Resolution is deterministic: the header path comes from the resolution itself and the agent never composes it, and the scope rule and traversal rejection are code, not prose.
- Files above the output cap still cost two tool calls (the tool, then a `Read`).
- Every capability profile, restricted ones included, gains one shell permission, and therefore the shell tools; the scope check in the tool is what keeps that grant from being a general file reader.
- An install without the script, or a profile without the permission, stops the fetch instead of falling back.
- The opencode output cap is a provisional value, and that the opencode `skill` tool reports a base directory as Claude Code does has not been verified; both are open points for later measurement.

## Provenance

Change `deterministic-fetch-tool`, decision "Fetch resolution runs through a deterministic tool granted to every profile".
