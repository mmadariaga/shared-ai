# Diagnosing an install — `doctor`

Run a read-only health check of your shared-ai install across Claude Code and opencode plus the project's OpenSpec state:

```bash
npx --allow-git=all github:mmadariaga/shared-ai doctor
```

It reports, per installed harness (Claude Code, opencode): missing expected files, unexpected files, dangling `Fetch @` references, managed worker/agent files that are missing or no longer match the shipped definition, leftover retired files, and version skew against `main` (or a file-diff against the bundled source when there is no `.version` marker). Opencode also checks that `experimental.subagent_depth` is at least 2 (a top-level `subagent_depth` is not read by opencode v2 and never satisfies the check) and runs `opencode --version`: an installed version below 2.2.0 is an error that names the installed and the minimum version, and an absent `opencode` binary or an unparseable version output is a warning that the version is unverified. The version check runs only when the opencode harness is checked; opencode minimum 2.2.0, tested 2.2.5. A harness whose user-global directory is absent is reported as not installed, not as a pile of missing files.

Doctor also reads `openspec --version` and `codegraph --version` of the binaries the `PATH` resolves and compares them with the minimum versions SAI supports (OpenSpec 1.13.1, CodeGraph 1.6.4). A version below the minimum, or one whose output holds no `X.Y.Z`, is a warning, never an error, and doctor only reports it: it offers and runs no upgrade. An absent `codegraph` is not reported, because CodeGraph is optional; an absent `openspec` keeps its own error in the project health section.

The user-global directory is the one the installer uses: on Claude Code `CLAUDE_CONFIG_DIR` when it is set, otherwise `~/.claude`; on opencode the directory `opencode debug paths` reports, then `XDG_CONFIG_HOME/opencode`, then `~/.config/opencode`. If it changes after an install (for example you set `CLAUDE_CONFIG_DIR` later), doctor checks the new directory and reports its files as missing; the old copy is neither migrated nor removed. Rerun the installer to fix it.

It also prints a `[Project health]` section (openspec binary, `openspec/` dir, `schema: sai-workflow`) and an `[OpenSpec skills]` section (`generatedBy` vs the local CLI). It never changes anything — it only recommends fixes (re-run the installer, `openspec init`).

Managed commands and existing project-local command/agent overrides are checked
against the current package too. Model/reasoning settings and text after
`<!-- User customizations below this line -->` are user-owned and do not count as
drift. A stale managed body is an error; reinstall from that project or run
`setup <project-path>` to refresh its local copies.

Retirement warnings recommend running the installer: every declared obsolete
file is deleted regardless of its historical hash or custom text, with no
tunable migration for renamed agents. Doctor itself never deletes those files.

- Exit code `0` when green, `1` when any error-severity check fails (CI-usable). Warnings (unexpected files, version skew, skill staleness, retired copies, an unverified opencode version) do not fail the exit code.
- Add `--json` for machine-readable output.
- Add `--offline` to skip the network version check.

`writing-for-agents` is optional and user-owned: doctor does not check its
presence or version, and uninstall does not remove it. Missing provider CLIs or
credentials for backlog and PR workflows are reported by those workflows, not
provisioned by doctor. After reinstalling managed definitions, restart Claude
Code or opencode; refresh project schema templates with `setup` when needed.

## Interrupted implementation runs

These are recovery notes for `/sai-3-implement`, not additional `doctor` checks.
Invoke `/sai-3-implement <change-name>` again to resume an interrupted run on the
same machine. Run one build per change at a time. When saved state is unavailable,
the command reconstructs progress from local commits and checked tasks; the
unfinished step restarts.

Working reports and saved state use private temporary storage outside the
repository. A completed run removes its working reports; stopped, blocked, or
unanswered runs retain them. Keep that evidence while recovery is pending.

| Platform | Claude Code SAI temp root | opencode SAI temp root |
|----------|--------------------------|-----------------------|
| Linux | `/tmp/claude-{uid}/sai/` | `/tmp/opencode/sai/` |
| Windows/macOS | `<os.tmpdir()>/claude/sai/` | `<os.tmpdir()>/opencode/sai/` |

The temp base (`/tmp` or `os.tmpdir()`) always appears in its real form, with a
Windows 8.3 short name expanded and a link such as macOS `/var` followed, so
permission rules and created folders share one spelling. Permission rules
installed before that change keep the earlier spelling until the next install.

On Linux, the harness folder must already exist. A missing or unsafe root stops
the command and names the path. Check the active harness's temporary-directory
setup and permissions before retrying. An access prompt for writes outside the
project can also block a worker; resolve that permission before continuing through
the command's recovery options.

For store identifiers, report transport, and temporary-root safety checks, see
[implementation internals](../AGENTS.md#implement-review-build-and-deep-review-commands)
and the [temp-root tool](../sai/tools/temp-root.js).
