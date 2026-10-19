# GitLab issue creation

Use the common helper with this registry and JSON requests on stdin:
`node <tool> query|publish|recover <registry>`. Each request carries
`"provider":"gitlab"`. `repository` is the project address accepted by `glab`;
resolution delegates to `glab repo view --output json` using existing
configuration and authentication. Ask for missing destination information;
report glab errors without substituting another provider or project.

For `query`, pass `repository`, `title`, and `description`. The returned proposal
binds the canonical project URL, visibility, authenticated user and exact content.
Show that complete proposal and ask: **"Create this exact issue in this GitLab
project?"** Offer confirm, edit and cancel under the common explicit-confirmation
rules. GitLab creation has no board/Project insertion, labels or assignments.

After confirmation and common temporary-directory preparation, `publish` receives
the same fields plus the unchanged `confirmation` token and absolute private
`receipt` path. It rereads the destination, writes a durable receipt before the
POST, and verifies the result. Content is a JSON body on stdin, never a command.

For an uncertain response, follow `../publication-recovery.md` and run `recover`
directly with `provider` and the saved `receipt`, without a verification question.
Recovery reads all issues first and never creates another issue. If it returns
candidates, have the user identify the actual created issue, then pass that
confirmed canonical `issueUrl` to `recover`. Similar content alone is not proof.
No verified issue means uncertainty remains; keep the receipt and stop rather
than retry creation. Report the verified issue link or concrete blocker.

## Slice sets and implementation assignment

For a crystallized set, use the shared `slice-set.md` contract and
`query-set|publish-set|recover-set|continue-set` with the same destination fields
and `blocks`. Ordinary GitLab issues use disclosed written parent/child references,
not a claimed native hierarchy. Immediate dependencies use separately verified
native `is_blocked_by` issue links. Follow shared publication recovery for pending
relations before consulting about a permission or tier limitation. The explicitly approved written
fallback preserves created issues and discloses existing native links. Each issue
stores the structured correspondence; project configuration is unchanged.
Read-only `lookup-slice` requires the known project and explicit change name.
Creation and relation-content writes are separately verified. GitLab has no
conditional description PUT: a reread protects known changes but not a concurrent
edit between that read and the PUT. Disclose this interval before approval.

Implementation-start assignment follows `sai/policies/backlog-implementation-start.md`.
`inspect-assignment|propose-assignment|assign|verify-assignment` use the selected
child URL. Assignees and the authenticated user are numeric GitLab user IDs.
`assign` sends only `assignee_ids`; it does not update content, labels or state.
An existing responsibility requires the common keep/replace/stop decision.
The parent confirms the child's mapping and is never assigned by this operation.
