# Azure Boards creation

Use common helper operations and this registry with `provider:"azuredevops"`.
Services only. Require Node, the existing Azure CLI and azure-devops extension,
authentication and project write access. Report missing access without installing
tools, changing credentials or changing global defaults.
Read `azuredevops-transport.md` for the installed-launcher requirement and the
protocol verification boundary before the first Azure operation.

## Prepare and approve

`resolve` accepts explicit `organization` (cloud HTTPS URL), `project` (name),
and optional `repository` (cloud repository or project URL), then configuration,
then remotes. Ask only for missing fields reported by `needs_input`; incompatible
data stops. Here Project means Azure team project, not a GitHub Project insertion.

`query` takes canonical project `repository`, optional `project`, `type`, `title`
and Markdown `description`. Ask for the exact work-item `type` when absent; it
belongs to this invocation only, never a persistent default. Invalid types stop.
Project rules stay enabled. Missing additional required fields stop creation;
do not supply them automatically or bypass rules.

Read `azuredevops-content.md` before description editing. Show the returned
organization, project, visibility, type, title and full outgoing HTML as literal
content alongside source Markdown. Ask **"Create this exact work item of this
type in this Azure project?"** under common confirm/edit/cancel rules. Complete
when the outgoing proposal and unchanged token have explicit approval.

## Write once and recover

`publish` takes the same source fields, unchanged `confirmation` and a new private
absolute `receipt` from common temporary preparation. On Windows use the active
harness's permitted local temporary directory (Claude Code or opencode), without
a new Windows privacy claim. The helper stores authorized content, destination,
identity and pre-creation IDs before one rules-enforced write.

`complete` requires a remotely verified URL. `failure_before_publication` means
no write was attempted. `rejected` is a confirmed server rejection; report and
stop. On `uncertain`, keep the receipt and run `recover` with it. Remote recovery
is queries only: a WIQL POST is a query, not a publication. If the write response
was lost, show candidate links and ask for the actual created URL, then pass it
as `issueUrl`. Candidates must be new relative to saved IDs and match type,
author and full content. A coincident title is not evidence. Zero or multiple
plausible matches require clarification, never automatic repeat creation.
Complete when verified or the blocker and private receipt location are reported.

## Slice sets and implementation assignment

For a crystallized set, use the shared `slice-set.md` contract and
`query-set|publish-set|recover-set|continue-set`, with the ordinary project,
explicit invocation-scoped `type`, source parent content and complete `blocks`.
The selected type applies to parent and children: show it for each item before
approval. Project rules remain enabled; incompatible types or hierarchy rules
stop the pending operation for a human decision, not an automatic type change.
Child blocks are losslessly escaped HTML pre blocks; show their full outgoing
HTML alongside source Markdown. Structured correspondence is a visible escaped
`sai-backlog-slices@1` pre block so HTML sanitizers need not retain comments.
The adapter separately verifies native Parent/Child and Predecessor relations.
Only agreed immediate dependencies receive Predecessor links. On an established
native relation failure, the common explicitly approved written fallback is
available; already-created native links stay intact and are disclosed.
Read-only `lookup-slice` requires project, explicit type and change name.

Implementation-start assignment follows `sai/policies/backlog-implementation-start.md`.
The separate assignment operations use the selected child's complete URL and
authenticated identity ID, which every proposal, verification and
identity-changed check compares. `assign` writes the authenticated user's unique
name (email/UPN, from `connectionData`) because Azure rejects an identity ID as an
unknown identity; without a unique name it fails before the write. A definite
provider rejection returns `rejected` (no change applied); a transport error,
timeout or 5xx returns `uncertain` and leads to `verify-assignment`. `assign` tests
the current revision and changes only `System.AssignedTo`, leaving the parent's responsibility, title, description,
state and tags untouched. Keep verifies the approved existing identity without
mutation; rules or permissions that reject replacement stop implementation.
