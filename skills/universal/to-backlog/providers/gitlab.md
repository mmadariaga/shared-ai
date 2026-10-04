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

For an uncertain response, run `recover` with `provider` and the saved `receipt`.
Recovery reads all issues first and never creates another issue. If it returns
candidates, have the user identify the actual created issue, then pass that
confirmed canonical `issueUrl` to `recover`. Similar content alone is not proof.
No verified issue means uncertainty remains; keep the receipt and stop rather
than retry creation. Report the verified issue link or concrete blocker.
