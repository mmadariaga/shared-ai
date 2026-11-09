> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`skills/universal/fetch/fetch.js` and the installer hard-coded `~/.claude`, and the opencode root was resolved three different ways (in `fetch.js`, `bin/capabilities.js`, and `bin/install-flow.js`), so a session could load instructions from one root and tools from another. The instruction policies also listed fixed home-directory candidates, which kept sending agents to the wrong root. Every component that locates an installed SAI root now resolves it through one shared resolver that honors `CLAUDE_CONFIG_DIR` on Claude Code and the reported config directory on opencode, and the instruction policies resolve tools through the fetch tool.

## What Changes

- New `skills/universal/fetch/harness-root.js`: the one resolver of the global harness root. Claude Code uses `CLAUDE_CONFIG_DIR` when it is set and not blank, else `<home>/.claude`; opencode uses the directory on the `config` line of `opencode debug paths`, else `XDG_CONFIG_HOME/opencode`, else `<home>/.config/opencode`. Callers may supply the home directory, the environment, and the `opencode debug paths` probe; the Claude Code resolution never runs the probe. `sai/install-manifest.json` installs it beside `fetch.js` for both harnesses.
- `skills/universal/fetch/fetch.js` checks the project-local root and then the one global root the resolver returns (the previous opencode third candidate is gone), runs the probe at most once per batch, reports a file that exists but cannot be read as a declared `File cannot be read:` error of that subpath alone (with no stack trace, and in path mode the other subpaths still resolve), and keeps following symbolic links with a lexical scope check.
- `bin/install-flow.js`, `bin/doctor.js`, `bin/uninstall-flow.js`, `bin/capabilities.js`, and `bin/model-customization.js` take their default Claude Code and opencode roots from the shared resolver, so the installer, `doctor`, uninstall, and the generated absolute permission rules work on the same resolved root; explicit base arguments still win.
- `sai/policies/tool-resolution.md` no longer lists `~/.claude/...` or `~/.config/opencode/...` candidates: tools resolve through the fetch tool in path mode with the subpaths `sai/tools/<name>`, `sai/bin/sai-state.js`, and `skills/sai-cache-warmer/wait.js` (a one-tool step names its subpath twice; a bare `bin/...` subpath is out of the fetch scope). A `root: project` result runs as written and a `root: global` result runs as the printed absolute path, double-quoted. `sai/policies/prereqs-check.md`, `sai/policies/cache-warming.md`, `sai/policies/no-commit-guard.md`, `sai/commands/commit/coordinator.md`, `sai/commands/commit/instructions.md`, `sai/commands/worktree/instructions.md`, `sai/commands/design/steps/interfaces.md`, and `sai/commands/design/steps/tasks.md` follow that rule.
- `skills/claude/fetch/SKILL.md` and `skills/opencode/fetch/SKILL.md` name the resolved user-global root of their harness, the symbolic-link behavior, and the per-subpath error for an unreadable file.
- `sai/tools/input-reader.js` rejects `--input-file` followed by a separate value that starts with `--` as a usage error naming the flag; `--input-file=<path>` keeps accepting any path. Every tool that reads input through it, `bin/sai-state.js` included, inherits the rejection.
- `AGENTS.md` says that `commit.js apply` receives the message as `--input-file <path>` (it previously said stdin) and documents the shared root resolver; `README.md` documents the resolved roots, the unmigrated old root, and linked install roots.
- Tests: new `test/harness-root.test.js` and `test/harness-root-consumers.test.js`; updated `test/fetch-tool.test.js`, `test/absolute-home-shell-permissions.test.js`, `test/input-file-delivery.test.js`, `test/prereqs-tool.test.js`, and `test/worktree-tool.test.js`.

Boundaries kept: a symbolic link inside a root can still point outside it, because the lexical scope check is the only scope guard; an install in a previously resolved root is neither migrated nor removed; no harness other than Claude Code and opencode gains support.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `claude-fetch-resolution`: the Claude Code global root honors `CLAUDE_CONFIG_DIR`, an unreadable file is a declared per-subpath error, and linked roots resolve under a lexical scope check.
- `opencode-config-root-resolution`: one resolution order for the opencode root (reported directory, then `XDG_CONFIG_HOME/opencode`, then `~/.config/opencode`) in the shared resolver both harnesses use, and one resolved root for every component.
- `shared-tool-resolution`: tool locations resolve through the fetch tool path mode instead of listed home-directory candidates.
- `shared-ai-uninstall`: uninstall enumerates the resolved root only.
- `tool-input-file-delivery`: an `--input-file` value that starts with `--` is a usage error.
- `fetch-resolution-path-scoping`: the opencode fetch tool checks one resolved global root instead of `~/.config/opencode` followed by a `opencode debug paths` fallback.
- `doctor-fetch-resolution`: the doctor checks `Fetch @` references against the resolved global roots.
- `doctor-harness-inventory`: harness detection uses the resolved global roots.
- `npx-installer`: destination bases come from the shared resolver.
- `shared-permissions-rule`: copy selection takes the copy the fetch tool returns.
- `sai-state-location`: `sai-state.js` resolves through the fetch tool subpath `sai/bin/sai-state.js`.
- `commit-tool-paths`: `commit.js` resolves through the fetch tool.
- `validator-tool-paths`: `worker-report-validator.js` resolves through the fetch tool.
- `delta-header-tool-paths`: `check-delta-headers.js` resolves through the fetch tool.
- `cited-path-existence-check`: `check-cited-paths.js` resolves through the fetch tool in both gates.
- `design-file-manifest-tool`: `file-manifest.js` resolves through the fetch tool.
- `worktree-tool-engine`: `worktree.js` resolves through the fetch tool.
- `prerequisite-preflight`: `prereqs.js` resolves through the fetch tool.

## Impact

- New files: `skills/universal/fetch/harness-root.js`, `test/harness-root.test.js`, `test/harness-root-consumers.test.js`.
- Modified files: `AGENTS.md`, `README.md`, `bin/capabilities.js`, `bin/doctor.js`, `bin/install-flow.js`, `bin/model-customization.js`, `bin/uninstall-flow.js`, `sai/commands/commit/coordinator.md`, `sai/commands/commit/instructions.md`, `sai/commands/design/steps/interfaces.md`, `sai/commands/design/steps/tasks.md`, `sai/commands/worktree/instructions.md`, `sai/install-manifest.json`, `sai/policies/cache-warming.md`, `sai/policies/no-commit-guard.md`, `sai/policies/prereqs-check.md`, `sai/policies/tool-resolution.md`, `sai/tools/input-reader.js`, `skills/claude/fetch/SKILL.md`, `skills/opencode/fetch/SKILL.md`, `skills/universal/fetch/fetch.js`, `test/absolute-home-shell-permissions.test.js`, `test/fetch-tool.test.js`, `test/input-file-delivery.test.js`, `test/prereqs-tool.test.js`, `test/worktree-tool.test.js`.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

This change is one of four themed changes from issue https://github.com/mmadariaga/shared-ai/issues/399. The block deliberately carries no Backlog origin: an archive of this change must not close #399, which keeps tracking the other changes and the follow-ups; the user closes #399 by hand. F27 is the AGENTS.md sentence that says `commit.js apply` takes the message on stdin, while the code uses `--input-file`. Issue #390 adds an argv flag parser to `bin/sai-state.js` and edits `sai/policies/tool-resolution.md`; whichever change lands second adapts to the first.
