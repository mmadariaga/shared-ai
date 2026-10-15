# `/to-pr`

## Command function

Creates or updates a **GitHub pull request**, **GitLab merge request**, or
**Azure Repos pull request** from committed branch changes. This universal skill
works in Claude Code and opencode without OpenSpec and replaces `/sai-pr`.

## Inputs and choices

There are no documented behavior flags. Supply destination context in the
conversation or use optional `.to-pr.json` in the working directory. Explicit
fields take precedence over configuration, then Git remotes. For example:

```json
{"provider":"github","repository":"owner/repo"}
```

GitLab uses its project address as `repository`; Azure DevOps Services accepts
organization/project/repository context. The selected provider requires an
authenticated `gh`, `glab`, or Azure CLI with the azure-devops extension,
respectively. Azure DevOps Server is unsupported.

## In detail

The skill resolves the repository, matching fetch/push remote, source branch,
and target branch. Ambiguities require your choice; a provider's default branch
is only a suggestion, particularly for stacked branches.

The title and description come from the committed log and diff against the
target. Pending staged, unstaged, and untracked files stay out of the request.
Relevant OpenSpec documents are optional context, never a substitute for Git
evidence. An existing open request for the same source and target is updated
instead of duplicated; multiple matches require clarification. Updates change
only the title and description and preserve unrelated content.

You review the full proposed content, exact destination, visibility, and update
baseline before approving. Editing content or changing the baseline requires fresh
approval. Azure Repos updates disclose the concurrent-edit interval that its reread
cannot protect.

**One combined approval covers a needed push and the publication.** When the remote
branch does not yet hold the approved commit, you see the exact remote, push URL,
branch, and commit together with the complete proposal, and one question authorizes
the non-force push and the publication. Each operation keeps its own token and
safety checks; the push runs first and publication only follows a verified push. When
the remote branch already holds the commit, a publication-only approval is asked.
The options name the provider's term (PR on GitHub and Azure Repos, MR on GitLab):
approve, edit, or cancel. Cancel runs neither operation and keeps the draft. No force
push or automatic commit runs, and a failed or unverified push skips publication.

Publication executes once and reports only a verified request URL or a concrete
blocker with the local receipt. Recovery from an uncertain response is read-only
and never automatically repeats creation. Reinstalling retires managed `/sai-pr`
copies; modified overrides and user-authored `pr.md` files remain untouched.
