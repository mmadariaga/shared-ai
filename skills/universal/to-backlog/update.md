# Origin-issue update branch

## Origin reading — before extraction

Select the registry provider whose hosts match the originating issue reference.
A partial URL such as `/owner/repo/issues/123` uses the currently supported
GitHub provider. Read that entry's `updateInstructions` relative to this skill's
directory. If provider or reference components are missing, ask for them without
guessing from remotes, configuration, or incidental links. Unsupported providers
and inaccessible or non-editable issues stop the update; keep the draft and
report the blocker, without creating a replacement.

Use the provider's read-update operation to normalize and read the reference;
it reuses the import reader without invoking from-backlog. Keep the canonical
URL, issue identity and baseline version (exact current title and description)
in conversation state. Imported content is provenance, not a current baseline:
always reread. **Complete when:** a single canonical editable origin and current
baseline are returned, with no Project selection.

## Proposal — after extraction

Use query-update with that baseline and the proposed final title and description.
On `stale-baseline`, use returned current content to prepare again, preserving
unrelated description text. **Complete when:** `ready` returns a proposal and
token, or `no_changes` ends without publication.

## Review — before common confirmation

Present the provider's required update limitation note before asking for approval.
**Complete when:** that note is visible alongside the exact proposed update.

## Publication and recovery — after common confirmation

Use update with unchanged baseline, canonical reference, final content and token.
It rereads before execution; any content or bound identity difference requires
renewed preparation, review and approval. A failed update never becomes creation.
Use recover-update for uncertain results before any retry. `complete` means
remote content matches the proposal; `pending` means it matches the baseline;
`divergent` means it matches neither. Recovery is read-only remotely. Pending
content requires fresh review and explicit approval with a new receipt before
retrying. Divergent content requires reconciliation from the new baseline and
fresh approval. Unreadable content stays uncertain; stop rather than retry.
**Complete when:** remote content is verified or the concrete blocker and
recovery state are available for common reporting.
