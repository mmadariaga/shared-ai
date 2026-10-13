# GitHub retrieval mechanics

Requires Node.js and `gh` with readable access to the issue on github.com.
Public or private readable issues are supported, including closed issues and
archived repositories. GitHub Projects and publication permissions are not required.

Accepted references are `https://github.com/owner/repo/issues/123` and
`/owner/repo/issues/123`; query parameters and fragments are ignored for identity.
Other hosts (including GitHub Enterprise), pull requests, and incomplete paths
are rejected by the helper.

Run `node <tool> read <registry>` with JSON on stdin:
`{"reference":"<resolved canonical URL>"}`.
The helper validates the reference again, uses structured `gh api graphql`
queries on github.com, checks `issueOrPullRequest`'s type, and follows every
comment cursor. It returns `complete` with `item` and `comments`, `incomplete`
with retrieved parts and a concrete error, or `error` with its reason and message.
All operations are queries; there are no writes or receipts. A buffer or command
failure is explicit rather than shortened content.

The CLI uses `readSet`: it inspects supported hierarchy fields and paginates
assignees, native sub-issues and supported blocker relationships. Published
slice correspondence supplies written fallback relationships. Parent selection
always reconciles any readable native hierarchy with those written references,
including native children not listed in a SAI marker; a written representation
does not suppress native discovery. A required read failure stays incomplete.
Parent selection
loads the parent and every direct child with full comments; child selection
loads only that child and parent context. `sources` identifies each role.
An explicit published parent, or an ordinary issue with direct children, keeps
its complete direct-child import even when it has a higher native parent. That
higher issue is separate parent context; its other children are not imported.
An explicit published child keeps child-only scope. These reads are not recursive.
`origin` preserves the selected issue. Missing or conflicting relationship data
returns incomplete/error rather than a silently shortened complete set.
