> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Publishing a set of 5 Tasks to Azure DevOps with `to-backlog.js publish-set` took more than 2 hours and did not finish. Before each creation the shared set mechanics took a full inventory, and the Azure inventory read every Task of the project one by one, one Python process per read, although the baseline keeps only the IDs; `recover-set` and `lookup-slice` took the same full inventory. The tool printed nothing until it ended, so neither the agent nor the user could see progress, and the agent killed two publications with its own shell timeouts. `checkMarkdown` accepted a tag with a non-ASCII name such as `<operación>`, which Azure stripped on save. The `continue-set` approval error did not name the field the token belongs in, and no `to-backlog` instruction said how to wait for a publication.

## What Changes

- `sai/tools/backlog-provider-set.js`: the shared slice-set mechanics take the baseline of a creation from an optional provider hook `ids` (default: the IDs of `inventory`), the recovery rows from an optional hook `inventorySince` (default: `inventory` filtered against the baseline), and the `lookup-slice` rows from an optional hook `sliceCandidates` (default: `inventory`), reading a slice's parent through an optional `readByUrl` when it is not among the rows. A provider that declares `progress` has each remote step (`ids`, `inventory`, `create`, `read`, `references`, `relation`) timed and reported through `io.progress` with the step, the item index, the work item number, and the elapsed milliseconds. The `continue-set` approval error now says to pass the continuation token in the `confirmation` field; the check itself is unchanged.
- `sai/tools/to-backlog-azuredevops.js`: the Azure adapter declares `progress`, implements `ids` with its existing WIQL `list` query (no work item read), `inventorySince` by reading only the IDs absent from the baseline, `sliceCandidates` with a WIQL query narrowed by `[System.Description] CONTAINS '<change name>'` that falls back to the full inventory and reports a `lookup-fallback` progress step when Azure refuses the query, and `readByUrl` from the work item URL of the marker. A work item whose read answers 404 between the query and the read is skipped instead of failing. `list` accepts an extra WIQL condition.
- `sai/tools/to-backlog.js`: wires `io.progress` to stderr, one line per step (`to-backlog: <step> [item=<index>] [number=<n>] elapsed=<ms>ms`), carrying no title, description, or token; stdout keeps the one final JSON object.
- `sai/tools/azure-markdown.js`: the raw-HTML pattern of `checkMarkdown` accepts Unicode letters in a tag name, so a tag such as `<operación>` outside code is refused naming its line, while code spans, fenced code, and a `<` that opens no tag still pass.
- `sai/tools/backlog-set-github.js`: the GitHub `continue-set` approval error names the `confirmation` field.
- `skills/universal/to-backlog/slice-set.md`, `publication-recovery.md`, and `providers/azuredevops.md`: state that `publish-set` and `continue-set` run in the background with no shell timeout (Claude Code `Bash` with `run_in_background: true`, opencode shell with `background: true`), that the result is the final JSON object on stdout, that only the Azure DevOps provider writes progress lines to stderr (GitHub and GitLab write none), that a run is never interrupted, and that `recover-set` runs first after an interruption.
- `test/azure-publication.test.js` and `test/backlog-slice-provider-parity.test.js`: cover the Unicode tag refusal, the CLI split between stderr progress lines and the single stdout JSON object, an Azure publication that reads no existing work item, a recovery that reads only new IDs and skips a vanished one, a lookup that reads only matching Tasks and the parent with the fallback when the filter is refused, the `confirmation` wording for GitLab and Azure DevOps, and the absence of progress lines for GitLab.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `azuredevops-backlog-publication`: slice-set publication, recovery, and lookup read a number of work items that grows with the set, not the project; each Azure step reports a progress line on stderr; tag names with Unicode letters are recognized as raw HTML.
- `backlog-slice-lifecycle`: the continuation approval error names the `confirmation` field on every provider, and the `to-backlog` skill states how to run, watch, and recover a set publication.

## Impact

- Modified: `sai/tools/azure-markdown.js`, `sai/tools/backlog-provider-set.js`, `sai/tools/backlog-set-github.js`, `sai/tools/to-backlog-azuredevops.js`, `sai/tools/to-backlog.js`, `skills/universal/to-backlog/providers/azuredevops.md`, `skills/universal/to-backlog/publication-recovery.md`, `skills/universal/to-backlog/slice-set.md`, `test/azure-publication.test.js`, `test/backlog-slice-provider-parity.test.js`.
- New: none.
- The receipt format is unchanged: the baseline stays a list of IDs, so a receipt written before this change recovers and continues without migration. One process per Azure call and the 20000-item limit of the WIQL `list` query stay. GitLab and GitHub publication behave as before apart from the `continue-set` error wording.
- Known limitations: each creation still runs one WIQL query that lists every Task ID of the project; an organization that refuses the description filter keeps the slow `lookup-slice`.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
