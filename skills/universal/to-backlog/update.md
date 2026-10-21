# Origin-issue update branch

## Origin reading — before extraction

Run the common helper's `resolve-origin` with `{reference,provider?}`; omit
provider unless supplied. It selects from the same registry using hosts and
pure provider classification. On `needs_input` ask which registered provider
owns the origin; do not guess among provider-owned resolvers.
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

Use query-update with that baseline, the proposed final title and description,
and any planning inputs supported by the selected provider.
On `stale-baseline`, use returned current content to prepare again, preserving
unrelated description text. **Complete when:** `ready` returns a proposal and
token, or `no_changes` ends without publication.

## Review — before common confirmation

Present the provider's required update limitation note before asking for approval.
**Complete when:** that note is visible alongside the exact proposed update.

## Publication and recovery — after common confirmation

Use update with unchanged baseline, canonical reference, final content, approved
planning inputs and token.
It rereads before execution; any content or bound identity difference requires
renewed preparation, review and approval. A failed update never becomes creation.
Use recover-update for uncertain results before any retry. `complete` means
the complete intended content and planning result is verified; `pending` means
content matches the baseline; `divergent` means content matches neither the
baseline nor the proposal. Recovery is read-only remotely except for
the Azure provider's explicitly approved pending-planning continuation. Pending
content requires fresh review and explicit approval with a new receipt before
retrying. Divergent content requires reconciliation from the new baseline and
fresh approval. Unreadable content stays uncertain; stop rather than retry.
**Complete when:** the complete intended content and planning result is verified or the concrete blocker and
recovery state are available for common reporting.
