# Performance Options

The options `/sai-7-performance` accepts after the change name. Any other token that starts with `--` is unknown.

- `--full` — audit the whole repository.
- `--path <dir>` — audit one path.
- `--tier backend|frontend|db|queue` — audit a single tier. Default: all detected tiers.
- `--runtime` — run the read-only diagnostics of `steps/resolve-diagnostics.md`, each after the user authorizes it. Without it the command asks nothing between change resolution and its close.
- `--parent-branch <branch>` — the branch the diff is taken against. Default: detected per `steps/common.md` § Scope.

The parent branch is passed only as `--parent-branch <branch>`; a second positional value is rejected.
