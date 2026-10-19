# GitLab origin update

Use `node <tool> read-update|query-update|update|recover-update <registry>`
with JSON requests on stdin, always carrying `"provider":"gitlab"`.

`read-update` takes the complete origin `reference` URL and returns canonical
identity and a current `baseline`. Retain the entire baseline, including
`updated_at`. `query-update` takes that reference, unchanged baseline, final
`title` and `description`; `no_changes` ends without mutation and `stale-baseline`
requires a new proposal and explicit confirmation from current remote content.

Before common confirmation, explain: only this origin issue's title and
description will change. Comments, state, boards, labels and assignments remain
unchanged. The adapter rereads immediately before PUT, but GitLab does not provide
an atomic compare-and-swap here; a concurrent edit after that read is still
possible. On glab authentication, permission or compatibility errors, retain the
draft and report the error without switching destinations or creating a replacement.

After exact confirmation and common temporary-directory preparation, `update`
takes the reference, whole baseline, final content, unchanged `confirmation`
and absolute private `receipt` path. It sends only title and description as JSON
data and verifies by rereading. For a lost response, `recover-update` takes the
receipt and reads before any retry: `complete` is applied, `pending` still matches
the original baseline, and `divergent` needs reconciliation. Recovery never
mutates remotely. Pending or divergent content requires fresh review, explicit
confirmation and a new receipt before another update.
