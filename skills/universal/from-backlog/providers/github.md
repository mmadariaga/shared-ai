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
