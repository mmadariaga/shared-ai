# Accessibility Options

The options `/sai-8-accessibility` accepts after the change name. Any other token that starts with `--` is unknown.

- `--full` — audit all UI files in the repository.
- `--path <dir>` — audit one path.
- `--runtime` — run the browser-based checks of `steps/resolve-runtime-audit.md`, each after the user authorizes it. Without it the command asks nothing between change resolution and its close.
- `--parent-branch <branch>` — the branch the diff is taken against. Default: detected per `steps/common.md` § Scope.

The parent branch is passed only as `--parent-branch <branch>`; a second positional value is rejected.
