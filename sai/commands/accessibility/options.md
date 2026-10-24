# Accessibility Options

The options `/sai-7-accessibility` accepts after the change name. Any other token that starts with `--` is unknown.

- `--full` — audit all UI files in the repository.
- `--path <dir>` — audit one path.
- `--runtime` — run the browser-based scanners of `steps/resolve-runtime-audit.md`. The flag is the whole authorization: no scanner question is asked, and a scanner that is not installed is marked unavailable in the report.
- `--url <url>` — the dev-server URL the scanners take. It is an input, not an authorization; with `--runtime` and no `--url`, the command asks for it before the audit starts.
- `--parent-branch <branch>` — the branch the diff is taken against. Default: detected per `steps/common.md` § Scope.

The command is unattended: it asks nothing between change resolution and its close, apart from the URL input above.

The parent branch is passed only as `--parent-branch <branch>`; a second positional value is rejected.
