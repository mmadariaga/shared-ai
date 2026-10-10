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
baseline before approving publication. Editing content or changing the baseline
requires fresh approval. Azure Repos updates disclose the concurrent-edit interval
that its reread cannot protect.

**Any push has a separate approval** naming the remote, branch, and commit. A
publication approval does not authorize a push; no force push or automatic
commit runs. Declining a required push stops publication and keeps the draft.

Publication executes once and reports only a verified request URL or a concrete
blocker with the local receipt. Recovery from an uncertain response is read-only
and never automatically repeats creation. Reinstalling retires managed `/sai-pr`
copies; modified overrides and user-authored `pr.md` files remain untouched.
