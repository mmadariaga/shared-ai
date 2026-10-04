# GitHub origin update mechanics

Use `node <tool> <operation> <registry>` with structured JSON on stdin.
Requires Node, gh authenticated on github.com, and permission to edit the
originating issue. Missing access stops; do not install tools or change auth.
All operations include `provider: "github"`. Other hosts are unsupported.

- `read-update`: pass `reference` as a full issue URL or
  `/owner/repo/issues/123`, optionally with query or fragment. Missing components
  require user clarification. Returns canonical `issue`, repository, visibility,
  actor and `baseline: {title, description}`. No comments or Projects are read.
- `query-update`: pass `reference`, unchanged `baseline`, proposed `title` and
  `description`. Returns `ready` with proposal and confirmation, `no_changes`,
  or `needs_input` with `reason: stale-baseline` and `current` for renewed review.
- `update`: pass the same fields, `confirmation`, and `receipt`: a unique new
  absolute path in an existing private temporary directory outside the repository.
  Claude Code uses its permitted local temporary directory; opencode uses a
  private subdirectory of `/tmp/opencode` when available. Preserve the receipt
  path in conversation state. It contains approved content; keep it private.
  The tool binds approval to identity, visibility, baseline and final content,
  rereads, records the attempt before mutation, then calls only `updateIssue`
  with `id`, `title` and `body`. No Project selection or membership change occurs.
- `recover-update`: pass only the provider and saved `receipt`. It reads the
  exact issue and compares remote title and description with baseline and final
  content, without remote mutation. It verifies identity and visibility too.

Results: `complete` is verified final content; `pending` is unchanged baseline;
`divergent` includes current content for reconciliation; `uncertain` means
verification failed. `failure_before_publication` means no update was attempted.
A lost submission response still triggers verification; success is based on
remote content, not the mutation response. Follow the update branch's renewed
review rules before any retry. Keep receipts on failure; never create an issue.

## Required note before approval

Before asking the user to approve an update, say once: "GitHub checks the current
content before updating, but cannot make that check and update atomic. A
concurrent edit between them can be overwritten." This note is required for
every update proposal, including renewed approval; creation does not use it.

GitHub's updateIssue API has no atomic content-version precondition. The tool
checks immediately before submission, but a concurrent edit in the interval
between the final read and mutation cannot be prevented by this API. Report this
limitation if strict atomic concurrency protection is required; do not claim it.
