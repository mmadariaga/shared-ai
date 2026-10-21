# Azure Boards origin update

Use `provider:"azuredevops"` with the common helper and registry. Require the
existing CLI, extension, authentication and project access; report failures
without altering the environment. Load `azuredevops-content.md` before editing
descriptions and `azuredevops-transport.md` before the first Azure operation.
Require a complete cloud `project/_workitems/edit/ID` origin URL;
missing components require clarification. Inaccessible origins never become
replacement creations.

`read-update` takes `reference` and returns canonical issue, project, visibility,
actor and `baseline:{rev,title,description}`. `query-update` takes `reference`,
unchanged baseline, proposed `title`, and optional Markdown `description`.
Omit description for a title-only change. The read also exposes `planning_state`
(parent relation, native iteration path and assignee identity). Ordinary updates
accept the `parent`, `iteration`, `team` and `assignToMe` inputs documented in
`azuredevops.md`; read its planning proposal and recovery contract when any is
intended. Include every planning change in the exact publication approval.
`stale-baseline` requires preparation
from returned current content and fresh review; `no_changes` ends without writing.

Before common approval show exact baseline and outgoing content and explain:
**"This update tests the confirmed Boards revision inside the same request as
the title and description changes. A changed revision requires new approval."**
Complete when that exact proposal and unchanged token have explicit approval.

`update` takes the same fields, token and a fresh private `receipt`. Its JSON
Patch tests `/rev` and changes title/description in the first request. Approved
planning changes follow in a separate revision-tested request; the helper owns
verification and pending-only continuation, as defined in `azuredevops.md`.
Project rules remain enforced. Confirmed rejection (including revision conflict)
stops: reread and obtain renewed approval, never auto-retry. `recover-update`
takes the saved receipt for read-only verification. Follow the provider-owned
planning recovery contract in `azuredevops.md` for explicitly approved
pending-only continuation. `complete` and `no_changes` require the intended
content and all requested planning fields to match. Content comparison accepts
the harmless Azure normalization defined in `azuredevops-content.md` instead
of exact bytes;
`pending` requires fresh approval and receipt before retry; `divergent` requires
reconciliation and fresh approval. Unreadable outcomes stay `uncertain`.
Complete when verified or the concrete blocker and receipt are reported.
