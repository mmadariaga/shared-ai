# Azure Repos pull requests

Use common `to-pr.js` operations and this registry with `provider:"azuredevops"`.
Services only; require the existing Azure CLI, azure-devops extension,
authentication and repository permission. Access failures stop without tool
installation, credential changes or global-default changes. PR descriptions
remain Markdown; Boards conversion does not apply.
Read `to-backlog/providers/azuredevops-transport.md` from the installed skills
root for the shared installed-launcher requirement and protocol boundary.

`resolve` accepts explicit organization/project/repository, then `.to-pr.json`,
then cloud HTTPS/SSH remotes. Ask only for missing destination fields;
incompatible or Server addresses stop. `destination` verifies the repository
and equivalent fetch/push identity: organization, project and repository must
match. Both branches identify the request; multiple active matches stop.

Keep common full publication approval and **separate** branch-push approval.
Before approval for an update show `proposal.concurrency_warning`. The reread
binds the baseline but Azure PATCH leaves an unprotected concurrent-edit interval
between reread and write, unlike Boards' atomic revision test. Only title and
description are updated, without state, reviewers or other fields.

`publish` saves private destination, authorized content, branches, commit and
pre-publication IDs, executes once, and verifies remote content. `rejected`
means confirmed server rejection; report and stop. Lost response or failed
readback remains `uncertain`. `recover` with the receipt executes queries only,
never publication or push. Without a write-response identity show compatible
candidate links and ask the user to identify the actual created PR; pass its
confirmed URL as `requestUrl`. Candidates match repository, both branches,
commit, author and full content and must be absent from previous IDs. Coincident
titles prove nothing. Zero or multiple plausible matches require clarification;
never repeat creation automatically. Complete with a verified URL or the
concrete blocker and private receipt location.
