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

The `pr.language` key of `.sai/settings.jsonc` sets the language of the title subject and
the description that `/to-pr` drafts; without it they are English. A language you
explicitly request for the PR/MR in the conversation wins for that publication, and the
unattended publications of [`/sai-plan`](sai-plan.md), [`/sai-build`](sai-build.md), and
the [`/sai-explore`](sai-explore.md) Plan and Direct Build routes use the setting. The `type(scope):` title prefix, closing keywords, and the ratings block
stay verbatim; see [PR/MR language](../project-settings.md#prmr-language).

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
the title and description and preserve unrelated content. The request state is the one
boolean `publish_pr_as_draft`: absent or `true` creates a new PR/MR as a draft and leaves an
existing one in its state, and `false`, which the skill sends only when you ask for a request that
is ready for review, creates a ready PR/MR or marks an existing draft ready on all three providers.
The proposal you approve shows the state the request is created in. The retired `draft` and `ready`
fields are rejected with an error that names `publish_pr_as_draft`.
GitHub creates via REST and marks ready via GraphQL; GitLab uses its `Draft: ` title
prefix. Read-back must verify the state, not just the title or response.

AI authorship credits in descriptions are blocked by default for both creation
and updates. Human coauthor credits are allowed. If you explicitly request AI
credit in the conversation, the skill sends `allow_attribution: true` in its
query and publication JSON; tool or harness suggestions do not count as your
request. All title checks and publication and push approvals still apply.

The description carries an **Inherent Risk** block: four independent ratings
(security, reversibility, critical sections, blast radius), each `low`, `medium`, or
`high`, with a one-line justification citing `path:line`. They measure how risky the
change is by its nature, as a signal for the human reviewer; they change no review
depth and start no audit, and fixing findings or hardening code lowers no level. The
skill publishes the block that a [`/sai-3-implement`](sai-3-implement.md) fix round stored
in the change's `review.md` as it is, without computing anything, while its merge-base and
code fingerprint still match the pull request's base and the committed code. In every other
case (no block, a malformed block, a level below the deterministic floor, later commits, a
rebase, a merge of the parent, a pull request that targets another branch than the review
used, or no `review.md` at all) it computes the ratings from the committed diff against the
target, with or without an OpenSpec change, following `sai/policies/inherent-risk.md`. The deterministic
script `sai/tools/risk-signals.js` sets a floor for security, reversibility, and blast
radius from path, extension, and diff-size signals (and CodeGraph dependents when an
index exists); the published level is never below its floor, and without an index the
blast radius rests on diff size alone. On update, only the content between the block's
`sai-inherent-risk` markers is replaced, with no separate approval, and the rest of the
description is kept as it was; the full result is still shown before you approve.

Azure descriptions are checked locally before approval or a dependent push and
again before publication: at most **4000 UTF-16 units** (JavaScript string length),
including Markdown, whitespace and added content. The error reports the length,
maximum and excess. Exactly 4000 is accepted; some emoji use two units.
When a description exceeds its provider's limit, the authoring agent may shorten
other text or move the **complete** Inherent Risk block to a managed comment.
This option works on all three providers; no new local limits are imposed on
GitHub or GitLab. Relocation is optional and does not excuse remaining overflow.
Approval shows the final description, complete comment and destination, and the
request state. Changing that allocation requires fresh approval.
The tool reuses the authenticated author's uniquely marked comment and preserves
other people's comments; ambiguous matches need clarification. Moving the block
back to the description leaves a location notice in the managed comment.

On GitHub and GitLab, the description ends with a `Closes` block generated from
closing keywords in the branch's committed messages (such as `Fixes #12`). Two optional
fields add an origin-driven reference: `closing_change` names a change whose
`backlog_origin` (from its active, or else archived, `.openspec.yaml`) supplies
`Closes owner/repo#N`, and `closing_line` passes that complete line explicitly and wins
over the metadata. Only a canonical GitHub or GitLab origin on the destination host
produces a line: a non-canonical origin warns without inventing one, an origin on another
host or an Azure DevOps origin adds nothing and no warning, and a change without a readable
`.openspec.yaml` warns without blocking publication. `/sai-build` passes `closing_change`,
so its request closes the issue linked to the change, and the Direct Build route passes the
archive plan's `closing_line` too; `/sai-plan` passes neither. Both fields enter the query
proposal, so a publish whose values differ from the approved ones fails the approval check.
A branch named `<number>_<slug>` after an issue also closes that issue, but only when it has
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
push or automatic commit runs, and a failed or unverified push skips publication. A push
that reaches the 120 s process limit is read back from the remote and reported as uncertain,
never as blocked and never repeated on its own; the process group of the push ends with it.

**Auto-approved publication.** With the project setting `publication.autoApprove` set to
`true` ([Publication auto-approval](../project-settings.md#publication-auto-approval)), the command
shows the complete proposal and then pushes without force and publishes with the unchanged
push and publish tokens, asking no question. The tools read the setting themselves, bind it
into both tokens, and apply the refusals of the unattended mode described below (a force push,
the default branch, a detached HEAD, a branch that is not at the shown commit, and a merged or
closed request), so a refusal publishes nothing. The question is asked as usual when you ask
in the conversation to review before publishing.

**Unattended mode.** A SAI coordinator that holds a recorded `yes` answer to its own
publication question ([`/sai-plan`](sai-plan.md) and [`/sai-build`](sai-build.md) today)
runs `plan-commit` (`/sai-plan` only), `push` and `publish` with the `--unattended` flag,
which replaces the approval tokens and keeps every other check. Your own `/to-pr` invocations never use it and keep the approvals above. The
tool refuses a force push, the provider's default branch, a detached HEAD, a branch that is
not at the pushed commit, and a branch whose request was merged or closed and has no open
request; each refusal names its cause and ends the publication with no retry. An open request
is updated and keeps its draft or ready state; a request created now is a draft
(`publish_pr_as_draft: true`). `/sai-build` sends `publish_pr_as_draft: false`: a request created
now is ready for review and an open draft request is marked ready for review, with a read-back of
the state on GitHub, GitLab and Azure DevOps. A Direct Build slice of `/sai-explore` on a set that
shares one branch sends `true` while later slices of the set are pending, so the shared request
stays a draft, and `false` for the last one. A ready state that the read-back does not show is
reported as a request that stays a draft, and the push and the content update stand.

Publication executes once and reports only a verified request URL or a concrete
blocker with the local receipt. Recovery from an uncertain response is read-only
and never automatically repeats creation.

PR content, the requested `publish_pr_as_draft` state, and risk-comment publication must each
be verified. A published PR with a failed or unverified comment is not complete
success. Recovery reports those outcomes separately and never repeats a completed
push or PR creation. A verified safe pending-comment operation can be resumed
with separate approval; uncertain or ambiguous comment creation needs clarification.
