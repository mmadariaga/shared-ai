# Diagnosing an install — `doctor`

Run a read-only health check of your shared-ai install across Claude Code and opencode plus the project's OpenSpec state:

```bash
npx github:mmadariaga/shared-ai doctor
```

It reports, per harness (Claude Code, opencode): manifest-allowlisted missing/unexpected files, content drift, dangling `Fetch @` references, and version skew against `main`; plus a `[Project health]` section (openspec binary, `openspec/` dir, `schema: sai-workflow`) and OpenSpec-skill staleness. It never changes anything — it only recommends fixes (re-run the installer, `openspec init`).

- Exit code `0` when green, `1` when any error-severity check fails (CI-usable).
- Add `--json` for machine-readable output.
