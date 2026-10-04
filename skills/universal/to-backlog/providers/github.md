# GitHub adapter

## Requirements and read-only operations

Use the common `to-backlog.js` tool with this skill's registry. This adapter
requires Node, an installed `gh`, authentication on github.com, permission to
create repository issues, and write access to the selected GitHub Project.
Explain missing tools, authentication, or permissions; ask the user to correct
them. No credential storage, automatic installation, or authentication changes.

Repository input is `owner/name` or a github.com remote URL resolved by the
common tool. Project input is its full URL:
`https://github.com/users/OWNER/projects/N` or
`https://github.com/orgs/OWNER/projects/N`. The Project owner is independent
of the repository owner. Other GitHub hosts are not implemented.

Run `node <tool> query <registry>`; stdin is JSON with `provider: "github"`,
`repository`, optional `project`, `title`, and `description`. This checks gh
availability and authentication, reads repository visibility and issue support,
and resolves the selected Project. Without a selected Project it exhausts all
linked Project pages, excludes closed or non-writable Projects, and returns
`needs_input` for zero or multiple candidates. A failed or incomplete query
returns an error, never an empty candidate list. Supply the user's Project URL
and query again. `ready` returns a complete `proposal` and `confirmation` token.
The common skill owns review and confirmation; this file defines no extra gate.

## Publication operation

After the common skill's confirmation, run
`node <tool> publish <registry>` with the same JSON fields, the returned
`confirmation` token, and `receipt`: a new unique absolute path in an existing
private local temporary directory. On Linux use the common skill's prepared
directory and receipt path. On Windows Claude Code uses its permitted local
temporary directory; OpenCode uses `/tmp/opencode` when available, retaining
the existing workflow without a new verified Windows privacy claim. Keep this
receipt path in conversation state and show it if recovery is needed. Receipts
contain the approved description; use a private directory, not the repository.
The tool creates the receipt with restrictive permissions and refuses to
overwrite an existing receipt for a new publication.

The tool rechecks the exact proposal and confirmation token before writing.
It invokes gh without a shell, with separate arguments and JSON API input;
Markdown is preserved as data. It creates one issue, records its id, number and
URL, then adds it to the verified Project. No labels, assignees, priority,
estimation, sprint assignment, or Project creation are added.

## Results and recovery operation

- `complete`: verified issue and Project insertion; report both links.
- `failure_before_publication`: no creation was attempted; report the cause.
- `partial_failure`: an issue exists but insertion could not be confirmed;
  report its link and preserve it. An insertion response can itself be lost.
- `uncertain`: creation may have happened; retain the receipt and verify.

Run `node <tool> recover <registry>` with
`{"provider":"github","receipt":"<saved path>"}`. Recovery verifies the same
authenticated identity and destinations and reads all relevant issue and
Project-item pages. It never creates an issue. If the creation response was
lost, it reports candidate issues matching approved content and author which
were absent before the attempt. Show those links and ask the user to verify
which, if any, belongs to this attempt; a concurrent matching issue is not
proof. Supply the confirmed `issueUrl` in another recover request. If no issue
can be established, stop uncertain and request manual verification; never
automatically repeat creation. For a known issue, recovery checks membership
before retrying only insertion. Keep the receipt for any failed recovery.
