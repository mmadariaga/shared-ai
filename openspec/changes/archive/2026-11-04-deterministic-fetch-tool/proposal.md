> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The Claude Code and opencode `fetch` skills resolved every `Fetch @<subpath>` directive in prose: the agent read the project-local path, fell back to the user-global path, and kept a once-per-session memo of whether a project-local `sai/` root existed. Prose resolution is the source of the documented dropped-segment failure, where an agent composed an absolute path that lost a folder, and it left the opencode `opencode debug paths` fallback and the `sai/` / `commands/` / `skills/` path-scope rule as unenforced prose. Moving resolution into one deterministic Node tool makes it reproducible without adding tool calls in the common case: the tool returns the resolved path and the file content in a single call.

## What Changes

- New `skills/universal/fetch/fetch.js`: one source file serves both harnesses. It takes `--harness claude|opencode` and one subpath, rejects an out-of-scope subpath before any filesystem access (not under `sai/`, `commands/`, or `skills/`; absolute; with an empty, `.`, or `..` segment; or a NUL), rejects the `skills/<name>/SKILL.md` form with a pointer to the harness skill tool (`Skill` on Claude Code, `skill` on opencode), and exits 2 on a missing or unknown harness, an unknown option, or other than one subpath. It checks the project-local root of the working directory and then the user-global root on every call, with no session memory; on opencode it then checks the config directory that `opencode debug paths` prints. On success it prints `path: <absolute path with / separators>`, `root: project|global`, one blank line, and the unchanged content; above a 30000-character output cap it prints the header and a `too-large` line instead of the content. When no root has the file it exits 1 with `File not found: <subpath> (tried <paths>)`. It never follows `Fetch @` directives inside the content it returns.
- `skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` (version 2.0): the project-local `sai/` root probe and the `### Path composition` section are replaced by a `### The fetch tool` section. The agent runs the project-local copy relative to the working directory as written (`node .claude/skills/fetch/fetch.js --harness claude <subpath>` or `node .opencode/skills/fetch/fetch.js --harness opencode <subpath>`), and otherwise runs `node "<base directory>/fetch.js" --harness <harness> <subpath>` with the reported base directory's backslashes turned into forward slashes, double-quoted, so the command matches the generated permission rules. The agent uses the header path as given, Reads that path when the output is `too-large`, stops and reports on a tool error, and stops with a remediation (reinstall, or review the shell permission) when the tool cannot run, with no prose fallback. The `Fetch @skills/<name>/SKILL.md` rows to the harness skill tool stay. The Path scope section states that the tool enforces the scope, and recursion runs one call per nested directive whose condition holds.
- `sai/install-manifest.json`: a new `fetch-tool` projection installs `fetch.js` into `skills/fetch/` for both harnesses as a managed, content-tracked file, so `doctor` and `uninstall` cover it; a new `capabilities.universal.shell` entry declares `node {skills}/fetch/fetch.js *`.
- `bin/capabilities.js`: validates `universal.shell` as an array of non-empty strings and adds its patterns to the shell grants of every profile on both harnesses, in the same project-local, `~`, and absolute install-root forms as other `{skills}` patterns; a profile whose shell already holds `*` keeps it unchanged.
- `sai/policies/explore-agent.md`: the explorer's shell restriction admits the fetch tool in the form the fetch skill gives.
- `sai/policies/tool-resolution.md`: carries the path-composition guidance that left the fetch skills (relative paths inside the project, tool-returned paths outside it with only the slash conversion) and the dropped-segment observation.
- Tests: new `test/fetch-tool.test.js`; `test/doctor-fetch-resolution.test.js`, `test/claude-default-preset-alignment.test.js`, and `test/routed-progress-same-turn.test.js` updated for the new skill text and grants.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `claude-fetch-resolution`: Claude Code resolves `Fetch @<subpath>` through the fetch tool instead of the prose probe; recursion and file disambiguation follow the tool's resolved path.
- `fetch-resolution-path-scoping`: opencode resolves through the same tool with the `opencode debug paths` fallback; the tool enforces the path scope, traversal and absolute-path rejection, and the skill-path pointer before any filesystem access; the path-composition and probe requirements are removed.
- `fetch-path-composition`: the path-composition rule moves from the fetch skills to `sai/policies/tool-resolution.md`; the skills use the tool's header path as given.
- `contract-tool-capabilities`: every capability profile of both harnesses may run the fetch tool through the registry's universal shell grant.
- `agent-self-warming`: the explorer's shell restriction also admits the fetch tool.
- `tool-preference-ladder`: the explorer's restricted shell also admits the fetch tool.
- `opencode-explore-read-only`: the managed opencode budget-explorer's shell grant also admits the fetch tool.

## Impact

New files:
- `skills/universal/fetch/fetch.js`
- `test/fetch-tool.test.js`

Modified files:
- `skills/claude/fetch/SKILL.md`
- `skills/opencode/fetch/SKILL.md`
- `sai/install-manifest.json`
- `bin/capabilities.js`
- `sai/policies/explore-agent.md`
- `sai/policies/tool-resolution.md`
- `test/doctor-fetch-resolution.test.js`
- `test/claude-default-preset-alignment.test.js`
- `test/routed-progress-same-turn.test.js`

Known limitations: files above the output cap still cost two tool calls; every capability profile, restricted ones included, gains one more shell permission; an install without the tool, or a profile without the permission, stops the fetch instead of falling back. The opencode output cap is a provisional 30000 characters, equal to Claude Code, until it is measured.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Undecided: the opencode output cap value is measured during design (I4). To verify during design: that the opencode `skill` tool reports the skill's base directory as Claude Code does, which I1 relies on.
