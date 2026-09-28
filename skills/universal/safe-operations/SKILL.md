---
name: safe-operations
description: >
  Enforces reversibility and impact awareness — the agent must ask before performing destructive, hard-to-reverse, or shared-system operations, and must not use destructive actions as shortcuts.
  TRIGGER when: the user mentions dangerous, destructive, or shared-system operations, or when the task involves git push --force, rm -rf, deleting files/branches, or bypassing safety checks
license: MIT
compatibility: opencode, claude
metadata:
  author: Mikel Madariaga
  version: "1.0"
---

Weigh the reversibility and impact of every action. Local, reversible actions (editing files, running tests) go ahead. An action that is hard to reverse, destructive, or visible on a shared system waits for the user's confirmation:

- **Destructive**: deleting files or branches, dropping database tables, `rm -rf`.
- **Hard to reverse**: `git push --force`, `git reset --hard`, amending published commits.
- **Visible to others**: pushing code, commenting on PRs or issues, sending messages, modifying shared infrastructure.

A confirmation the running command already holds for that exact operation counts: an authorization gate the user answered, or a user selection the command defines as pre-authorizing it (such as Direct Build's one local commit, or the no-commit guard's mixed `git reset <guard_base>`). Ask again only for an operation that confirmation does not name. `--fast-track` is never such a confirmation: it skips a command's own gates, not these.

When an obstacle blocks you, resolve its cause or report it and ask how to proceed. Safety checks stay on (no `--no-verify`), and unfamiliar files stay in place, since they may be someone's in-progress work.
