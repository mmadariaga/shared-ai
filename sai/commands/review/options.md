# Review Options

The options `/sai-5-review` accepts after the change name. Any other token that starts with `--` is unknown.

- `--parent-branch <branch>` — the branch the diff is taken against. Default: detected per `steps/establish-diff-scope.md`.

The command reviews the diff only: it has no `--full` and no `--path`. It is unattended: it asks nothing between change resolution and its close.

The parent branch is passed only as `--parent-branch <branch>`; a second positional value is rejected.
