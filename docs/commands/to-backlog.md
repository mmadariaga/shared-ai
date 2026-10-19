# `/to-backlog`

## Command function

Captures agreed work from the current conversation as a GitHub issue, GitLab
issue, or Azure Boards work item. In Claude Code and opencode, it creates one
item or refines the originating item's title and description after approval.
It needs no OpenSpec setup.

For GitHub, GitLab ordinary project issues and Azure DevOps Services,
crystallized slices publish the agreed whole-objective parent and one child per
complete slice (including one slice), after full publication confirmation
without another breakdown approval. GitLab uses written hierarchy and native
blocking links; Azure uses native Parent/Child and Predecessor links. Native
relation failures require approval for a disclosed written fallback. Azure's
selected invocation-scoped type applies to every item, with project rules
enabled. See [Backlog workflows](../backlog.md#import-an-item) for dependency
validation and partial-result recovery.

## Inputs and flags

Invoke `/to-backlog` in the conversation containing the work to capture. There
are no documented behavior flags. Supply destination choices in conversation or
the [project settings](../project-settings.md) file; explicit fields win over
settings, then Git remotes. Provider hosting does not override an explicit backlog choice. See
[destination settings and provider requirements](../backlog.md#capture-or-update-work).

## In detail

If the conversation starts from an existing issue/work item, the skill updates
that origin. Import via `/from-backlog` is optional: a direct starting reference
also qualifies. Later reference links are not targets. Ambiguous origins require
clarification; an inaccessible origin never causes replacement creation.

New items summarize agreed problem, goal, scope, exclusions, unresolved
questions, and maturity. Optional edge cases and implementation details reflect
actual agreement, not suggestions silently promoted into requirements. Updates
preserve unrelated description content and stable identifiers. State, comments,
labels, assignments, and Project membership are outside update scope.

Creation inserts GitHub issues into a writable Project, creates GitLab issues
without board insertion, or asks for the Azure work-item type for this invocation.
You review full content and the exact destination before confirming, editing,
or cancelling. Azure Boards shows source Markdown and converted outgoing HTML.
A changed update baseline requires fresh approval; matching content is a no-op.
Before approving an update, GitHub and GitLab show that their content check and
write cannot be made atomic, so a concurrent edit in between can be overwritten.
Azure's write is guarded by the confirmed revision.

Publication runs once. Keep the reported receipt and existing item link after a
partial or uncertain result: recovery verifies outcomes, never recreates an item
automatically. See [publication and recovery](../backlog.md#capture-or-update-work).
