# `/to-pr`

## Command function

Creates or updates a **GitHub pull request**, **GitLab merge request**, or
**Azure Repos pull request** from committed branch changes. This universal skill
works in Claude Code and opencode without OpenSpec.

## Inputs and choices

There are no documented behavior flags. Supply destination context in the
conversation or set the `pr.*` keys in `.sai/settings.jsonc`. Explicit fields take
precedence over the settings, then Git remotes; `backlog.*` never chooses the
destination, because the backlog provider and the code host can differ. For example:

```jsonc
{ "pr": { "provider": "gitlab", "repository": "group/project" } }
```

`pr.provider` also settles a self-hosted host, which `/to-pr` would otherwise ask
about on every run. A `.to-pr.json` in the project root is deprecated: it still
works when no `pr.*` key is set, with a warning, and is ignored when one is.

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

The description carries an **Inherent Risk** block: four independent ratings
(security, reversibility, critical sections, blast radius), each `low`, `medium`, or
`high`, with a one-line justification citing `path:line`. They measure how risky the
change is by its nature, as a signal for the human reviewer; they change no review
depth and start no audit, and fixing findings or hardening code lowers no level. The
skill computes them on every run from the committed diff against the target, with or
without an OpenSpec change, following `sai/policies/inherent-risk.md`. The deterministic
script `sai/tools/risk-signals.js` sets a floor for security, reversibility, and blast
radius from path, extension, and diff-size signals (and CodeGraph dependents when an
index exists); the published level is never below its floor, and without an index the
blast radius rests on diff size alone. On update, only the content between the block's
`sai-inherent-risk` markers is replaced, with no separate approval, and the rest of the
description is kept as it was; the full result is still shown before you approve.

On GitHub and GitLab, the description ends with a `Closes` block generated from
closing keywords in the branch's committed messages (such as `Fixes #12`). A branch
named `<number>_<slug>` after an issue also closes that issue, but only when it has
children and all of them are closed or covered by this request. Issues you already
close by hand in the description are not repeated. An issue on another host is
reported as a warning and not closed. Azure Repos requests get no closing block.

When it **creates** a GitHub pull request or GitLab merge request, the skill also
assigns the request to you and applies zero or more labels that already exist in the
project. It reads the project's full label list, chooses type or area labels (for
example `bug`, `enhancement`, `performance`) from the title's Conventional Commits
type and the description, and never chooses state labels such as `wontfix` or
`needs review`. Only exact existing names are applied; labels are never created, and
when none fits the request is published without labels. The approval shows the
assignee, the labels, and any warnings. Updates, and every Azure Repos request, get
no assignee or labels. A problem reading, applying, or verifying them is only a
warning and never blocks publication; GitHub applies them with a second call after
creation, so a failure there leaves the request created and reports what was not applied.

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
and never automatically repeats creation.
