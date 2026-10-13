# Backlog implementation start

Retain the completed assignment check and its exact selected-child identity for
this implementation stretch. Same-stretch worker correction or resumption
re-verifies the retained assignees instead of asking a new start question. A
changed identity or responsibility stops for a fresh user decision. A new slice
or new implementation invocation receives no prior assignment authorization.

This owner contract runs in the user-facing coordinator, immediately before
the first implementation worker on standalone apply, chained apply, and Direct
Build. Planning and optional initial-branch preparation do not run assignment.
Claude Code uses `AskUserQuestion`; opencode uses `question`. Load
`safe-operations` before a remote mutation. Fast-track and unattended route
consent do not approve assignment.

Resolve the selected issue from a publication's structured correspondence for
the explicitly selected change name, explicit originating-issue provenance, the
selected change's `**Backlog origin**` line, or `.openspec.yaml`'s
`backlog_origin`. A supplied parent does not select a child: ask which child
to implement and wait. With no provenance, run no remote operation. Use the
selected provider's publication correspondence to match an explicitly selected change name,
never an issue title. If correspondence was lost, `lookup-slice` recovers it
read-only using the known repository and change name; ask the user to resolve
zero or multiple candidates. Preserve the originating selected issue separately
from parent context. Resolve the provider through `resolve-origin`, retaining that
identity for every assignment operation; GitLab may use an authenticated custom host.

Locate `to-backlog.js` per `tool-resolution.md` and use the installed
`to-backlog/providers/registry.json`. Each operation receives JSON on stdin
with the resolved `provider` and `reference` (the selected child URL). For lost
correspondence, pass the known destination and explicit change name to
`lookup-slice`; Azure also requires the invocation's known work-item type.

1. Run `inspect-assignment`. Require either independently verified native child
   and parent identities, or verified published written correspondence. Ordinary
   native children need no SAI marker. An unverified/ambiguous written reference
   stops for a user decision; a parent receives no assignment. Show the issue URL
   and every current assignee.
2. If any assignee exists, ask whether to keep that responsibility and start,
   explicitly replace it with the authenticated user, or stop. Wait. Keep starts
   with no mutation: run `propose-assignment` with `choice: "keep"`, require its
   exact assignee set to equal the set the user approved, and retain its
   `confirmation` and `proposal.target`. A changed set asks again, never silently
   accepts a new responsibility. Replace goes to step 3 with `choice: "replace"`. A declined,
   absent or ambiguous answer starts nothing.
3. For an unassigned child or an explicit replace choice, run
   `propose-assignment` (with `choice` when applicable). Show the exact child,
   authenticated user, previous assignees, and proposed assignees. Ask permission
   for that exact assignment; wait. On approval call `assign` with the unchanged
   `confirmation` and choice. This operation changes assignees only.
4. Require `verify-assignment` to report `verified: true` before implementation.
   For keep, send `choice: "keep"`, the retained `expected_assignees` (the exact
   approved set, including multiple assignees), and `confirmation`. The verifier
   checks that set and approval, not whether it contains the authenticated user.
   Keep never calls `assign`; assignment/replacement still verifies the approved
   authenticated user. Same-stretch resumption retains the same target and keep
   token rather than generating fresh approval for a changed set.
   After an uncertain mutation, verify rather than replay. On failure, report
   the verified state and offer verification/retry or stop, then wait. Starting
   all siblings requires separate selection and authorization for each child.

Reuse the existing initial branch and its local-work protection. A branch
question is conditional on the owning branch workflow, not repeated because
an issue was imported. This contract performs no branch switch, issue closure,
label mutation, state transition, or assignment of the parent.
