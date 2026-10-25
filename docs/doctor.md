# Diagnosing an install — `doctor`

Run a read-only health check of your shared-ai install across Claude Code and opencode plus the project's OpenSpec state:

```bash
npx github:mmadariaga/shared-ai doctor
```

It reports, per installed harness (Claude Code, opencode): missing expected files, unexpected files, dangling `Fetch @` references, managed worker/agent files that are missing or no longer match the shipped definition, leftover retired files, and version skew against `main` (or a file-diff against the bundled source when there is no `.version` marker). Opencode also checks that `subagent_depth` is at least 2. A harness whose user-global directory is absent is reported as not installed, not as a pile of missing files.

It also prints a `[Project health]` section (openspec binary, `openspec/` dir, `schema: sai-workflow`) and an `[OpenSpec skills]` section (`generatedBy` vs the local CLI). It never changes anything — it only recommends fixes (re-run the installer, `openspec init`).

Managed commands and existing project-local command/agent overrides are checked
against the current package too. Model/reasoning settings and text after
`<!-- User customizations below this line -->` are user-owned and do not count as
drift. A stale managed body is an error; reinstall from that project or run
`setup <project-path>` to refresh its local copies.

Retirement warnings recommend running the installer: every declared obsolete
file is deleted regardless of its historical hash or custom text, with no
tunable migration for renamed agents. Doctor itself never deletes those files.

- Exit code `0` when green, `1` when any error-severity check fails (CI-usable). Warnings (unexpected files, version skew, skill staleness, retired copies) do not fail the exit code.
- Add `--json` for machine-readable output.
- Add `--offline` to skip the network version check.

`writing-for-agents` is optional and user-owned: doctor does not check its
presence or version, and uninstall does not remove it. Missing provider CLIs or
credentials for backlog and PR workflows are reported by those workflows, not
provisioned by doctor. After reinstalling managed definitions, restart Claude
Code or opencode; refresh project schema templates with `setup` when needed.
