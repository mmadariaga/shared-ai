# Backlog commands (full reference)

This is the full backlog and branch workflow-skill reference for Claude Code and opencode.
The README keeps a short [Backlog integration](../README.md#backlog-integration) table; the longer descriptions live here. See [Backlog workflows](backlog.md) for supported references, destination settings, ordering limits, and recovery.

| Command | Purpose |
|---------|---------|
| [`/from-backlog <reference>`](commands/from-backlog.md) | Import a GitHub/GitLab issue or Azure DevOps Services work item, including description and comments, for discussion. Read-only; does not start implementation. |
| [`/from-next-backlog-item`](commands/from-next-backlog-item.md) | With no arguments, resolve a backlog destination from context and remotes, select a highest-priority eligible item, then import it. Unsupported or unverifiable selections stay pending. |
| [`/to-backlog`](commands/to-backlog.md) | Create a GitHub issue plus Project insertion, a GitLab issue, or an Azure Boards work item; update only the originating item's title and description when the conversation has an origin. Requires explicit full-content approval. |
| [`/new-change-branch`](commands/new-change-branch.md) | Create and switch to a local `feat`, `fix`, `docs`, or `chore` branch named `<type>/<id>_<name_with_underscores>`. Reuse the discussion for its name and optional work-item ID; always ask for the base. Preserve existing work, with no fetch, stash, commit, or push. |
| [`/to-pr`](commands/to-pr.md) | Create/update a GitHub PR, GitLab MR, or Azure Repos PR from committed changes. OpenSpec is optional. Approve the full title and description before publication; one approval covers any required push and the publication. |
