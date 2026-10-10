# Security Options

The options `/sai-6-security` accepts after the change name. Any other token that starts with `--` is unknown.

- `--full` — audit the whole repository.
- `--path <dir>` — audit one path.
- `--parent-branch <branch>` — the branch the diff is taken against. Default: detected per `steps/common.md` § Scope.

The command is unattended: it asks nothing between change resolution and its close.

The parent branch is passed only as `--parent-branch <branch>`; a second positional value is rejected.
